import { describe, expect, test } from 'bun:test';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { AsyncNode } from '../src/qflow.js';
import { DurableFlow, SQLiteCheckpointer } from '../src/durable.js';
import { ReplaySafeNode, SideEffectUncertainError } from '../src/side_effects.js';
import { HttpRequestNode } from '../src/nodes/http.js';

function makeCheckpointer() {
  const path = join(Bun.env.TEMP ?? Bun.env.TMPDIR ?? '/tmp', `qflow-effects-${crypto.randomUUID()}.db`);
  const checkpointer = new SQLiteCheckpointer(path);
  return {
    checkpointer,
    cleanup() {
      checkpointer.close();
      for (const suffix of ['', '-wal', '-shm']) {
        try {
          unlinkSync(`${path}${suffix}`);
        } catch {}
      }
    },
  };
}

class FailAfterSideEffect extends ReplaySafeNode {
  constructor(options) {
    super(options);
    this.shouldFail = true;
  }

  async postAsync(shared, prepRes, execRes) {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error('post failed');
    }
    return super.postAsync(shared, prepRes, execRes);
  }
}

class HttpFailAfterSideEffect extends HttpRequestNode {
  constructor() {
    super();
    this.shouldFail = true;
  }

  async postAsync(shared, prepRes, execRes) {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error('post failed');
    }
    return super.postAsync(shared, prepRes, execRes);
  }
}

describe('replay-safe side effects', () => {
  test('returns the recorded result instead of re-running a completed side effect', async () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    let calls = 0;

    try {
      const sideEffect = new FailAfterSideEffect({
        operationId: '{{id}}',
        kind: 'charge',
        execute: async ({ input }) => {
          calls += 1;
          return { id: input.id, chargeId: `ch_${calls}` };
        },
      });
      const flow = new DurableFlow(sideEffect, { checkpointer });

      await expect(flow.runDurable({
        runId: 'effects-1',
        shared: { id: 'customer-1', input: { id: 'customer-1' } },
      })).rejects.toThrow('post failed');
      expect(calls).toBe(1);

      const resumed = await flow.runDurable({ runId: 'effects-1', resume: true });

      expect(resumed.result).toEqual({ id: 'customer-1', chargeId: 'ch_1' });
      expect(calls).toBe(1);
      expect(resumed.shared.replaySafeResult.chargeId).toBe('ch_1');

      const effects = checkpointer.listSideEffects('effects-1');
      expect(effects).toHaveLength(1);
      expect(effects[0]).toMatchObject({ operationId: 'charge:customer-1', status: 'completed', kind: 'charge' });
    } finally {
      cleanup();
    }
  });

  test('refuses to retry an operation that is reserved but not completed', async () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    try {
      checkpointer.db.prepare(`
        INSERT INTO qflow_side_effects (run_id, operation_id, kind, status, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, ?)
      `).run('effects-2', 'email:welcome', 'email', new Date().toISOString(), new Date().toISOString());

      let calls = 0;
      const node = new ReplaySafeNode({
        operationId: 'welcome',
        kind: 'email',
        execute: async () => {
          calls += 1;
          return 'sent';
        },
      });
      const flow = new DurableFlow(node, { checkpointer });

      await expect(flow.runDurable({ runId: 'effects-2', shared: {} })).rejects.toBeInstanceOf(SideEffectUncertainError);
      expect(calls).toBe(0);
    } finally {
      cleanup();
    }
  });

  test('HttpRequestNode records its response when given an operationId', async () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    let hits = 0;
    const server = Bun.serve({
      port: 0,
      fetch() {
        hits += 1;
        return Response.json({ hits });
      },
    });

    try {
      const httpNode = new HttpFailAfterSideEffect();
      httpNode.setParams({
        url: `http://localhost:${server.port}/api`,
        operationId: '{{url}}',
      });
      const flow = new DurableFlow(httpNode, { checkpointer });

      await expect(flow.runDurable({ runId: 'http-effects', shared: {} })).rejects.toThrow('post failed');
      expect(hits).toBe(1);

      await flow.runDurable({ runId: 'http-effects', resume: true });
      expect(hits).toBe(1);
      expect(checkpointer.loadSideEffect('http-effects', 'http:http://localhost:' + server.port + '/api').status).toBe('completed');
    } finally {
      server.stop(true);
      cleanup();
    }
  });
});
