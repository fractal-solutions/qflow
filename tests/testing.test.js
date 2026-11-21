import { describe, expect, test } from 'bun:test';
import { AsyncFlow } from '../src/qflow.js';
import { MockLLMNode, MockNode, createTraceSnapshot, recordFlow } from '../src/testing.js';

describe('MockNode', () => {
  test('returns queued responses and records its calls', async () => {
    const node = new MockNode({
      responses: ['first', 'second'],
      postAction: () => 'default',
    });
    node.setParams({ tag: 'a' });

    const flow = new AsyncFlow(node);
    const result = await flow.runAsync({ seed: 1 });

    expect(result).toBe('first');
    expect(node.calls).toHaveLength(1);
    expect(node.calls[0].params.tag).toBe('a');
    expect(node.calls[0].shared).toEqual({ seed: 1 });
    expect(node.results).toEqual(['first']);
  });

  test('MockLLMNode returns the exec result when run standalone', async () => {
    const llm = new MockLLMNode({ responses: ['hello'] });
    expect(await llm.runAsync({})).toBe('hello');
  });

  test('can be configured to throw', async () => {
    const node = new MockNode({ error: new Error('nope') });
    await expect(node.runAsync({})).rejects.toThrow('nope');
    expect(node.calls).toHaveLength(1);
  });
});

describe('recordFlow', () => {
  test('produces deterministic snapshots without timing data', async () => {
    const flow = new AsyncFlow(new MockNode({
      responses: ['ok'],
      postAction: () => 'default',
    }));
    const recorder = recordFlow(flow);

    await flow.runAsync({ value: 1 });
    const snapshot = recorder.snapshot();
    const events = snapshot.map(entry => entry.event);

    expect(events).toContain('flow:start');
    expect(events).toContain('node:start');
    expect(events).toContain('node:end');
    expect(events).toContain('flow:end');
    expect(snapshot[0].flowId).toBe('flow:1');
    expect(snapshot[0].startTime).toBeUndefined();
    expect(snapshot.find(entry => entry.event === 'node:end').status).toBe('success');
  });

  test('normalizes UUID-shaped IDs by default', () => {
    const runId = crypto.randomUUID();
    const snapshot = createTraceSnapshot([{
      event: 'run:start',
      payload: { flowId: runId, runId, timestamp: 123 },
    }]);

    expect(snapshot[0].flowId).toBe('flow:1');
    expect(snapshot[0].runId).toBe('run:1');
    expect(snapshot[0].timestamp).toBeUndefined();
  });
});
