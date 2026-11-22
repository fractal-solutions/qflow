# Tutorial: durable side effects and safe replay

A checkpointed flow can resume after a crash, but a normal node will simply run again. If that node charged a card or sent an email, "run again" means duplicate work. 2.0 adds a reservation layer so completed effects replay their recorded result and uncertain effects are refused.

## 1. The problem

```javascript
// Unsafe under replay: the POST happens again after a crash.
const http = new HttpRequestNode();
http.setParams({ url: 'https://api.example.com/charge', method: 'POST' });
await new DurableFlow(http, { checkpointer }).runDurable({ runId: 'order-1' });
// crash after the server accepted the charge
await new DurableFlow(http, { checkpointer }).runDurable({ runId: 'order-1', resume: true });
// the customer is charged twice
```

## 2. Give the effect a stable operation ID

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DurableFlow, SQLiteCheckpointer } from '@fractal-solutions/qflow/durable';
import { ReplaySafeNode } from '@fractal-solutions/qflow/side-effects';

const checkpointer = new SQLiteCheckpointer('./runs.db'); // file-backed: survives restarts

const charge = new ReplaySafeNode({
  kind: 'charge',
  operationId: '{{orderId}}',       // stored as 'charge:ord-1'
  inputKey: 'paymentInput',
  resultKey: 'paymentResult',
  execute: async ({ input, shared, observer }) => {
    // Only this function talks to the external service.
    return paymentApi.charge(input);
  },
});

const notify = new ReplaySafeNode({
  kind: 'email',
  operationId: '{{orderId}}',       // stored as 'email:ord-1'
  inputKey: 'emailInput',
  resultKey: 'emailResult',
  execute: async ({ input }) => emailApi.send(input),
});

charge.next(notify);

const flow = new DurableFlow(charge, { checkpointer, name: 'checkout' });
flow.on('side_effect:replay', payload => console.log('replayed', payload.operationId));
flow.on('side_effect:committed', payload => console.log('committed', payload.operationId));

const runId = 'checkout-ord-1';
try {
  await flow.runDurable({
    runId,
    shared: {
      orderId: 'ord-1',
      paymentInput: { amount: 4200, currency: 'usd' },
      emailInput: { to: 'buyer@example.com' },
    },
  });
} catch (error) {
  console.log('run failed', error.message);
}

const outcome = await flow.runDurable({ runId, resume: true });
console.log(outcome.result, outcome.steps, outcome.resumed);
checkpointer.close();
```

`operationId` templates resolve against `shared` and node params, then get a `kind:` prefix. Use a business key (`{{orderId}}`, `{{requestId}}`) — the default hash of all params/shared changes whenever unrelated state changes.

## 3. What happens on replay

Before `execute()` runs, `SQLiteCheckpointer.runSideEffect()` inserts a `pending` row in `qflow_side_effects`:

| Row status | Resume behavior |
| --- | --- |
| `completed` | Returns the stored JSON result. `execute()` is not called. Emits `side_effect:replay`. |
| `pending` | Throws `SideEffectUncertainError` (`QFLOW_SIDE_EFFECT_UNCERTAIN`). The effect may or may not have happened; qflow does not guess. |
| `failed` | Throws by default. Use `onPending: 'retry'` if the failure is safely retryable. `onPending: 'return-null'` returns `null` for soft failures. |
| no row | Reserves the operation, runs `execute()`, then stores the result as `completed`. Emits `side_effect:committed`. |

A crash *after* the effect commits but *before* the checkpoint is saved is safe: resume retries from the start node (or the saved cursor), the charge replays from the table, and only the uncommitted work runs again.

## 4. Built-in nodes with `operationId`

The same helper is used by `HttpRequestNode`, `GitNode`, `WebHookNode` and `DatabaseNode`:

```javascript
http.setParams({ url, operationId: '{{requestId}}' });
git.setParams({ command: 'push', operationId: '{{commitSha}}' });
```

For HTTP, `kind` is `http`, so `{{requestId}}` becomes `http:req-123`. Do not include the kind in the template; it is added for you.

## 5. Inspecting recorded effects

```javascript
checkpointer.listSideEffects(runId);                     // metadata only
checkpointer.loadSideEffect(runId, 'charge:ord-1');      // result, error, timestamps
checkpointer.listCheckpoints(runId);                     // one per node boundary
const trace = checkpointer.exportRunTrace(runId, { includeState: true });
```

`exportRunTrace()` produces the same normalized trace the viewer and the eval nodes consume. See [Trace-driven evaluation](trace-driven-eval.md).

## 6. Rules of thumb

- Use a file-backed checkpointer. The default `:memory:` store cannot survive a process restart.
- Only put JSON-compatible values in `shared`; checkpoints round-trip through JSON. Live handles (SQLite databases, streams) must be kept outside durable state.
- Keep `execute()` small and deterministic in what it records. If you need a receipt, return it from `execute()` so replay can hand it to later nodes.
- Do not set `maxRetries > 1` on a replay-safe node with the default `onPending: 'error'`; the second in-node attempt will see the reserved row and raise `SideEffectUncertainError`.
- Give each worker a distinct `workerId`. Reservations use an atomic `INSERT OR IGNORE` with a lease; a second live worker gets `SideEffectClaimedError` (`QFLOW_SIDE_EFFECT_CLAIMED`) instead of executing.

## Worker leases

Set a worker identity on the checkpointer or flow so a reservation records who
owns it, and choose a lease longer than the effect's worst case:

```javascript
import { SideEffectClaimedError } from '@fractal-solutions/qflow/side-effects';

const checkpointer = new SQLiteCheckpointer('./runs.db', {
  workerId: `worker-${process.pid}`,
  leaseMs: 60_000,
});
const flow = new DurableFlow(charge, { checkpointer });

try {
  await flow.runDurable({ runId, shared });
} catch (error) {
  if (error instanceof SideEffectClaimedError) {
    console.log('owned by', error.claimedBy); // retry later, do not execute
  } else {
    throw error;
  }
}

// If an operator confirms the effect did NOT happen, release it explicitly:
checkpointer.failSideEffect(runId, 'charge:ord-1');
await flow.runDurable({ runId, resume: true }); // with onPending: 'retry' on the node
```

A `pending` row with a live lease from another worker raises
`QFLOW_SIDE_EFFECT_CLAIMED`. A `pending` row whose lease has expired stays
uncertain (`QFLOW_SIDE_EFFECT_UNCERTAIN`) — nobody automatically retries it.
Only an explicit `failSideEffect()` plus `onPending: 'retry'` may re-execute,
and that should follow a reconciliation with the payment/email provider.

See [MIGRATION.md § 9](../../MIGRATION.md#9-side-effects-replay-and-worker-leases)
for the full option table.

## Working example

`bun examples/v2/replay-safe-checkout.js` simulates a post-commit crash, shows one charge and one email after resume, then seeds a pending reservation and shows the uncertain-effect error.
