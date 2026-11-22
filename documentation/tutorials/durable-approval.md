# Tutorial: durable human approval

A checkout over $500, a refund, a production deploy: some steps must not happen
until a human says so. The catch is that "wait for a human" may mean minutes or
days, and the process that asked the question may be gone by the time the answer
arrives.

`HumanApprovalNode` asks inside the running process. `WaitForApprovalNode`
writes the question to SQLite, lets `DurableFlow` return `status: 'suspended'`,
and reads the answer when you resume. The decision survives restarts, and the
reviewer can be a web app, a Slack bot or a CLI.

> **Why a separate node?** A callback held in memory cannot survive a deploy.
> A durable approval is a row in SQLite with a stable id, a status and a
> decision — the same kind of state as a checkpoint.

## 1. Put a gate in the graph

```javascript
import { AsyncNode } from '@fractal-solutions/qflow';
import {
  DurableFlow,
  SQLiteCheckpointer,
  WaitForApprovalNode,
} from '@fractal-solutions/qflow/durable';

// Plain nodes for the two outcomes.
class RefundNode extends AsyncNode {
  async execAsync(_prep, shared) {
    shared.refunded = true;
    return { refunded: true };
  }
  async postAsync() { return 'default'; }
}
class CancelNode extends AsyncNode {
  async execAsync(_prep, shared) {
    shared.cancelled = true;
    return { cancelled: true };
  }
  async postAsync() { return 'default'; }
}

const gate = new WaitForApprovalNode({
  approvalId: '{{requestId}}',  // stored as 'approval:req-1'
  prompt: 'Approve a $750 refund?',
  resultKey: 'approval',
  metadata: { amount: 750, currency: 'usd' },
});

// Register both actions separately; do not chain one call after the other.
gate.next(new RefundNode(), 'approve');
gate.next(new CancelNode(), 'reject');

const checkpointer = new SQLiteCheckpointer('./runs.db');
const flow = new DurableFlow(gate, { checkpointer, name: 'refunds', version: '1.0.0' });
flow.on('approval:requested', ({ approvalId, prompt }) =>
  console.log('needs decision', approvalId, prompt));
flow.on('approval:pending', ({ runId, approvalId }) =>
  console.log('run suspended', runId, approvalId));

const outcome = await flow.runDurable({
  runId: 'refund-req-1',
  shared: { requestId: 'req-1' },
});

console.log(outcome.status);     // 'suspended'
console.log(outcome.approvalId); // 'approval:req-1'
console.log(outcome.result);     // null — the flow has not continued
// Keep the checkpointer open for steps 2 and 3.
```

What happened:

1. The node called `checkpointer.requestApproval()` and inserted a `pending`
   row keyed by `(runId, approvalId)`.
2. It threw `ApprovalPendingError` (`QFLOW_APPROVAL_PENDING`).
3. `DurableFlow` caught that error, saved run status `suspended`, and returned
   an outcome instead of throwing. No checkpoint was written for the gate, so
   resume will re-enter it.

## 2. Show the pending decision to a reviewer

```javascript
// Reuse the checkpointer and flow from step 1.
const pending = checkpointer.listApprovals('refund-req-1', { status: 'pending' });
console.log(pending);
// [{
//   runId: 'refund-req-1',
//   approvalId: 'approval:req-1',
//   prompt: 'Approve a $750 refund?',
//   status: 'pending',
//   decision: null,
//   metadata: { amount: 750, currency: 'usd' },
//   createdAt: '...', updatedAt: '...',
// }]

// A queue across all runs in this database:
const allPending = checkpointer
  .listRuns()
  .flatMap(runId => checkpointer.listApprovals(runId, { status: 'pending' }));
```

In a real app, expose this list through an API and post the `runId` +
`approvalId` to a review UI. You do not need the flow object to record a
decision — only the checkpointer and the database path.

## 3. Record the decision and resume

```javascript
checkpointer.approve('refund-req-1', {
  by: 'alice',
  answer: 'yes',
}, 'approval:req-1');

const finished = await flow.runDurable({ runId: 'refund-req-1', resume: true });

console.log(finished.status);            // 'completed'
console.log(finished.result);            // { refunded: true }
console.log(finished.shared.approval);   // { approved: true, by: 'alice', answer: 'yes', ... }
console.log(finished.shared.approvals['approval:req-1'].status); // 'approved'
checkpointer.close();
```

On resume the gate re-enters `execAsync`, reads the now-`approved` record and
returns the decision. `postAsync` writes it to `shared.approval` and
`shared.approvals[approvalId]`, then routes to `approve` (the default) or
`reject`.

To refuse:

```javascript
checkpointer.reject('refund-req-1', { by: 'bob', reason: 'duplicate' }, 'approval:req-1');
const cancelled = await flow.runDurable({ runId: 'refund-req-1', resume: true });
// result: { cancelled: true }
```

If you omit `approvalId`, `approve()` / `reject()` use the **last pending**
approval for that run. Pass the id whenever a flow can contain more than one
gate.

## Options you can tune

### `WaitForApprovalNode`

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `approvalId` | template string, function, `true` | `true` | Stable key. `{{requestId}}` renders from `shared`/params and is prefixed with `approval:`. A function receives `{params, shared, prompt}` and is used verbatim. `true` hashes prompt + shared. |
| `prompt` | string | `null` | Question shown to reviewers; `params.prompt` wins |
| `promptKey` | string | `'approvalPrompt'` | Shared key to read the prompt from if `prompt` is not set |
| `resultKey` | string | `'approval'` | Shared key for the decision object |
| `approvalsKey` | string | `'approvals'` | Shared key for the full `id → decision` map |
| `metadata` | JSON object | `null` | Extra reviewer context; must be JSON-serializable |

### Checkpointer approval API

| Method | Arguments | Returns |
| --- | --- | --- |
| `requestApproval` | `{runId, approvalId, prompt, metadata}` | record (idempotent) |
| `getApproval` | `runId, approvalId` | record / `null` |
| `listApprovals` | `runId, {status}` | records; status is `pending`, `approved` or `rejected` |
| `approve` | `runId, decision?, approvalId?` | record with `approved: true` unless you pass `approved: false` |
| `reject` | `runId, decision?, approvalId?` | record with `approved: false` |

### Events and errors

| Signal | Payload / meaning |
| --- | --- |
| `approval:requested` | `{runId, approvalId, prompt}` — emitted when a new pending row is created |
| `approval:resolved` | `{runId, approvalId, status}` — emitted on resume when the decision is read |
| `approval:pending` | `{runId, approvalId, step}` — emitted by `DurableFlow` when it suspends |
| `QFLOW_APPROVAL_PENDING` | `ApprovalPendingError`; expected while a decision is outstanding |

## Rules of thumb

- Use a **business key** in `approvalId` (`{{requestId}}`), not a counter or a
  timestamp. The same request id should map to the same decision forever.
- Keep `metadata` JSON-compatible. Checkpoints and approval rows round-trip
  through JSON.
- An already-decided approval is idempotent: `requestApproval()` returns the
  existing record, so resuming a gate never creates a duplicate question.
- `WaitForApprovalNode` requires a `DurableFlow`. In a plain `AsyncFlow` there is
  no `runId` or checkpointer in the observer, so the node throws.
- If you want an **in-process** approval during agent reasoning, use
  `HumanApprovalNode` from `@fractal-solutions/qflow/agent` instead.

## Verification without a UI

```javascript
const outcome = await flow.runDurable({ runId: 'refund-req-1', shared: { requestId: 'req-1' } });
if (outcome.status !== 'suspended') throw new Error('gate did not suspend');
checkpointer.approve('refund-req-1', {}, 'approval:req-1');
const resumed = await flow.runDurable({ runId: 'refund-req-1', resume: true });
if (resumed.status !== 'completed') throw new Error('gate did not resume');
```

Next: [durable scheduling](durable-scheduling.md) suspends on *time* instead of
a decision, and [deterministic LLM replay](llm-deterministic-cache.md) removes
provider randomness from the resumed path.
