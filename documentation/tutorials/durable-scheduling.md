# Tutorial: durable scheduling

A timer that lives inside a process is a fragile thing: restart the worker and
the reminder is gone. `SchedulerNode` is useful for short, in-process delays,
but "send this invoice reminder in three days" needs state in SQLite.

`ScheduleNode` stores a due time in the run's `shared` state. If the time has
not arrived, it throws `SchedulePendingError`; `DurableFlow` catches it and
returns `status: 'scheduled'` with a persisted `dueAt`. A scheduler process
queries `listScheduledRuns()` and resumes whatever is due.

> **Why store the due time?** Because "three days from when the node first ran"
> must mean the same thing after a restart. The saved value is the contract;
> recomputing it on resume would drift.

## 1. Add a schedule node

```javascript
import { AsyncNode } from '@fractal-solutions/qflow';
import { DurableFlow, SQLiteCheckpointer, ScheduleNode } from '@fractal-solutions/qflow/durable';

class ReminderNode extends AsyncNode {
  async execAsync(_prep, shared) {
    shared.reminderSentAt = Date.now();
    return { sent: true, to: shared.customerEmail };
  }
  async postAsync() { return 'default'; }
}

const wait = new ScheduleNode({
  delayMs: 2_000,           // relative to the first execution
  dueAtKey: 'reminderAt',   // where the resolved time is stored in shared
  resultKey: 'reminderWait',
});
wait.next(new ReminderNode(), 'due');  // 'due' is the action when the time arrives

const checkpointer = new SQLiteCheckpointer('./runs.db');
const flow = new DurableFlow(wait, { checkpointer, name: 'reminders' });
flow.on('schedule:waiting', ({ scheduleId, dueAt }) =>
  console.log('waiting until', new Date(dueAt).toISOString(), scheduleId));
flow.on('schedule:pending', ({ runId, dueAt }) =>
  console.log('run scheduled', runId, new Date(dueAt).toISOString()));

const paused = await flow.runDurable({
  runId: 'reminder-customer-1',
  shared: { customerEmail: 'buyer@example.com' },
});

console.log(paused.status); // 'scheduled'
console.log(paused.dueAt);  // epoch ms
console.log(paused.shared.reminderAt === paused.dueAt); // true
checkpointer.close();
```

The node ran `prepAsync` (resolving the due time), then `execAsync` saw that
`now < dueAt`, emitted `schedule:waiting` and threw. `DurableFlow` saved status
`scheduled` and `due_at` on the run, then returned the outcome rather than
throwing.

## 2. Find and resume due runs

```javascript
const checkpointer = new SQLiteCheckpointer('./runs.db');
const flow = new DurableFlow(wait, { checkpointer, name: 'reminders' });

const due = checkpointer.listScheduledRuns({ before: Date.now() });
// [{ runId, flowName, flowVersion, dueAt, step }, ...]

for (const run of due) {
  const outcome = await flow.runDurable({ runId: run.runId, resume: true });
  console.log(run.runId, outcome.status); // 'completed' once the time has passed
}
checkpointer.close();
```

A real deployment runs this loop on a cron, a queue consumer, or a small Bun
interval. `listScheduledRuns({ before })` returns only runs whose `dueAt` is at
or before `before`, ordered by due time. `before` defaults to `Infinity`, which
is handy for an audit view of everything waiting.

Run status values you will see:

| Status | Meaning | Next action |
| --- | --- | --- |
| `scheduled` | Waiting for a due time | Poll `listScheduledRuns()` and resume |
| `suspended` | Waiting for an approval decision | Record a decision and resume |
| `completed` | Reached the end of the graph | Nothing |
| `failed` | A real error was thrown | Inspect `loadRun(runId).error` |

## 3. Choosing `at`, `delayMs` or `cron`

```javascript
const absolute = new ScheduleNode({ at: '2026-12-01T09:00:00.000Z' });
const relative = new ScheduleNode({ delayMs: 60_000 });
const recurring = new ScheduleNode({ cron: '0 3 * * *' });  // 03:00 every day
const explicit = new ScheduleNode({ scheduleId: 'daily-digest' });
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `at` | `Date`, ISO string, epoch ms | `null` | Absolute due time. Highest priority. |
| `delayMs` | number | `null` | Relative delay, resolved once on the first execution |
| `cron` | string | `null` | Five fields: `minute hour day month weekday` |
| `scheduleId` | string | generated from due time | Stable label for logs and traces |
| `dueAtKey` | string | `'scheduledAt'` | Shared key where the due time is persisted |
| `scheduleIdKey` | string | `'scheduleId'` | Shared key where the id is persisted |
| `resultKey` | string | `'scheduleResult'` | Shared key for `{scheduleId, dueAt, firedAt}` |

Resolution order is `params.at` → constructor `at` → saved `shared[dueAtKey]`
→ `delayMs` → `cron`. You can override any option per run with node params, and
`params.now` (Date or epoch ms) replaces the clock — useful for tests:

```javascript
const testNode = new ScheduleNode({ at: '2026-12-01T09:00:00.000Z' });
testNode.setParams({ now: new Date('2026-12-01T08:59:00.000Z') });
// → status 'scheduled'
testNode.setParams({ now: new Date('2026-12-01T09:00:01.000Z') });
// → status 'completed' (with DurableFlow)
```

### Cron syntax

`nextCronTime(expression, from?)` parses standard five-field expressions with
no optional dependency:

| Syntax | Example | Meaning |
| --- | --- | --- |
| `*` | `0 3 * * *` | Every value for that field |
| list | `0,30 * * * *` | At minute 0 and 30 |
| range | `0 9-17 * * 1-5` | Hourly 09:00-17:00 on weekdays |
| step | `*/15 * * * *` | Every 15 minutes |
| Sunday | `0 0 * * 0` or `0 0 * * 7` | Both mean Sunday |

When both day-of-month and weekday are restricted, a date matches **either**
field (cron's usual OR rule). Times are interpreted in the process's local
timezone. `nextCronTime()` returns epoch milliseconds of the next match.

**Important:** after a due time is saved, it wins over a fresh cron calculation.
If your graph loops back to the same `ScheduleNode` and you want the *next*
cron slot, delete the saved key first:

```javascript
delete shared.reminderAt; // or whatever you chose for dueAtKey
```

Otherwise the node sees the old (already past) due time and fires immediately.

## Events and errors

| Signal | Payload / meaning |
| --- | --- |
| `schedule:waiting` | `{runId, scheduleId, dueAt}` — emitted before suspension |
| `schedule:pending` | `{runId, scheduleId, dueAt, step}` — emitted by `DurableFlow` |
| `QFLOW_SCHEDULE_PENDING` | `SchedulePendingError`; expected while the run is not due |

## Rules of thumb

- Use a file-backed checkpointer (not `':memory:'`) if the delay outlives the
  process.
- Store a business id in `shared` (customer id, invoice id) so the reminder
  node knows what to do after resume.
- Keep one scheduler process per database, or give each poller a distinct
  `workerId` if it might resume the same run. Resuming is guarded by the run
  status, so a double poll is harmless once the run completes.
- For recurring work, prefer a new run per occurrence. It keeps each trace and
  approval history separate.
- A scheduled run is *not* a process timer. Nothing executes until a worker
  resumes it.

Next: [durable human approval](durable-approval.md) suspends on a decision
instead of time; [budget guardrails](budget-guardrails.md) stop an agent from
looping while it waits.
