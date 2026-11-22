import { describe, expect, test } from 'bun:test';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { AsyncNode } from '../src/qflow.js';
import {
  DurableFlow,
  ScheduleNode,
  SQLiteCheckpointer,
  WaitForApprovalNode,
  nextCronTime,
} from '../src/durable.js';
import {
  FlowVersionMismatchError,
  SideEffectClaimedError,
  SideEffectUncertainError,
} from '../src/util.js';
import { withReplaySafeSideEffect } from '../src/side_effects.js';

function makeCheckpointer(options = {}) {
  const path = join(Bun.env.TEMP ?? Bun.env.TMPDIR ?? '/tmp', `qflow-gaps-${crypto.randomUUID()}.db`);
  const checkpointer = new SQLiteCheckpointer(path, options);
  return {
    path,
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

class MarkNode extends AsyncNode {
  constructor(name) {
    super();
    this.name = name;
  }

  async execAsync(_prepRes, shared) {
    shared.visited = [...(shared.visited ?? []), this.name];
    return this.name;
  }

  async postAsync() {
    return 'default';
  }
}

describe('durable human approval', () => {
  test('suspends a run and resumes with the recorded decision', async () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    try {
      const gate = new WaitForApprovalNode({ approvalId: '{{requestId}}', prompt: 'Approve refund?' });
      gate.next(new MarkNode('approved'), 'approve');
      const flow = new DurableFlow(gate, { checkpointer, name: 'refund', version: '1' });
      const runId = 'refund-req-1';

      const pending = await flow.runDurable({ runId, shared: { requestId: 'req-1' } });
      expect(pending.status).toBe('suspended');
      expect(pending.suspended).toBe(true);
      expect(pending.approvalId).toBe('approval:req-1');
      expect(checkpointer.loadRun(runId).status).toBe('suspended');
      expect(checkpointer.listApprovals(runId, { status: 'pending' })).toHaveLength(1);

      checkpointer.approve(runId, { answer: 'yes' }, 'approval:req-1');
      const resumed = await flow.runDurable({ runId, resume: true });
      expect(resumed.status).toBe('completed');
      expect(resumed.result).toBe('approved');
      expect(resumed.shared.approval.approved).toBe(true);
      expect(resumed.shared.approval.answer).toBe('yes');
      expect(resumed.shared.visited).toEqual(['approved']);
      expect(checkpointer.loadRun(runId).status).toBe('completed');
    } finally {
      cleanup();
    }
  });

  test('routes a rejection to the reject successor', async () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    try {
      const gate = new WaitForApprovalNode({ approvalId: 'approval:fixed' });
      gate.next(new MarkNode('yes'), 'approve');
      gate.next(new MarkNode('no'), 'reject');
      const flow = new DurableFlow(gate, { checkpointer });

      const pending = await flow.runDurable({ runId: 'reject-run', shared: {} });
      expect(pending.approvalId).toBe('approval:fixed');
      checkpointer.reject('reject-run', { reason: 'too expensive' });
      const result = await flow.runDurable({ runId: 'reject-run', resume: true });
      expect(result.result).toBe('no');
      expect(result.shared.approval.approved).toBe(false);
    } finally {
      cleanup();
    }
  });
});

describe('durable scheduling', () => {
  test('suspends until due and lists scheduled runs', async () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    try {
      const schedule = new ScheduleNode({ delayMs: 20 });
      schedule.next(new MarkNode('fired'), 'due');
      const flow = new DurableFlow(schedule, { checkpointer });

      const paused = await flow.runDurable({ runId: 'scheduled-1', shared: {} });
      expect(paused.status).toBe('scheduled');
      expect(paused.scheduled).toBe(true);
      expect(paused.dueAt).toBeGreaterThan(Date.now());
      expect(checkpointer.listScheduledRuns()).toMatchObject([{ runId: 'scheduled-1' }]);

      // Wait for the stored due time to pass, then resume the same run.
      await new Promise(resolve => setTimeout(resolve, 40));
      const resumed = await flow.runDurable({ runId: 'scheduled-1', resume: true });
      expect(resumed.status).toBe('completed');
      expect(resumed.result).toBe('fired');
      expect(checkpointer.listScheduledRuns()).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  test('parses cron expressions without optional dependencies', () => {
    const from = new Date('2026-11-22T10:15:00.000Z');
    expect(new Date(nextCronTime('0 3 * * *', from)).toISOString()).toBe('2026-11-23T03:00:00.000Z');
    expect(new Date(nextCronTime('*/15 * * * *', from)).toISOString()).toBe('2026-11-22T10:30:00.000Z');
  });
});

describe('flow versioning', () => {
  test('aborts a mismatched resume and can explicitly migrate', async () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    try {
      const flowV1 = new DurableFlow(new MarkNode('v1'), { checkpointer, version: '1' });
      const outcome = await flowV1.runDurable({ runId: 'versioned', shared: {} });
      expect(outcome.status).toBe('completed');
      expect(checkpointer.loadRun('versioned').flowVersion).toBe('1');

      const flowV2 = new DurableFlow(new MarkNode('v2'), { checkpointer, version: '2' });
      await expect(flowV2.runDurable({ runId: 'versioned', resume: true }))
        .rejects.toThrow(FlowVersionMismatchError);

      const migrated = new DurableFlow(new MarkNode('v2'), {
        checkpointer,
        version: '2',
        onVersionMismatch: 'migrate',
        migrate: ({ shared }) => ({ ...shared, migrated: true }),
      });
      const result = await migrated.runDurable({ runId: 'versioned', resume: true });
      expect(result.shared.migrated).toBe(true);
      expect(checkpointer.loadRun('versioned').flowVersion).toBe('2');
      expect(checkpointer.listCheckpoints('versioned')[0].flowVersion).toBe('2');
    } finally {
      cleanup();
    }
  });

  test('findNodeByIndex falls back to the saved node class', () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    try {
      const first = new MarkNode('first');
      first.next(new MarkNode('second'), 'default');
      const flow = new DurableFlow(first, { checkpointer });
      const found = flow.findNodeByIndex(flow.buildNodeIndex(), 999, 'MarkNode');
      expect(found.constructor.name).toBe('MarkNode');
    } finally {
      cleanup();
    }
  });
});

describe('side-effect worker leases', () => {
  test('a second live worker cannot execute the same operation', async () => {
    const owner = makeCheckpointer({ workerId: 'worker-a', leaseMs: 60_000 });
    const other = new SQLiteCheckpointer(owner.path, { workerId: 'worker-b', leaseMs: 60_000 });
    let executions = 0;
    let release = null;
    const blocker = new Promise(resolve => { release = resolve; });
    const execute = async () => {
      executions += 1;
      await blocker;
      return { charged: true };
    };
    const run = checkpointer => withReplaySafeSideEffect({
      params: {},
      shared: { orderId: 'ord-9' },
      observer: { checkpointer, runId: 'lease-run' },
      kind: 'charge',
      operationId: '{{orderId}}',
      execute,
    });
    try {
      const settled = Promise.allSettled([run(owner.checkpointer), run(other)]);
      await new Promise(resolve => setTimeout(resolve, 25));
      release();
      const results = await settled;

      expect(executions).toBe(1);
      const fulfilled = results.find(result => result.status === 'fulfilled');
      const rejected = results.find(result => result.status === 'rejected');
      expect(fulfilled.value.result).toEqual({ charged: true });
      expect(rejected.reason).toBeInstanceOf(SideEffectClaimedError);
      expect(rejected.reason.code).toBe('QFLOW_SIDE_EFFECT_CLAIMED');
    } finally {
      owner.cleanup();
      other.close();
    }
  });

  test('an expired lease stays uncertain; an explicit failure can be retried', async () => {
    const { checkpointer, cleanup } = makeCheckpointer({ workerId: 'worker-a', leaseMs: 0 });
    try {
      const args = {
        params: {},
        shared: { orderId: 'ord-10' },
        observer: { checkpointer, runId: 'lease-retry' },
        kind: 'charge',
        operationId: '{{orderId}}',
        execute: async () => ({ done: true }),
      };
      const stamp = new Date().toISOString();
      checkpointer.db.prepare(`
        INSERT INTO qflow_side_effects
          (run_id, operation_id, kind, status, result_json, error_json, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', NULL, NULL, ?, ?)
      `).run('lease-retry', 'charge:ord-10', 'charge', stamp, stamp);
      await expect(withReplaySafeSideEffect(args)).rejects.toThrow(SideEffectUncertainError);

      checkpointer.failSideEffect('lease-retry', 'charge:ord-10');
      const retried = await withReplaySafeSideEffect({ ...args, onPending: 'retry' });
      expect(retried.result).toEqual({ done: true });
      expect(checkpointer.loadSideEffect('lease-retry', 'charge:ord-10').status).toBe('completed');
    } finally {
      cleanup();
    }
  });
});

describe('checkpoint LLM cache', () => {
  test('stores and expires deterministic responses', async () => {
    const { checkpointer, cleanup } = makeCheckpointer();
    try {
      expect(checkpointer.cacheGet('llm', 'key-1')).toBeNull();
      checkpointer.cacheSet('llm', 'key-1', { text: 'hello' });
      expect(checkpointer.cacheGet('llm', 'key-1')).toEqual({ text: 'hello' });
      checkpointer.cacheSet('llm', 'key-2', { text: 'stale' }, -1);
      expect(checkpointer.cacheGet('llm', 'key-2')).toBeNull();
      expect(checkpointer.clearCache('llm')).toBe(1);
    } finally {
      cleanup();
    }
  });
});
