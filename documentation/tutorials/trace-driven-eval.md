# Tutorial: trace-driven evaluation

2.0 treats a normalized trace as the contract between a running flow and its tests. The same event stream powers the browser trace viewer, durable `exportRunTrace()`, and the eval nodes — so a regression you can see is a regression you can gate on.

## 1. Capture a run's events

`recordFlow(flow)` attaches to a flow's event bus and returns `{ events, snapshot(), clear() }`:

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { recordFlow } from '@fractal-solutions/qflow/testing';

const flow = new AsyncFlow(startNode);
const recorder = recordFlow(flow);   // { events, snapshot(), clear() }

const shared = { orderId: 'ord-1' };
await flow.runAsync(shared);

console.log(recorder.events.length); // [{ event, payload }, ...]
console.log(recorder.snapshot());     // deterministic, timing/IDs removed
```

`snapshot()` strips `startTime`, `endTime`, `duration`, `timestamp`, `stack`, and replaces flow/run IDs with stable `flow:1`, `run:1` labels. That makes it suitable for `expect(...).toMatchSnapshot()`. Use `snapshot({ includeTiming: true, includeIds: true })` when you actually want those fields. Call `recorder.clear()` to reuse the same recorder for another run.

## 2. Normalize and save the trace

`normalizeTrace()` accepts a raw event array, `recordFlow()` events, snapshot output, a durable `exportRunTrace()` result, or `{ events, checkpoints }`. It always produces plain JSON:

```javascript
import { normalizeTrace, writeTraceFile } from '@fractal-solutions/qflow/trace';

const trace = normalizeTrace({
  runId: 'ord-1',
  flowName: 'checkout',
  events: recorder.events,
  checkpoints: [{ shared: { orderId: 'ord-1' } }],
});

console.log(trace);
// {
//   schema: 'qflow.trace/v1',
//   runId, flowName, status, steps, startedAt, endedAt,
//   events: [...],          // normalized, clone-safe
//   checkpoints: [...],
//   spans: [...],           // paired start/end events with durations
// }

await writeTraceFile(trace, './traces/checkout.json'); // Bun-only
```

`writeTraceFile()` uses `Bun.write` and pretty-prints via `serializeTrace()`. To move a trace between environments without a file, use `serializeTrace(trace)` directly — it's just JSON.

**Viewing it:** the trace viewer at the qflow site is browser-only. Export JSON with Bun, then paste or upload it into the `#trace` element. Nothing Bun-specific is embedded in the trace, so it opens anywhere.

## 3. Replay the trace against a fresh flow

`ReplayNode` loads a saved trace, rebuilds the initial `shared` from its first checkpoint, runs a target flow, and diffs the resulting events:

```javascript
import { ReplayNode } from '@fractal-solutions/qflow/eval';

function makeFlow() {
  // build and return a fresh AsyncFlow (reuse the same topology as production)
}

const replay = new ReplayNode({
  tracePath: './traces/checkout.json',
  flowFactory: () => makeFlow(),
});

const output = await new AsyncFlow(replay).runAsync({});
console.log(output.comparison.equal);        // true = behavior unchanged
console.log(output.comparison.differences); // [{ path, expected, actual }, ...]
console.log(output.expectedTrace);           // the saved trace, serialized
console.log(output.actualTrace);             // what the fresh flow emitted
```

Key details:

- `flowFactory(initialShared, { trace, observer })` receives the replay's starting state. You can build a flow with fresh mocks or side-effect stubs there.
- Loading from `tracePath` requires Bun (`Bun.file`). Pass a trace object instead for portability.
- By default only `status`, `events`, and `spans` are compared. Checkpoints are metadata of the *saved* run, not an output of replaying a fresh flow, so they're excluded. Override with `compareOptions: { fields: [...] }` if you want them.
- `ReplayNode` returns action `equal` / `different` when wired to successors, and writes the full result to `shared.replay` (configurable with `outputKey`).

## 4. Diff traces or payloads directly

`compareTraces()` runs `deepDiff()` over projected fields. `deepDiff()` ignores volatile keys (`seq`, `startTime`, `endTime`, `duration`, `timestamp`, `stack`, `flowId`, `parentFlowId`, timestamps) and supports numeric tolerance:

```javascript
import { compareTraces, deepDiff } from '@fractal-solutions/qflow/eval';

const comparison = compareTraces(expectedTrace, actualTrace, {
  fields: ['events', 'spans'],   // default: status, events, spans, checkpoints
  ignoreKeys: ['message'],       // additional keys to skip
  tolerance: 0.01,               // numeric comparisons
});
console.log(comparison.equal, comparison.differences);

const diffs = deepDiff({ total: 100, tags: ['a'] }, { total: 100.005, tags: ['a', 'b'] }, {
  tolerance: 0.01,
});
// [{ path: 'tags.length', expected: 1, actual: 2 }]
```

`CompareNode` wraps this in a node with `equal` / `different` successors:

```javascript
import { CompareNode } from '@fractal-solutions/qflow/eval';

const compare = new CompareNode({ actualKey: 'llmResult' });
compare.next(onEqual, 'equal');
compare.next(onDifferent, 'different');
// shared.expected holds the golden payload; shared.llmResult holds the actual one.
```

## 5. Gate a run with assert and score nodes

`AssertNode` is a deterministic pass/fail check. Operators: `eq`, `ne`, `deepEqual`, `gt`, `gte`, `lt`, `lte`, `contains`, `truthy`, `falsy`.

```javascript
import { AssertNode, ScoreNode } from '@fractal-solutions/qflow/eval';

const assertRoute = new AssertNode({
  operator: 'eq',
  expected: 'escalate',
  actualKey: 'decision',
  throwOnFailure: false,
});

const score = new ScoreNode({
  scorer: (actual, expected, shared) => Math.min(1, shared.riskScore / 6),
  threshold: 0.8,
});

assertRoute.next(score, 'pass');

const shared = { decision: 'escalate', riskScore: 6 };
await new AsyncFlow(assertRoute).runAsync(shared);
console.log(shared.assertions[0].passed); // true
console.log(shared.score.passed);         // true
```

Notes:

- Assertions append to `shared.assertions` (`outputKey` overrides the name). The score object goes to `shared.score`.
- With successors wired, actions are `pass` / `fail`. Without successors, the node returns a boolean.
- For an arbitrary check use `condition: (actual, shared, observer) => ...`; it wins over the operator.
- `throwOnFailure: true` raises an error with the assertion message instead of routing to `fail`.
- Events: `eval:assert`, `eval:score`, `eval:compare`, `eval:replay`.

## 6. Run a case suite

`createEvalSuite(flow, cases)` runs a flow once per case and returns `{ name, result, shared }` for each:

```javascript
import { createEvalSuite } from '@fractal-solutions/qflow/eval';

const suite = createEvalSuite(makeFlow(), [
  { name: 'outage', shared: { tickets: [{ id: 1, text: 'checkout is down' }] } },
  { name: 'routine', shared: { tickets: [{ id: 2, text: 'docs typo' }] } },
]);

const results = await suite.run();
console.log(results.map(r => `${r.name}=${r.result}`).join(', '));
```

Pass a flow whose first node is a `ReplayNode` or an `AssertNode`/`ScoreNode` chain to turn the suite into a regression gate. The returned `shared` is the final state for each case, so you can inspect `shared.assertions`, `shared.score`, or `shared.replay` after the run.

## 7. Where this fits

- [Replay-safe checkout](durable-side-effects.md) — `checkpointer.exportRunTrace(runId)` feeds directly into `normalizeTrace()`.
- [Agent strategies as flows](agent-flows.md) — record an agent run, then replay it with a scripted `LLMNode` adapter for offline CI.
- The working example: `bun examples/v2/dataflow-eval-regression.js` — contracts, graph description, trace replay with zero diffs, assert/score, and a two-case suite.
