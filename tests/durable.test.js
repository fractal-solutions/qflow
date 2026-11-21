import { describe, expect, test } from 'bun:test';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { AsyncNode } from '../src/qflow.js';
import { DurableFlow, SQLiteCheckpointer } from '../src/durable.js';

function makeCheckpointer() {
  const path = join(Bun.env.TEMP ?? Bun.env.TMPDIR ?? '/tmp', `qflow-durable-${crypto.randomUUID()}.db`);
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

class IncrementNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    shared.count = (shared.count ?? 0) + 1;
    return shared.count;
  }

  async postAsync() {
    return 'default';
  }
}

class FailOnceNode extends AsyncNode {
  constructor() {
    super();
    this.shouldFail = true;
  }

  async execAsync() {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error('boom');
    }
    return 'recovered';
  }

  async postAsync() {
    return 'default';
  }
}

describe('SQLiteCheckpointer', () => {
  test('records a checkpoint at each node boundary and completes the run', async () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    try {
      const flow = new DurableFlow(new IncrementNode(), { checkpointer, name: 'counter' });
      const events = [];
      flow.on('checkpoint:saved', payload => events.push(payload.step));

      const outcome = await flow.runDurable({ shared: { count: 0 } });
      const state = checkpointer.loadRun(outcome.runId);
      const checkpoints = checkpointer.listCheckpoints(outcome.runId);

      expect(outcome.result).toBe(1);
      expect(outcome.shared.count).toBe(1);
      expect(outcome.steps).toBe(1);
      expect(events).toEqual([1]);
      expect(state.status).toBe('completed');
      expect(state.result).toBe(1);
      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0].nodeClass).toBe('IncrementNode');
    } finally {
      cleanup();
    }
  });

  test('resumes after a failed node without re-running completed work', async () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    try {
      const start = new IncrementNode();
      start.next(new FailOnceNode());
      const flow = new DurableFlow(start, { checkpointer });

      await expect(flow.runDurable({ runId: 'run-resume', shared: {} })).rejects.toThrow('boom');

      const failed = checkpointer.loadRun('run-resume');
      expect(failed.status).toBe('failed');
      expect(failed.step).toBe(1);
      expect(failed.shared.count).toBe(1);

      const resumed = await flow.runDurable({ runId: 'run-resume', resume: true });

      expect(resumed.resumed).toBe(true);
      expect(resumed.result).toBe('recovered');
      expect(resumed.shared.count).toBe(1);
      expect(resumed.steps).toBe(2);
      expect(checkpointer.loadRun('run-resume').status).toBe('completed');
      expect(checkpointer.listCheckpoints('run-resume')).toHaveLength(2);
    } finally {
      cleanup();
    }
  });

  test('honours an AbortSignal before executing a node', async () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    try {
      const flow = new DurableFlow(new IncrementNode(), { checkpointer });
      const controller = new AbortController();
      controller.abort();

      await expect(flow.runDurable({
        runId: 'run-aborted',
        shared: {},
        signal: controller.signal,
      })).rejects.toMatchObject({ name: 'AbortError' });

      const state = checkpointer.loadRun('run-aborted');
      expect(state.status).toBe('failed');
      expect(state.step).toBe(0);
    } finally {
      cleanup();
    }
  });

  test('runAsync keeps the normal flow return shape', async () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    try {
      const flow = new DurableFlow(new IncrementNode(), { checkpointer });
      const result = await flow.runAsync({ count: 4 });
      expect(result).toBe(5);
    } finally {
      cleanup();
    }
  });
});
