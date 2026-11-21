import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { unlinkSync } from 'node:fs';
import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { recordFlow } from '../src/testing.js';
import { SQLiteCheckpointer, createRunTrace, DurableFlow } from '../src/durable.js';
import {
  TRACE_SCHEMA,
  buildTraceSpans,
  normalizeTrace,
  serializeTrace,
} from '../src/trace.js';

class WorkNode extends AsyncNode {
  async execAsync() {
    return 'work';
  }

  async postAsync() {
    return 'default';
  }
}

describe('trace normalization', () => {
  test('normalizes recordFlow() events and pairs node spans', async () => {
    const first = new WorkNode();
    const second = new WorkNode();
    first.next(second);
    const flow = new AsyncFlow(first);
    const recorder = recordFlow(flow);

    await flow.runAsync({});

    const trace = normalizeTrace(recorder.events);
    expect(trace.schema).toBe(TRACE_SCHEMA);
    expect(trace.status).toBe('success');
    expect(trace.events.length).toBeGreaterThanOrEqual(6);
    expect(trace.spans.filter(span => span.kind === 'node' && span.status === 'success')).toHaveLength(2);
    expect(trace.spans.some(span => span.kind === 'flow')).toBe(true);
  });

  test('accepts snapshot output, raw event arrays, and JSONL-style shapes', () => {
    const events = [
      { event: 'flow:start', payload: { flowId: 'f1', startTime: 10 } },
      { event: 'node:start', payload: { flowId: 'f1', nodeClass: 'A', startTime: 12 } },
      { event: 'node:end', payload: { flowId: 'f1', nodeClass: 'A', endTime: 20, duration: 8, status: 'success' } },
      { event: 'flow:end', payload: { flowId: 'f1', endTime: 25, duration: 15, status: 'success' } },
    ];
    const snapshot = events.map((entry, index) => ({ seq: index, ...entry.payload, event: entry.event }));

    expect(normalizeTrace(snapshot).events[1].nodeClass).toBe('A');
    expect(normalizeTrace(events).spans.find(span => span.label === 'A').duration).toBe(8);
    expect(normalizeTrace({ trace: events, flowName: 'demo' }).flowName).toBe('demo');
    expect(() => JSON.parse(serializeTrace({ events }))).not.toThrow();
  });

  test('handles errors, circular values, and missing timestamps safely', () => {
    const shared = { loop: null };
    shared.loop = shared;
    const spans = buildTraceSpans([
      { seq: 0, event: 'node:start', nodeClass: 'Bad', flowId: 'f1' },
      { seq: 1, event: 'node:end', nodeClass: 'Bad', flowId: 'f1', status: 'error', error: new Error('boom') },
    ]);

    expect(spans[0].error).toEqual({ name: 'Error', message: 'boom' });
    expect(normalizeTrace({ events: [{ event: 'custom', payload: shared }] }).events[0].loop).toBe('[Circular]');
  });
});

describe('durable trace export', () => {
  test('exports run metadata, checkpoints and captured observer events', async () => {
    const path = join(Bun.env.TEMP ?? Bun.env.TMPDIR ?? '/tmp', `qflow-trace-${crypto.randomUUID()}.db`);
    const checkpointer = new SQLiteCheckpointer(path);
    try {
      const flow = new DurableFlow(new WorkNode(), { checkpointer, name: 'trace-demo' });
      const recorder = recordFlow(flow);
      const { runId } = await flow.runDurable({ shared: {} });

      const trace = createRunTrace(checkpointer, runId, {
        events: recorder.events,
        includeState: true,
      });

      expect(trace.runId).toBe(runId);
      expect(trace.flowName).toBe('trace-demo');
      expect(trace.status).toBe('completed');
      expect(trace.steps).toBe(1);
      expect(trace.checkpoints[0].shared).toEqual({});
      expect(trace.events.filter(event => event.event === 'checkpoint:saved')).toHaveLength(1);
      expect(trace.spans.some(span => span.kind === 'run' && span.status === 'completed')).toBe(true);
      expect(() => JSON.parse(serializeTrace(trace))).not.toThrow();
    } finally {
      checkpointer.close();
      for (const suffix of ['', '-wal', '-shm']) {
        try {
          unlinkSync(`${path}${suffix}`);
        } catch {}
      }
    }
  });
});
