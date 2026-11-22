import { describe, expect, test } from 'bun:test';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { LLMNode, LLMAdapter, LLM_CACHE_HIT_EVENT } from '../src/llm/index.js';
import { BudgetExceededError, BudgetNode, BudgetTracker } from '../src/budget.js';
import {
  InMemoryMemoryStore,
  MemoryStoreNode,
  SQLiteMemoryStore,
  scoreMemory,
} from '../src/memory.js';
import { SQLiteCheckpointer } from '../src/durable.js';

class CountingAdapter extends LLMAdapter {
  constructor(options = {}) {
    super({ ...options, capabilities: { streaming: false, tokenUsage: true } });
    this.calls = 0;
  }

  async complete(request) {
    this.calls += 1;
    return { text: `answer:${request.prompt}`, usage: { prompt_tokens: 10, completion_tokens: 5 } };
  }
}

class ResultNode extends AsyncNode {
  constructor(value) {
    super();
    this.value = value;
  }

  async execAsync() {
    return this.value;
  }

  async postAsync() {
    return 'default';
  }
}

function makeCacheStore() {
  const values = new Map();
  return {
    values,
    get: key => values.get(key) ?? null,
    set: (key, value) => values.set(key, value),
  };
}

describe('deterministic LLM replay', () => {
  test('replays a cached completion without calling the provider', async () => {
    const adapter = new CountingAdapter();
    const cache = makeCacheStore();
    const llm = new LLMNode({ provider: 'counting', adapter, model: 'm1', cache });
    const flow = new AsyncFlow(llm);
    const hits = [];
    flow.on(LLM_CACHE_HIT_EVENT, payload => hits.push(payload));

    const first = await flow.runAsync({ prompt: 'same question' });
    const second = await flow.runAsync({ prompt: 'same question' });

    expect(adapter.calls).toBe(1);
    expect(second.text).toBe(first.text);
    expect(second.usage.total).toBe(15);
    expect(hits).toHaveLength(1);
    expect(hits[0].key).toStartWith('llm:');
  });

  test('uses a durable checkpointer as the cache store', async () => {
    const path = join(Bun.env.TEMP ?? Bun.env.TMPDIR ?? '/tmp', `qflow-llm-cache-${crypto.randomUUID()}.db`);
    const checkpointer = new SQLiteCheckpointer(path);
    const adapter = new CountingAdapter();
    try {
      const llm = new LLMNode({ provider: 'counting', adapter, cache: true });
      llm.setParams({ checkpointer });
      const flow = new AsyncFlow(llm);
      await flow.runAsync({ prompt: 'durable question' });
      const repeated = await flow.runAsync({ prompt: 'durable question' });
      expect(adapter.calls).toBe(1);
      expect(repeated.text).toBe('answer:durable question');
      expect(checkpointer.cacheGet('llm', 'missing')).toBeNull();

      const secondCheckpointer = new SQLiteCheckpointer(path);
      const otherAdapter = new CountingAdapter();
      const replayed = new LLMNode({ provider: 'counting', adapter: otherAdapter, cache: true });
      replayed.setParams({ checkpointer: secondCheckpointer });
      expect((await new AsyncFlow(replayed).runAsync({ prompt: 'durable question' })).text)
        .toBe('answer:durable question');
      expect(otherAdapter.calls).toBe(0);
      secondCheckpointer.close();
    } finally {
      checkpointer.close();
      for (const suffix of ['', '-wal', '-shm']) {
        try {
          unlinkSync(`${path}${suffix}`);
        } catch {}
      }
    }
  });

  test('supports explicit cache key templates and TTLs', async () => {
    const adapter = new CountingAdapter();
    const cache = makeCacheStore();
    const llm = new LLMNode({
      provider: 'counting',
      adapter,
      cache,
      cacheKey: '{{tenant}}:{{prompt}}',
    });
    await new AsyncFlow(llm).runAsync({ prompt: 'hello', tenant: 't1' });
    await new AsyncFlow(llm).runAsync({ prompt: 'hello', tenant: 't1' });
    expect(adapter.calls).toBe(1);
    expect(cache.values.has('t1:hello')).toBe(true);
  });
});

describe('budget controls', () => {
  test('tracker accumulates usage and throws a coded error when exceeded', () => {
    const tracker = new BudgetTracker({ maxCost: 0.5, maxTokens: 100 });
    tracker.record({ prompt: 10, completion: 5, total: 15 }, 0.2);
    expect(tracker.snapshot().tokens).toBe(15);
    expect(() => tracker.assertWithin()).not.toThrow();
    tracker.record({ prompt: 10, completion: 5, total: 15 }, 0.4);
    expect(() => tracker.assertWithin()).toThrow(BudgetExceededError);
    try {
      tracker.assertWithin();
    } catch (error) {
      expect(error.code).toBe('QFLOW_BUDGET_EXCEEDED');
      expect(error.reasons[0]).toContain('cost');
    }
  });

  test('BudgetNode routes exceeded runs', async () => {
    const done = new ResultNode('done');
    const stop = new ResultNode('stopped');
    const guard = new BudgetNode({ maxCost: 5 });
    guard.next(done, 'continue');
    guard.next(stop, 'exceeded');

    const result = await new AsyncFlow(guard).runAsync({ llmCost: 12 });
    expect(result).toBe('stopped');

    const ok = new BudgetNode({ maxCost: 20 });
    ok.next(done, 'continue');
    ok.next(stop, 'exceeded');
    expect(await new AsyncFlow(ok).runAsync({ llmCost: 2 })).toBe('done');
  });

  test('LLMNode enforces a BudgetTracker before returning', async () => {
    const adapter = new CountingAdapter();
    const budget = new BudgetTracker({ maxCost: 0.01 });
    const llm = new LLMNode({ provider: 'counting', adapter, pricing: { inputPerMillion: 1000, outputPerMillion: 1000 }, budget });
    await expect(new AsyncFlow(llm).runAsync({ prompt: 'expensive' })).rejects.toThrow(BudgetExceededError);
    expect(adapter.calls).toBe(1);
  });
});

describe('unified memory stores', () => {
  test('in-memory store ranks lexical search results', async () => {
    const store = new InMemoryMemoryStore();
    await store.add({ text: 'qflow 2.0 uses replay-safe side effects', tags: ['durable'] });
    await store.add({ text: 'bun streams are quick', tags: ['bun'] });
    const results = await store.search('replay safe', { tags: ['durable'] });
    expect(results).toHaveLength(1);
    expect(results[0].score).toBeGreaterThan(0);
    expect(scoreMemory(results[0], ['replay'])).toBeGreaterThan(0);
  });

  test('MemoryStoreNode reuses a store through shared state', async () => {
    const store = new InMemoryMemoryStore();
    const add = new MemoryStoreNode({ operation: 'add' });
    await new AsyncFlow(add).runAsync({
      memoryStore: store,
      memoryInput: { text: 'api is slow', tags: ['incident'] },
    });

    const search = new MemoryStoreNode({ operation: 'search' });
    const results = await new AsyncFlow(search).runAsync({
      memoryStore: store,
      memoryInput: { query: 'api' },
    });
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('api is slow');
  });

  test('SQLiteMemoryStore persists records across instances', async () => {
    const path = join(Bun.env.TEMP ?? Bun.env.TMPDIR ?? '/tmp', `qflow-memory-${crypto.randomUUID()}.db`);
    const first = new SQLiteMemoryStore(path);
    try {
      await first.add({ id: 'm1', text: 'refund policy', tags: ['policy'] });
      const second = new SQLiteMemoryStore(path);
      expect((await second.get('m1')).text).toBe('refund policy');
      expect((await second.search('refund'))[0].id).toBe('m1');
      second.close();
    } finally {
      first.close();
      for (const suffix of ['', '-wal', '-shm']) {
        try {
          unlinkSync(`${path}${suffix}`);
        } catch {}
      }
    }
  });
});
