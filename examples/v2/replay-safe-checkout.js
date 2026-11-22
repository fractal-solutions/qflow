/**
 * WHY THIS EXISTS
 * ---------------
 * A durable workflow that calls a payment gateway must never charge twice
 * when the process dies after the gateway accepted the request. This demo
 * crashes *after* the charge is committed, resumes the same run, and shows
 * the recorded result being replayed. It then seeds a "pending" reservation
 * to show qflow refusing to guess when an effect's outcome is unknown.
 *
 * Run: bun examples/v2/replay-safe-checkout.js
 */
import { unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DurableFlow, SQLiteCheckpointer } from '../../src/durable.js';
import { ReplaySafeNode, SideEffectUncertainError } from '../../src/side_effects.js';

// Stand-in for a non-idempotent external service.
const gateway = {
  charges: [],
  emails: [],
  async charge(input) {
    const receipt = { id: `ch_${this.charges.length + 1}`, ...input };
    this.charges.push(receipt);
    return receipt;
  },
  async email(input) {
    this.emails.push(input);
    return { sent: true, to: input.to };
  },
};

/** Commits the charge, then fails in postAsync: the process died too late to roll back. */
class CrashAfterCharge extends ReplaySafeNode {
  constructor() {
    super({
      kind: 'charge',
      operationId: '{{orderId}}',
      inputKey: 'paymentInput',
      resultKey: 'paymentResult',
      execute: ({ input }) => gateway.charge(input),
    });
    this.shouldCrash = true;
  }

  async postAsync(shared, prepRes, execRes, observer) {
    if (this.shouldCrash) {
      this.shouldCrash = false;
      throw new Error('process died after the gateway accepted the charge');
    }
    return super.postAsync(shared, prepRes, execRes, observer);
  }
}

const dbPath = join(tmpdir(), `qflow-checkout-${crypto.randomUUID()}.db`);
const checkpointer = new SQLiteCheckpointer(dbPath);

function cleanup() {
  checkpointer.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      unlinkSync(`${dbPath}${suffix}`);
    } catch {
      // already gone
    }
  }
}

try {
  const charge = new CrashAfterCharge();
  const notify = new ReplaySafeNode({
    kind: 'email',
    operationId: '{{orderId}}',
    inputKey: 'emailInput',
    resultKey: 'emailResult',
    execute: ({ input }) => gateway.email(input),
  });
  charge.next(notify);

  const flow = new DurableFlow(charge, { checkpointer, name: 'checkout' });
  const seen = [];
  flow.onAny(({ event }) => seen.push(event));

  const runId = 'checkout-ord-42';
  try {
    await flow.runDurable({
      runId,
      shared: {
        orderId: 'ord-42',
        paymentInput: { amount: 4200, currency: 'usd' },
        emailInput: { to: 'buyer@example.com' },
      },
    });
  } catch (error) {
    console.log(`1) First run crashed: ${error.message}`);
  }

  const resumed = await flow.runDurable({ runId, resume: true });
  console.log(`2) Resumed result: ${JSON.stringify(resumed.result)}`);
  console.log(`   Gateway charges: ${gateway.charges.length}, emails: ${gateway.emails.length}`);
  console.log(`   Effect events: ${seen.filter(event => event.startsWith('side_effect:')).join(', ')}`);
  console.log(`   Resume event: ${seen.includes('run:resumed') ? 'yes' : 'no'}`);

  // A real crash between reservation and completion leaves exactly this row.
  // The gateway may already have the money, so retrying would be unsafe.
  const uncertainRunId = 'checkout-ord-99';
  const now = new Date().toISOString();
  checkpointer.db.prepare(`
    INSERT INTO qflow_side_effects
      (run_id, operation_id, kind, status, result_json, error_json, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', NULL, NULL, ?, ?)
  `).run(uncertainRunId, 'charge:ord-99', 'charge', now, now);

  const uncertain = new ReplaySafeNode({
    kind: 'charge',
    operationId: '{{orderId}}',
    inputKey: 'paymentInput',
    execute: ({ input }) => gateway.charge(input),
  });
  const uncertainFlow = new DurableFlow(uncertain, { checkpointer, name: 'checkout-uncertain' });
  try {
    await uncertainFlow.runDurable({
      runId: uncertainRunId,
      shared: { orderId: 'ord-99', paymentInput: { amount: 9900 } },
    });
  } catch (error) {
    const outcome = error instanceof SideEffectUncertainError
      ? `refused replay (${error.code})`
      : error.message;
    console.log(`3) Uncertain effect: ${outcome}`);
  }
  console.log(`   Gateway charges still: ${gateway.charges.length} (no duplicate charge)`);
} finally {
  cleanup();
}
