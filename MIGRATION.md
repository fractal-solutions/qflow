# Migrating to qflow 2.0

> Applies to `2.0.0`. Earlier canaries introduced the provider-neutral
> node families; 2.0 closes the production gaps around approval,
> scheduling, replay, budgets, versioning and memory.
>
> This guide is written to be read in order the first time, then used as a
> lookup table afterwards. Every section follows the same shape: **what changed
> and why**, **1-2-3 steps to migrate**, **what each option means**, and
> **what can go wrong**.

---

## How to use this guide

Migration is a loop, not a single commit:

1. **Change the foundation first** — runtime, install, and imports (sections 2-3).
2. **Fix the seams** — lifecycle signatures, flow options, agents and streaming
   (sections 4-7). This is where most 1.x code needs a small edit.
3. **Adopt the 2.0 behaviour deliberately** — durability, replay, approval,
   scheduling, budgets, memory and traces (sections 8-17). These are additive:
   nothing here is required for a simple flow to keep working.

If you are starting a new project, skip the "before" snippets and read sections
8-15 as the recommended architecture.

### Which path is yours?

| You are coming from | Read | Expected work |
| --- | --- | --- |
| 1.x, ordinary flows and nodes | 2 → 3 → 4 → 5 → 16 | Small import and signature changes |
| 1.x with agents | 2 → 3 → 4 → 6 → 7 | Keep positional constructors; optionally switch to the options object |
| 1.x with `DurableFlow` | Add 8 → 9 → 10 → 11 → 12 | New run statuses and checkpointer methods; old `resume` calls still work |
| 2.0 canary.1/.2 | Add 7 → 17 | Trace format and optional-dependency changes |
| 2.0 canary.3 | Add 9 → 15 | Gap closures; no existing import breaks |
| A new 2.0 project | 2 → 3 → 8 → 15 → 17 | Build on durable runs, replay and traces from day one |

---

## Contents

- [1. Compatibility at a glance](#1-compatibility-at-a-glance)
- [2. Runtime: Bun only](#2-runtime-bun-only)
- [3. Imports: one package, many subpaths](#3-imports-one-package-many-subpaths)
- [4. Async lifecycle: the observer argument](#4-async-lifecycle-the-observer-argument)
- [5. Flow options](#5-flow-options)
- [6. Agents](#6-agents)
- [7. Streaming and provider-neutral LLM](#7-streaming-and-provider-neutral-llm)
- [8. Durable runs: the contract you build on](#8-durable-runs-the-contract-you-build-on)
- [9. Side effects: replay and worker leases](#9-side-effects-replay-and-worker-leases)
- [10. Flow versioning](#10-flow-versioning)
- [11. Durable human approval](#11-durable-human-approval)
- [12. Durable scheduling](#12-durable-scheduling)
- [13. Deterministic LLM replay and caching](#13-deterministic-llm-replay-and-caching)
- [14. Budget guardrails](#14-budget-guardrails)
- [15. Multi-tenant memory](#15-multi-tenant-memory)
- [16. Optional dependencies](#16-optional-dependencies)
- [17. Traces and evaluation](#17-traces-and-evaluation)
- [18. Other 2.0 node families](#18-other-20-node-families)
- [19. Migration checklist](#19-migration-checklist)
- [20. Error-code reference](#20-error-code-reference)
- [21. Troubleshooting](#21-troubleshooting)

---

## 1. Compatibility at a glance

**What changed:** 2.0 is a deliberate breaking release, but the break is narrow.
The core abstractions and every built-in node import still exist. What changed
is the runtime, the import paths, and a few *new* behaviours around durability.

| 1.x API | 2.0 status | Action |
| --- | --- | --- |
| `Node`, `Flow`, `BatchNode`, `BatchFlow` | Unchanged | None |
| `AsyncNode`, `AsyncFlow`, async batch variants | Unchanged, plus an optional 3rd/4th `observer` argument | None, or adopt `observer.emit()` |
| `new Flow(start)` / `new AsyncFlow(start)` | Unchanged, optional 2nd options argument | None, or add guards |
| `node.setParams()`, `node.next()` | Unchanged | None |
| Vendor LLM nodes (`OpenAILLMNode`, …) | Still exported | Keep them, or move to `LLMNode` |
| Agent classes (`AgentNode`, `RAORAgent`, …) | Still exported, now engine-backed | Keep positional constructor, or move to options object |
| `DurableFlow`, `SQLiteCheckpointer` | Enhanced, not replaced | Read sections 8-12 |
| `recordFlow()` snapshots | Normalized into one trace format | Read section 17 |
| Node.js runtime | Removed | Move to Bun |

**Why it changed:** qflow's growth is in Bun-native execution (`bun:sqlite`,
`Bun.spawn`, Bun streaming `fetch`) and agent orchestration. Supporting two
runtimes would freeze those APIs at their lowest common denominator. The
breaking change is the price of making durable, observable agents a first-class
feature instead of an example.

---

## 2. Runtime: Bun only

### What changed and why

2.0 calls Bun APIs directly. There is no Node.js compatibility shim, no
`node:` fallback for storage, and no plan to add one. This keeps the durable
checkpointer, process nodes and streaming nodes small and fast.

### 1-2-3 steps

1. Install Bun (the project is developed against Bun 1.4.x) and use it for
   scripts, tests and production.
2. Replace package-manager and runner commands:

   ```bash
   # before
   npm install @fractal-solutions/qflow
   npm test

   # after
   bun add @fractal-solutions/qflow
   bun test tests
   bun run build
   ```

3. Check for Node-only assumptions in your own code: CommonJS `require()`,
   `fs` calls inside async nodes, or a `package.json` without `"type": "module"`.
   qflow itself is ESM-only.

### What to expect

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Bun is not defined` | Running under Node | Run with `bun` |
| `Cannot find package 'bun:sqlite'` | Bundler or Node target | Build for Bun; mark `bun:*` external |
| Import errors for `fs`/`path` | Old deep imports | Use the documented subpaths (section 3) |

`Bun.env` is a convenient replacement for `process.env`, and works in Bun.
Keep using `process.env` if your deployment tooling expects it.

---

## 3. Imports: one package, many subpaths

### What changed and why

qflow stays **one npm package**, but it is no longer one giant entry point.
Each subpath is a small module with its own dependencies. This keeps the base
install light and means importing a flow never loads Playwright, xlsx, ssh2 or
a browser webview.

### 1-2-3 steps

1. Replace bare deep paths (for example
   `@fractal-solutions/qflow/src/nodes/...`) with a public subpath.
2. Pick the narrowest subpath that contains what you need; `/nodes` is the
   broad catalog, the specific subpaths are the focused toolboxes.
3. Run your tests with `bun test tests` — any missed import fails immediately.

```js
// before (1.x, conceptual)
import { DurableFlow } from '@fractal-solutions/qflow/dist/durable';
import { LLMNode } from '@fractal-solutions/qflow/src/nodes/llm';

// after (2.0)
import { DurableFlow } from '@fractal-solutions/qflow/durable';
import { LLMNode } from '@fractal-solutions/qflow/llm';
```

### Subpath reference

| Import | Contains | Use it when |
| --- | --- | --- |
| `@fractal-solutions/qflow` | `Node`, `Flow`, `AsyncNode`, `AsyncFlow`, batch variants | Writing core flows |
| `@fractal-solutions/qflow/nodes` | The whole built-in node catalog, including the 2.0 families | You want one catalog import |
| `@fractal-solutions/qflow/agent` | `AgentEngine`, strategies, legacy agents, control nodes | Building agents |
| `@fractal-solutions/qflow/mcp` | `QFlowMCPServer`, `MCPClientNode` | Exposing or calling MCP tools |
| `@fractal-solutions/qflow/streaming` | `streamChatCompletions()`, streaming event names | Low-level streaming |
| `@fractal-solutions/qflow/llm` | `LLMNode`, adapters, `llm:*` event names | Calling models |
| `@fractal-solutions/qflow/tool-spec` | `ToolSpec`, `ToolRegistry`, `generateToolDocs()` | Sharing tool definitions |
| `@fractal-solutions/qflow/contracts` | `StateContract`, `defineState()` | Validating `shared` |
| `@fractal-solutions/qflow/side-effects` | `ReplaySafeNode`, `withReplaySafeSideEffect()`, side-effect errors | Safe external calls |
| `@fractal-solutions/qflow/graph` | `FanOutNode`, `FanInNode`, map/reduce/join/branch/cycle nodes | Routing data |
| `@fractal-solutions/qflow/eval` | `AssertNode`, `ScoreNode`, `CompareNode`, `ReplayNode` | Regression suites |
| `@fractal-solutions/qflow/bun` | `BunSpawnNode`, `SQLiteQueryNode`, `FileWatchNode`, stream nodes | Local Bun-native work |
| `@fractal-solutions/qflow/durable` | `SQLiteCheckpointer`, `DurableFlow`, `createRunTrace()`, plus approval/schedule/budget helpers and durable errors | Long-lived runs |
| `@fractal-solutions/qflow/approval` | `WaitForApprovalNode`, `resolveApprovalId()` | Human decisions |
| `@fractal-solutions/qflow/schedule` | `ScheduleNode`, `nextCronTime()` | Time-based suspension |
| `@fractal-solutions/qflow/budget` | `BudgetTracker`, `BudgetNode`, `BudgetExceededError` | Cost/latency limits |
| `@fractal-solutions/qflow/memory` | `MemoryStore`, `InMemoryMemoryStore`, `SQLiteMemoryStore`, `MemoryStoreNode` | Reusable recall |
| `@fractal-solutions/qflow/testing` | `MockNode`, `MockLLMNode`, `recordFlow()` | Tests and traces |
| `@fractal-solutions/qflow/trace` | `normalizeTrace()`, `serializeTrace()`, `writeTraceFile()` | Trace export |
| `@fractal-solutions/qflow/optional` | `OPTIONAL_DEPENDENCIES`, `loadOptional()` | Diagnosing optional packages |
| `@fractal-solutions/qflow/logger` | `log`, `setLogLevel`, `LogLevel` | Logging control |

**Gotcha:** deep imports into `src/` or `dist/` are not part of the public API.
They bypass the export map and will break on the next release. The four new
gap-closure modules (`approval`, `schedule`, `budget`, `memory`) are also
re-exported from `/nodes`, and the durable helpers from `/durable`, so you can
choose whichever import style fits your project.

---

## 4. Async lifecycle: the observer argument

### What changed and why

Async lifecycle methods gained one **optional** final argument, the flow
observer. It lets any node emit events without knowing which flow owns it.
That is what makes streaming, approval requests, budget checks and replay
hits visible in one trace.

### 1-2-3 steps

1. If your method accepts fewer arguments, do nothing — it still works.
2. If you want events, add the third argument and call `observer.emit?.()`.
3. Subscribe on the flow with `flow.on(name, handler)` or `flow.onAny(handler)`.

```js
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';

class ChargeNode extends AsyncNode {
  async prepAsync(shared, observer) {
    observer.emit?.('charge:prepared', { orderId: shared.orderId });
    return shared.order;
  }

  async execAsync(prepRes, shared, observer) {
    observer.emit?.('charge:start', { amount: prepRes.amount });
    return { charged: true };
  }

  async postAsync(shared, prepRes, execRes, observer) {
    shared.charge = execRes;
    observer.emit?.('charge:done', execRes);
    return 'default';
  }
}

const flow = new AsyncFlow(new ChargeNode());
flow.on('charge:start', payload => console.log(payload));
flow.onAny(({ event, payload, nested }) => console.log(event, nested));
await flow.runAsync({ orderId: 'ord-1', order: { amount: 42 } });
```

### Lifecycle signature reference

| Method | Arguments | Returns | Notes |
| --- | --- | --- | --- |
| `prepAsync` | `(shared, observer)` | `Promise<prepRes>` | `observer` includes `emit`, `runId`, `signal`, `checkpointer`, `workerId`, `leaseMs` inside `DurableFlow` |
| `execAsync` | `(prepRes, shared, observer)` | `Promise<execRes>` | Retry happens in `_exec`; keep `execAsync` side-effect-aware |
| `postAsync` | `(shared, prepRes, execRes, observer)` | `Promise<action>` | Action chooses the successor via `node.next(target, action)` |

`AsyncFlow.on('*')` and `AsyncFlow.onAny()` receive **every** event, including
node lifecycle, custom events and new `approval:*`, `budget:*`, `memory:*`,
`llm:*` and `flow:version_*` events. Events from nested flows are forwarded with
`nested: true` and `parentFlowId`, so one listener can follow the whole tree.

---

## 5. Flow options

### What changed and why

`Flow` and `AsyncFlow` accept an optional second argument. These are guardrails,
not required configuration. Loops and agents can otherwise run forever or hide
a failed node in a long trace.

### 1-2-3 steps

1. Start with `new AsyncFlow(startNode)` — existing code is valid.
2. Add the guardrails that match your failure mode (`maxSteps` for loops,
   `timeout` for slow I/O, `onError` for recovery).
3. Assert on the events (`flow:end` with `status: 'failed'`) in tests.

```js
const flow = new AsyncFlow(startNode, {
  maxSteps: 100,
  timeout: 30_000,
  onError: recoveryNode,
});
```

| Option | Type | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- |
| `maxSteps` | `number` | `Infinity` | Positive integer or `Infinity` | Maximum node visits before the flow fails; the primary loop guard |
| `timeout` | `number` (ms) | none | Positive integer | Total run deadline; expiry rejects with `TimeoutError` |
| `onError` | `Node` / `AsyncNode` | `null` | A node instance | Receives control when a node fails; `shared.error` is populated |

**Gotcha:** `maxSteps` counts *visits*, so a cycle that goes around twice with
three nodes uses six steps. Set it above the expected path length, not the
number of unique nodes.

---

## 6. Agents

### What changed and why

All five agent classes (`AgentNode`, `RAORAgent`, `OODAAgent`, `LPAVRLAgent`,
`PEMAAgent`) remain available with their original positional constructors.
Internally they now share one `AgentEngine`, so a reasoning pattern is data
(a strategy) instead of a new class. That is what makes `asFlow()`, trace-driven
evaluation and custom patterns cheap.

### 1-2-3 steps

1. Keep your existing `new RAORAgent(llmNode, tools)` call if it works.
2. For new code, use the options object so strategy and tool permissions are
   explicit.
3. If you need a new pattern, register a strategy instead of subclassing.

```js
import { AgentNode, agentStrategies } from '@fractal-solutions/qflow/agent';

const agent = new AgentNode({
  llmNode,
  availableTools,
  strategy: 'raor',                  // default | raor | ooda | lpavrl | pema | your id
  requireFinishConfirmation: false, // true makes a second LLM call confirm completion
  toolRegistry,                     // optional; takes precedence over availableTools
  grantedCapabilities: ['read'],
  grantedPermissions: ['public'],
});

agentStrategies.myPattern = {
  id: 'myPattern',
  label: 'My pattern',
  strictParsing: false,
  phases: [{ name: 'ACT', prompt: 'Choose a tool.', kind: 'action' }],
  postPhases: [],
  noToolCallsPrompt: () => 'Call a tool or finish.',
  onToolError: errors => `Handle these errors: ${errors}`,
};
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `llmNode` | `LLMNode`-compatible node | required | Produces the next reasoning message |
| `availableTools` | `ToolSpec[]` / node definitions | `[]` | Tools offered to the model when no registry is given |
| `toolRegistry` | `ToolRegistry` | `null` | Shared source of tools, permissions and idempotency |
| `strategy` | `string` | `'default'` | Strategy id; built-ins plus anything in `agentStrategies` |
| `requireFinishConfirmation` | `boolean` | strategy-dependent | Ask the model to confirm the final answer |
| `grantedCapabilities` / `grantedPermissions` | `string[]` | `[]` | Filters which registry tools the agent may see and call |

`agent.asFlow()` returns an `AsyncFlow` with one node per strategy phase and a
`graph` property (`{ nodes, edges }`). It is the bridge to the eval and visual
authoring stories in sections 17-18.

---

## 7. Streaming and provider-neutral LLM

### What changed and why

The old `StreamingLLMNode` still works with OpenAI-compatible endpoints. 2.0
adds `LLMNode` with a pluggable adapter registry, capability negotiation and a
normalized result, so switching vendors does not rewrite prompt code.

### 1-2-3 steps

1. Replace a vendor node with `LLMNode` when you need more than one provider.
2. Declare required capabilities (`stream`, `toolCalls`, `structuredOutput`,
   `reasoning`) so failures happen before an API call.
3. Listen to `llm:delta` for UI and to `llm:done` / `llm:usage` for accounting.

```js
import { AsyncFlow } from '@fractal-solutions/qflow';
import { LLMNode } from '@fractal-solutions/qflow/llm';

const llm = new LLMNode({
  provider: 'openai',              // openai | anthropic | ollama | gemini | custom id | adapter object
  model: 'gpt-4o-mini',
  apiKey: Bun.env.OPENAI_API_KEY,
  fallbackProviders: ['ollama'],  // tried in order after retries are exhausted
  maxRetries: 2,
  pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  stream: true,
});

const flow = new AsyncFlow(llm);
flow.on('llm:delta', ({ delta }) => process.stdout.write(delta));
flow.on('llm:capability', ({ missing }) => console.warn('unsupported', missing));
const result = await flow.runAsync({ prompt: 'Summarize this release.' });
// result: { text, reasoning, toolCalls, usage: { prompt, completion, total, cost }, ... }
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `provider` | `string` / adapter object | required unless `adapter` is set | Adapter id, or any object with `complete()`/optional `stream()` |
| `adapter` | object | `null` | Direct adapter instance, used for the first provider |
| `model` | `string` | adapter default | Model name sent to the provider |
| `fallbackProviders` | `string[]` | `[]` | Ordered backup providers |
| `maxRetries` | `number` | `1` | Attempts per provider |
| `capabilities` / `requireCapabilities` | `string[]` | `[]` | Capabilities that must be supported before calling |
| `stream` | `boolean` | `false` | Use `stream()` and emit `llm:delta` / `llm:reasoning` |
| `tools` | array | `null` | Tool schemas; implies the `toolCalls` capability |
| `responseFormat` | object | `null` | Structured-output request; implies `structuredOutput` |
| `pricing` | object / function | `null` | `inputPerMillion` / `outputPerMillion`, or `({provider,model,usage}) => cost` |
| `cache`, `cacheKey`, `cacheTtlMs`, `budget` | see sections 13-14 | disabled | Deterministic replay and spend limits |

Events: `llm:delta`, `llm:reasoning`, `llm:done`, `llm:retry`, `llm:fallback`,
`llm:negotiated`, `llm:capability`, `llm:usage`, `llm:tool_call`, and the new
`llm:cache_hit`.

**Gotcha:** `LLMNode` returns a normalized object. `AgentEngine` expects raw
completion text from its LLM; use an adapter node that returns `execRes.text`
when composing them, as the examples in `examples/v2/` do.

---

## 8. Durable runs: the contract you build on

### What changed and why

`DurableFlow` still checkpoints every successful node and still resumes with
the same `runId`. 2.0 adds three more outcomes: a run can be **suspended** for
a human decision, **scheduled** for a future time, or **guarded by a flow
version**. Those states are persisted in SQLite, so they survive process
restarts and can be driven by an API or worker queue.

### 1-2-3 steps

1. Create one `SQLiteCheckpointer` per database file and share it across flow
   instances (including after a restart).
2. Start with `runDurable({ runId, shared })`; keep the returned `runId`.
3. Inspect `status` instead of assuming every call completes; resume or act on
   `suspended` / `scheduled`, and let real errors throw.

```js
import { DurableFlow, SQLiteCheckpointer } from '@fractal-solutions/qflow/durable';

const checkpointer = new SQLiteCheckpointer('./runs.db', {
  workerId: 'worker-1', // optional identity for side-effect leases
  leaseMs: 60_000,      // optional reservation lifetime
});
const flow = new DurableFlow(startNode, {
  checkpointer,
  name: 'checkout',
  version: '1.0.0',
});

const outcome = await flow.runDurable({ runId: 'order-1', shared: { orderId: 'ord-1' } });
if (outcome.status === 'suspended') {
  // a human decision is recorded in SQLite; see section 11
} else if (outcome.status === 'scheduled') {
  // a due time is stored; see section 12
}

// After a crash, or after an approval/decision:
await flow.runDurable({ runId: 'order-1', resume: true });
```

### `runDurable()` parameters

| Parameter | Type | Default | Meaning |
| --- | --- | --- | --- |
| `shared` | object | `{}` | Initial shared state; ignored on `resume` (saved state wins) |
| `runId` | `string` | random UUID | Stable run identity; you must keep it to resume |
| `resume` | `boolean` | `false` | Load saved state, check the version, and re-enter the waiting node |
| `signal` | `AbortSignal` | `undefined` | Checked at node boundaries; passed to nodes via the observer |
| `observer` | object | `{}` | Extra event handler(s); an existing `on*` handler is added automatically |

### `runDurable()` result

| Field | Type | Meaning |
| --- | --- | --- |
| `runId` | `string` | The run you passed or generated |
| `status` | `'completed' \| 'suspended' \| 'scheduled'` | Final persisted state; failures throw |
| `result` | any | Last node's exec result, or `null` when suspended/scheduled |
| `shared` | object | Current shared state, including decisions and recorded reservations |
| `steps` | `number` | Node visits committed so far |
| `resumed` | `boolean` | Whether this call used `resume: true` |
| `approvalId` / `dueAt` | `string` / `number` | Only on `suspended` / `scheduled` |

### Checkpointer methods you can call from outside a flow

| Method | Arguments | Returns | Use |
| --- | --- | --- | --- |
| `listRuns()` | none | `string[]` | Audit run IDs |
| `loadRun(runId)` | `string` | run record incl. `status`, `step`, `flowVersion`, `dueAt` | Inspect a run |
| `listCheckpoints(runId)` | `string` | checkpoint records | Debug or feed an eval suite |
| `listApprovals(runId, {status})` | `string`, options | approval records | Build a review queue |
| `listScheduledRuns({before})` | options | `{runId, flowName, flowVersion, dueAt, step}[]` | Find due runs to resume |
| `loadSideEffect(runId, operationId)` | strings | reservation record | Audit external calls |
| `exportRunTrace(runId, options)` | string, options | viewer-ready trace | Export to JSON |

**Gotcha:** `DurableFlow.runAsync(shared, observer)` still returns only the
last result. It starts a *new* durable run each time; use `runDurable()` when
the run id matters.

---

## 9. Side effects: replay and worker leases

### What changed and why

The original reservation rule was: completed effects replay, unfinished ones
are uncertain. That prevented a retry from charging twice, but two workers
could still race to *start* the same operation. 2.0 adds a lease and an
identity: reservation is now an atomic `INSERT OR IGNORE` that records which
worker owns the operation and when the claim expires. A second live worker gets
`QFLOW_SIDE_EFFECT_CLAIMED` instead of executing.

### 1-2-3 steps

1. Give every external effect a stable `operationId` template, for example
   `'{{orderId}}'`. It is prefixed with the kind at runtime: `charge:ord-1`.
2. Give each worker a distinct `workerId` (hostname, pod name, queue worker id)
   and choose a `leaseMs` longer than the effect's worst-case duration.
3. Treat `SideEffectUncertainError` as "requires human/operator decision",
   and `SideEffectClaimedError` as "someone else owns this right now".

```js
import { DurableFlow, SQLiteCheckpointer } from '@fractal-solutions/qflow/durable';
import { ReplaySafeNode, SideEffectClaimedError, SideEffectUncertainError } from '@fractal-solutions/qflow/side-effects';

const charge = new ReplaySafeNode({
  operationId: '{{orderId}}',
  kind: 'charge',
  execute: async ({ input }) => paymentApi.charge(input),
});

const checkpointer = new SQLiteCheckpointer('./runs.db', { workerId: 'worker-1', leaseMs: 60_000 });
const flow = new DurableFlow(charge, { checkpointer });
try {
  await flow.runDurable({ runId: 'order-charge-1', shared: { orderId: 'ord-1', input: { amount: 42 } } });
} catch (error) {
  if (error instanceof SideEffectClaimedError) {
    // Another worker has the lease; retry later or let it finish.
  } else if (error instanceof SideEffectUncertainError) {
    // The provider may have committed. Reconcile before retrying.
  } else {
    throw error;
  }
}
await flow.runDurable({ runId: 'order-charge-1', resume: true }); // replays the recorded result
```

### Options reference

| Option | Where | Type | Default | Meaning |
| --- | --- | --- | --- | --- |
| `operationId` | node params / constructor | `string` template, function, `true` | `true` | Stable key for one external call. `{{key}}` reads `shared`/`params`; `true` hashes params+shared. No `kind:` prefix in the template. |
| `kind` | constructor | `string` | `'side_effect'` | Namespace prefix and audit label |
| `onPending` | constructor / params | `'error' \| 'retry' \| 'return-null'` | `'error'` | What to do with an unfinished reservation. `retry` only applies to `failed` rows. |
| `workerId` | checkpointer, flow or node | `string` | generated per checkpointer | Owner written on the reservation |
| `leaseMs` | checkpointer, flow or node | `number` (ms) | `60_000` | How long the claim prevents another worker from taking over |
| `execute` | constructor | `async (args) => any` | required | The external call; called only when this worker owns the operation |

| Error | Code | Meaning | Safe response |
| --- | --- | --- | --- |
| `SideEffectClaimedError` | `QFLOW_SIDE_EFFECT_CLAIMED` | Another worker holds a live lease | Wait, or check whether it finished |
| `SideEffectUncertainError` | `QFLOW_SIDE_EFFECT_UNCERTAIN` | A reservation exists with no committed result and no live claim | Reconcile with the provider; never blindly retry |

**Gotcha:** if a worker dies mid-call, its reservation stays `pending` until
someone decides. After an operator confirms the effect did **not** happen, call
`checkpointer.failSideEffect(runId, operationId)` and retry with
`onPending: 'retry'`. That is an explicit decision, not an automatic one.

`HttpRequestNode`, `GitNode`, `WebHookNode` and `DatabaseNode` also accept
`operationId` templates and go through the same reservation path.

---

## 10. Flow versioning

### What changed and why

A resumed run can outlive the code that started it. Without a version check, a
changed graph can resume at a stale node index and silently skip work. 2.0
stores the flow version on the run and every checkpoint, then lets you choose
what a mismatch means.

### 1-2-3 steps

1. Set `version` on every `DurableFlow` that can be resumed (a semver string is
   a good convention).
2. Choose a policy: leave `abort` for strict environments, use `migrate` when
   you can transform `shared`, and reserve `ignore` for genuinely compatible
   changes.
3. On `migrate`, write a small pure function that returns the new `shared`.

```js
import { DurableFlow, FlowVersionMismatchError } from '@fractal-solutions/qflow/durable';

const flow = new DurableFlow(startNode, {
  checkpointer,
  version: '2.0.0',
  onVersionMismatch: 'migrate',
  migrate: ({ expected, actual, shared, checkpoints, runId }) => ({
    ...shared,
    customerTier: shared.plan ?? 'free', // old key → new key
  }),
});
await flow.runDurable({ runId: 'long-lived-run', resume: true });
```

| Option | Type | Default | Allowed values | Meaning |
| --- | --- | --- | --- | --- |
| `version` | `string` / `null` | `'1.0.0'` | Any stable identifier | Written to the run and checkpoints at start; compared on resume |
| `onVersionMismatch` | `string` | `'abort'` | `abort`, `migrate`, `ignore` | Policy when saved and current versions differ |
| `migrate` | `(context) => object \| null` | `null` | Pure function | Called only for `migrate`; returned object replaces `shared` |

Policy details:

| Policy | What happens | Use when |
| --- | --- | --- |
| `abort` | Throws `FlowVersionMismatchError` (`QFLOW_FLOW_VERSION_MISMATCH`) | Default; safest for money-moving flows |
| `migrate` | Calls `migrate()`, replaces `shared`, updates run + checkpoint versions, emits `flow:version_migrated` | You can transform state deterministically |
| `ignore` | Emits `flow:version_mismatch` with `policy: 'ignore'` and resumes | The change cannot affect in-flight runs |

**Gotcha:** if a saved node no longer exists, resume falls back to the saved
node *class name* and emits `flow:node_remapped`. Rename nodes deliberately;
check that event in tests when refactoring a graph.

---

## 11. Durable human approval

### What changed and why

The old `HumanApprovalNode` asked a model or a callback inside the same process.
That cannot survive a restart, let alone a review queue. `WaitForApprovalNode`
writes a pending approval to SQLite and lets `DurableFlow` return
`status: 'suspended'`. A UI or webhook calls `approve()` / `reject()` later, and
resume re-enters the same node to read the decision.

### 1-2-3 steps

1. Put `WaitForApprovalNode` in the graph and give it a stable `approvalId`
   template such as `'{{requestId}}'`.
2. Run durably; when `status === 'suspended'`, show the record from
   `checkpointer.listApprovals(runId, { status: 'pending' })` to a reviewer.
3. Call `approve(runId, decision, approvalId)` or `reject(...)`, then resume the
   same `runId`.

```js
import { DurableFlow, SQLiteCheckpointer, WaitForApprovalNode } from '@fractal-solutions/qflow/durable';

const gate = new WaitForApprovalNode({
  approvalId: '{{requestId}}',
  prompt: 'Approve refund?',
});
gate.next(shipRefund, 'approve');   // register both actions separately
gate.next(cancelRefund, 'reject');

const checkpointer = new SQLiteCheckpointer('./runs.db');
const flow = new DurableFlow(gate, { checkpointer, version: '1.0.0' });

const pending = await flow.runDurable({
  runId: 'refund-req-1',
  shared: { requestId: 'req-1' },
});
// pending.status === 'suspended', pending.approvalId === 'approval:req-1'

await checkpointer.approve('refund-req-1', { answer: 'yes', by: 'alice' }, 'approval:req-1');
const finished = await flow.runDurable({ runId: 'refund-req-1', resume: true });
// finished.shared.approval = { approved: true, answer: 'yes', by: 'alice', ... }
```

### `WaitForApprovalNode` options

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `approvalId` | `string` template, function, `true` | `true` | Stable decision key. Templates use `{{sharedKey}}` and are prefixed with `approval:`; functions receive `{params, shared, prompt}` and are used verbatim. |
| `prompt` | `string` | `null` | Question shown to the reviewer; `params.prompt` and `shared[promptKey]` also work |
| `promptKey` | `string` | `'approvalPrompt'` | Shared-state key to read the prompt from |
| `resultKey` | `string` | `'approval'` | Shared key for the decision object |
| `approvalsKey` | `string` | `'approvals'` | Shared key for the `approvalId → decision` map |
| `metadata` | JSON-serializable object | `null` | Stored on the approval record (UI hints, amount, links) |

### Checkpointer approval API

| Method | Returns | Meaning |
| --- | --- | --- |
| `requestApproval({runId, approvalId, prompt, metadata})` | approval record | Idempotent insert; existing records are returned unchanged |
| `getApproval(runId, approvalId)` | record / `null` | Fetch one decision |
| `listApprovals(runId, {status})` | records | `status`: `pending`, `approved`, `rejected` |
| `approve(runId, decision, approvalId?)` | record | Sets `status: 'approved'` and forces `decision.approved = true` unless explicitly `false` |
| `reject(runId, decision, approvalId?)` | record | Sets `status: 'rejected'` and `decision.approved = false` |

If `approvalId` is omitted on `approve`/`reject`, the **last pending** approval
for the run is used. With multiple gates, always pass the id.

Routing: with successors registered, the node takes `approve` unless
`approved === false` or `status === 'rejected'`, then `reject`. With no
successors it returns the decision object as the result.

Events: `approval:requested`, `approval:resolved`, `approval:pending` (on the
durable run). Error code on a direct node run: `QFLOW_APPROVAL_PENDING`.

**Gotcha:** this node needs a durable context. In a plain `AsyncFlow` it throws
because there is no `runId`/checkpointer — use `DurableFlow`, or the agent-level
`HumanApprovalNode` if you only need an in-process decision.

Full walkthrough: [durable human approval](documentation/tutorials/durable-approval.md).

---

## 12. Durable scheduling

### What changed and why

`SchedulerNode` starts a process timer and needs a live worker. That is fine for
short delays but not for "remind this customer in three days". `ScheduleNode`
persists a due time and suspends the run. Any worker can then query
`listScheduledRuns()` and resume the runs that are due.

### 1-2-3 steps

1. Add `ScheduleNode` with `at`, `delayMs` or `cron` and run durably.
2. Persist the `dueAt` returned by `runDurable`; a scheduler process polls
   `checkpointer.listScheduledRuns({ before: Date.now() })`.
3. Resume each due `runId` with `{ resume: true }`; the node re-checks the same
   stored due time and continues.

```js
import { DurableFlow, SQLiteCheckpointer, ScheduleNode, nextCronTime } from '@fractal-solutions/qflow/durable';

const wait = new ScheduleNode({ delayMs: 60_000 });
wait.next(sendReminder, 'due');
const flow = new DurableFlow(wait, { checkpointer });

const paused = await flow.runDurable({ runId: 'reminder-1', shared: {} });
// paused.status === 'scheduled', paused.dueAt === epoch ms

const due = checkpointer.listScheduledRuns({ before: Date.now() });
for (const run of due) {
  await flow.runDurable({ runId: run.runId, resume: true });
}

// Cron uses standard 5-field syntax, with no optional dependency:
const next = nextCronTime('0 3 * * *', new Date()); // next 03:00 local time
```

### `ScheduleNode` options

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `at` | `Date`, ISO `string`, epoch `number` | `null` | Absolute due time. Saved into `shared[dueAtKey]` on first run. |
| `delayMs` | `number` (ms) | `null` | Relative due time, computed once when the node first runs |
| `cron` | `string` | `null` | Five fields: `minute hour day month weekday` (e.g. `'0 3 * * *'`) |
| `scheduleId` | `string` | generated | Stable id for the schedule; also stored in `shared[scheduleIdKey]` |
| `dueAtKey` | `string` | `'scheduledAt'` | Shared key holding the persisted due time |
| `scheduleIdKey` | `string` | `'scheduleId'` | Shared key holding the schedule id |
| `resultKey` | `string` | `'scheduleResult'` | Shared key for `{scheduleId, dueAt, firedAt}` |

Resolution order: `params.at` → constructor `at` → saved `shared[dueAtKey]`,
then `delayMs`, then `cron`. `params.now` (Date or epoch ms) overrides the
clock, which is useful in tests.

Cron syntax supports `*`, lists (`1,15`), ranges (`9-17`) and steps (`*/15`).
Weekday accepts `0` or `7` for Sunday. If both day-of-month and weekday are
restricted, a date matches either. `nextCronTime()` returns epoch ms.

**Gotcha:** once a due time is saved it wins over a fresh `cron` calculation on
re-entry. To compute the next occurrence after a scheduled node fires, delete
`shared[dueAtKey]` before visiting the node again, or start a new run for the
next slot.

Events: `schedule:waiting`, `schedule:pending`. Error code:
`QFLOW_SCHEDULE_PENDING`. Full walkthrough:
[durable scheduling](documentation/tutorials/durable-scheduling.md).

---

## 13. Deterministic LLM replay and caching

### What changed and why

Model calls are the most expensive and least deterministic part of an agent
run. In a long-lived flow, replaying a checkpoint should not send the same
prompt again, and two workers should not pay twice for the same request. 2.0
adds a response cache with stable keys; a `llm:cache_hit` event makes replay
visible in traces.

### 1-2-3 steps

1. Add `cache: true` to `LLMNode` inside a `DurableFlow` (the checkpointer
   becomes the cache store automatically), or pass your own
   `{ get, set }` object.
2. Leave `cacheKey` unset for a hash of the request, or set a template such as
   `'{{tenant}}:{{prompt}}'` when you want humans to read/mutate keys.
3. Set `cacheTtlMs` when the prompt depends on changing data, and listen for
   `llm:cache_hit` in tests.

```js
import { AsyncFlow } from '@fractal-solutions/qflow';
import { LLMNode, LLM_CACHE_HIT_EVENT } from '@fractal-solutions/qflow/llm';

const llm = new LLMNode({
  provider: 'openai',
  model: 'gpt-4o-mini',
  cache: true,                       // or { get, set }
  cacheKey: '{{tenant}}:{{prompt}}', // optional; default is a request hash
  cacheTtlMs: 24 * 60 * 60 * 1000,   // optional; null means no expiry
});
const flow = new AsyncFlow(llm);
flow.on(LLM_CACHE_HIT_EVENT, ({ key }) => console.log('replayed', key));
await flow.runAsync({ prompt: 'Summarize this release.', tenant: 'acme' });
```

For a checkpointer-backed cache outside a flow, pass the checkpointer directly:

```js
llm.setParams({ checkpointer, cache: true });
```

### Options reference

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `cache` | `true`, `{ get(key), set(key, value, ttlMs) }`, `null` | `null` | `true` uses the checkpointer's `cacheGet`/`cacheSet` in the `llm` namespace |
| `cacheKey` | `string` template, function `({request, shared}) => string`, `null` | request hash | Hash covers provider, model, messages/prompt, tools, response format, temperature and max tokens. `operationId` is a fallback template. |
| `cacheTtlMs` | `number` / `null` | `null` | Lifetime in ms for checkpointer entries; `null` never expires, `<= 0` expires immediately |
| `budget` | `BudgetTracker` | `null` | Recorded after a real completion, not after a cache hit |

Checkpointer cache methods: `cacheGet(namespace, key)`,
`cacheSet(namespace, key, value, ttlMs)`, `clearCache(namespace?)`. The LLM
namespace is `'llm'`.

**Gotcha:** a cached result is returned *before* capability negotiation and
budget accounting. That is intentional (a replay costs nothing), but it means a
cache key must fully identify the prompt, model, tools and output format. If
any of those change, use a different key or clear the namespace.

Full walkthrough: [deterministic LLM replay](documentation/tutorials/llm-deterministic-cache.md).

---

## 14. Budget guardrails

### What changed and why

Agents can loop, escalate model size and quietly burn money. 2.0 provides a
`BudgetTracker` that accumulates real usage and a `BudgetNode` that turns a
limit into a graph edge (`continue` / `exceeded`) or a coded error.

### 1-2-3 steps

1. Create a `BudgetTracker` with cost, token, duration and step limits.
2. Pass it to `LLMNode` via `budget` so every real completion is recorded, and
   add a `BudgetNode` where you want a routing decision.
3. Wire `exceeded` to a safe fallback (smaller model, human review, or a
   refusal node).

```js
import { AsyncFlow } from '@fractal-solutions/qflow';
import { BudgetTracker, BudgetNode, BudgetExceededError } from '@fractal-solutions/qflow/budget';
import { LLMNode } from '@fractal-solutions/qflow/llm';

const budget = new BudgetTracker({
  maxCost: 0.50,       // USD
  maxTokens: 20_000,   // prompt + completion
  maxDurationMs: 60_000,
  maxSteps: 50,
});

const llm = new LLMNode({ provider: 'openai', model: 'gpt-4o-mini', budget });
const guard = new BudgetNode({ tracker: budget, maxCost: 0.50 });
guard.next(llm, 'continue');
guard.next(stopNode, 'exceeded');

const result = await new AsyncFlow(guard).runAsync({ prompt: 'Draft the plan.' });
// if a tracker check fails with throwOnExceed, error.code === 'QFLOW_BUDGET_EXCEEDED'
```

### `BudgetTracker` options and methods

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `maxCost` | `number` | `Infinity` | Spend ceiling in the currency used by your pricing function |
| `maxTokens` | `number` | `Infinity` | Total token ceiling |
| `maxDurationMs` | `number` | `Infinity` | Wall-clock ceiling from `startedAt` |
| `maxSteps` | `number` | `Infinity` | Step ceiling; `LLMNode` supplies `shared.agentFlowSteps` |
| `startedAt` | `Date`, epoch `number` | now | Start of the duration window |

| Method | Meaning |
| --- | --- |
| `record(usage, cost)` | Add one call's usage (`total`/`total_tokens`, else prompt+completion) and cost |
| `snapshot({steps, now})` | `{cost, tokens, calls, steps, durationMs}` |
| `check(context)` | Snapshot plus limits, `reasons[]` and `exceeded` |
| `assertWithin(context)` | Throws `BudgetExceededError` with `reasons` and `snapshot` |
| `reset({startedAt})` | Zero counters and restart the clock |

### `BudgetNode` options

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `maxCost`, `maxTokens`, `maxDurationMs`, `maxSteps` | `number` | `Infinity` | Limits; `params` and `shared[limitsKey]` can override them |
| `tracker` | `BudgetTracker` | `null` | Source of accumulated usage; without one the node reads `shared.llmCost` / `shared.llmUsage` |
| `limitsKey` | `string` | `'budget'` | Shared key holding a limits object |
| `outputKey` | `string` | `'budget'` | Shared key for the check result |
| `throwOnExceed` | `boolean` | `false` | Throw `BudgetExceededError` instead of routing to `exceeded` |

Events: `budget:check` (every check), `budget:exceeded` (only when crossed).
Full walkthrough: [budget guardrails](documentation/tutorials/budget-guardrails.md).

---

## 15. Multi-tenant memory

### What changed and why

`MemoryNode` is a keyword store tied to one local file. 2.0 adds a store
interface with two implementations and a node wrapper, so each tenant,
project or agent run can own a store while the flow code stays identical.

### 1-2-3 steps

1. Create one store per tenant: `new SQLiteMemoryStore('./tenant-acme.db')`
   for persistence, or `new InMemoryMemoryStore()` for tests.
2. Put the store in `shared.memoryStore` (or pass it to the node constructor)
   and use `MemoryStoreNode` with `operation: 'add'` / `'search'`.
3. Dispose of SQLite stores with `close()` when a tenant is removed.

```js
import { AsyncFlow } from '@fractal-solutions/qflow';
import { InMemoryMemoryStore, MemoryStoreNode } from '@fractal-solutions/qflow/memory';

const store = new InMemoryMemoryStore();
const add = new MemoryStoreNode({ operation: 'add' });
await new AsyncFlow(add).runAsync({
  memoryStore: store,
  memoryInput: { text: 'Refunds over $500 need approval', tags: ['policy'] },
});

const search = new MemoryStoreNode({ operation: 'search', limit: 3 });
const hits = await new AsyncFlow(search).runAsync({
  memoryStore: store,
  memoryInput: { query: 'refund approval', tags: ['policy'] },
});
// hits: [{ id, text, tags, metadata, createdAt, score }, ...]
```

### Store API

| Method | Arguments | Returns | Meaning |
| --- | --- | --- | --- |
| `add` | `{id?, text, tags?, metadata?}` | record | Upsert by id; `text` is required |
| `search` | `query, {limit?, tags?}` | scored records | Lexical overlap + tag bonus; higher score first |
| `get` | `id` | record / `null` | Fetch by id |
| `delete` | `id` | `boolean` | Remove by id |
| `list` | none | records | All records, oldest first |
| `clear` | none | `number` | Remove all and return the count |

`SQLiteMemoryStore(filename = ':memory:')` also has `close()`.
`InMemoryMemoryStore` is process-local and intentionally disposable.

### `MemoryStoreNode` options

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `store` | `MemoryStore` | `null` | Explicit store; otherwise `shared.memoryStore`, or a new store is created and saved there |
| `operation` | `string` | `'add'` | `add`, `search`, `get`, `delete`, `list`, `clear` |
| `inputKey` | `string` | `'memoryInput'` | Shared key for the operation payload |
| `outputKey` | `string` | `'memoryResult'` | Shared key for the result |
| `storeKey` | `string` | `'memoryStore'` | Shared key used to find/create the store |
| `database` | `string` | `null` | If set, a new store uses `SQLiteMemoryStore(database)` |
| `limit` | `number` | `5` | Default search result limit |

A string payload is treated as `{ text: payload }`. Search reads
`query ?? text ?? ''`. Events: `memory:add` (`{id}`), `memory:search`
(`{count}`). Full walkthrough: [multi-tenant memory](documentation/tutorials/multi-tenant-memory.md).

---

## 16. Optional dependencies

### What changed and why

Heavy packages (Playwright, webview-bun, xlsx, serialport, ssh2, simple-git,
ws, cheerio, ajv, node-cron, …) moved from `dependencies` to
`optionalDependencies`. Nothing loads them until the specific node action runs.
Importing the catalog is now cheap and CI no longer needs a browser to install.

### 1-2-3 steps

1. Install only the integrations you use:

   ```bash
   bun add --optional playwright
   bun add --optional webview-bun
   bun add --optional xlsx
   ```

2. Keep those declarations in `package.json` so lockfiles and CI stay stable.
3. If a node throws `QFLOW_OPTIONAL_DEPENDENCY_MISSING`, run the exact command
   printed in the error message.

`loadOptional(name)` in `@fractal-solutions/qflow/optional` is the guarded
loader. It throws an actionable error instead of a bare module-not-found. Use
`OPTIONAL_DEPENDENCIES` to see the full package map.

---

## 17. Traces and evaluation

### What changed and why

`recordFlow()` used to produce a testing-specific shape. 2.0 normalizes flow
snapshots, recorded events and durable-run checkpoints into one trace format,
which is also what the browser viewer at `#trace` consumes and what the eval
nodes compare. One contract means a production trace can become a regression
test without translation.

### 1-2-3 steps

1. Record events while the flow runs (there is no `observer` property on the
   recorder; pass `recorder.events` when exporting).
2. Write the trace JSON with Bun; the viewer is browser-only, so paste or
   upload the file there.
3. Feed the same JSON to `ReplayNode` / `createEvalSuite()` in CI.

```js
import { recordFlow } from '@fractal-solutions/qflow/testing';
import { writeTraceFile, normalizeTrace } from '@fractal-solutions/qflow/trace';
import { DurableFlow, createRunTrace } from '@fractal-solutions/qflow/durable';

const recorder = recordFlow(flow);
await flow.runAsync(shared);
await writeTraceFile(recorder.events, './trace.json');

// Durable runs already have checkpoints:
const trace = createRunTrace(checkpointer, runId, {
  events: recorder.events,
  includeState: true, // optional; includes shared/params/execRes per checkpoint
});
await writeTraceFile(trace, './durable-trace.json');
```

| Function | Input | Output | Meaning |
| --- | --- | --- | --- |
| `normalizeTrace(value)` | recorded events or run record | normalized trace | One shape for viewer and eval |
| `writeTraceFile(value, path)` | trace/events, file path | `Promise<string>` | JSON written via Bun |
| `createRunTrace(checkpointer, runId, options)` | checkpointer, id, options | normalized trace | Rebuilds a trace from persisted rows |
| `compareTraces(a, b)` | two traces | diff result | Ignores volatile ids/timings/stacks by default |

`AssertNode`, `ScoreNode`, `CompareNode` and `ReplayNode` live in `/eval`;
events are `eval:assert`, `eval:score`, `eval:compare`, `eval:replay`.

---

## 18. Other 2.0 node families

These arrived in canary.3 and remain additive. Full examples are in
[`examples/v2/`](examples/v2/README.md) and the
[tutorial index](documentation/tutorials/README.md).

| Family | Import | What it gives you |
| --- | --- | --- |
| Provider-neutral LLM | `/llm` | Adapters, capabilities, retries, fallbacks, usage/cost |
| Tool specs | `/tool-spec` | One tool definition for agents, MCP, LLM schemas and docs |
| Replay-safe effects | `/side-effects` | Reservations and replay with coded errors and leases |
| Dataflow | `/graph`, `/contracts` | Map/reduce/join/branch/cycle with state validation |
| Agent control | `/agent` | Plan/critic/reflect/finish/approval as nodes; `asFlow()` |
| Evaluation | `/eval` | Assert/score/compare/replay against normalized traces |
| Bun-native | `/bun` | Process, SQLite, file-watch and Web Stream nodes |

---

## 19. Migration checklist

Print this, work top to bottom, and tick only what you have actually verified:

- [ ] All scripts, tests and deploys run with `bun`, not `node`/`npm`.
- [ ] No imports from `src/`, `dist/` or another package deep path.
- [ ] Async lifecycle methods either ignore `observer` or use `observer.emit?.()`.
- [ ] Loops have `maxSteps`; slow I/O has a `timeout`; recovery has `onError`.
- [ ] Agents use a registered strategy id; custom patterns are registered, not subclassed.
- [ ] Every durable flow has a `version` and an explicit mismatch policy.
- [ ] Every durable run has a caller-owned `runId` and code that checks `status`.
- [ ] Every external side effect has a stable `operationId` and each worker a `workerId`.
- [ ] Approval flows have a reviewer path (`listApprovals` → `approve`/`reject` → resume).
- [ ] Scheduled flows have a poller (`listScheduledRuns` → resume) or an external trigger.
- [ ] Expensive LLM calls use `cache` and a `BudgetTracker`.
- [ ] Tenant data uses separate memory stores and stores are closed when removed.
- [ ] Optional packages are installed explicitly and pinned in the lockfile.
- [ ] A trace can be exported, viewed at `#trace`, and replayed in a test.
- [ ] `bun test tests`, `bun run build` and `bun run examples:v2` are green.

---

## 20. Error-code reference

| Code | Class | Meaning |
| --- | --- | --- |
| `QFLOW_OPTIONAL_DEPENDENCY_MISSING` | — | An optional integration package is not installed |
| `QFLOW_SIDE_EFFECT_UNCERTAIN` | `SideEffectUncertainError` | Reservation exists with no committed result |
| `QFLOW_SIDE_EFFECT_CLAIMED` | `SideEffectClaimedError` | Another worker holds a live lease |
| `QFLOW_APPROVAL_PENDING` | `ApprovalPendingError` | Approval node needs a decision |
| `QFLOW_SCHEDULE_PENDING` | `SchedulePendingError` | Schedule node is not due yet |
| `QFLOW_FLOW_VERSION_MISMATCH` | `FlowVersionMismatchError` | Resume targets a different flow version |
| `QFLOW_BUDGET_EXCEEDED` | `BudgetExceededError` | A cost/token/duration/step limit was crossed |
| `QFLOW_LLM_CAPABILITY_MISSING` | `Error` with code requested capability is unsupported |

---

## 21. Troubleshooting

**"My durable run says `suspended` and never continues."**
That is the approval contract. List pending approvals, record a decision, then
resume the *same* `runId`. Do not start a new run.

**"My scheduled run resumes but fires immediately."**
The stored due time wins over a new `cron` value. Delete `shared[dueAtKey]` if
you meant to schedule the next slot.

**"Two workers both tried to charge."**
Give each worker a distinct `workerId` and make sure `leaseMs` exceeds the
effect duration. The second worker should receive `QFLOW_SIDE_EFFECT_CLAIMED`.

**"Resume threw `QFLOW_FLOW_VERSION_MISMATCH`."**
Either deploy the previous version, or set `onVersionMismatch: 'migrate'` with a
pure migration function. `ignore` is only safe if the change cannot touch
in-flight state.

**"An LLM replay hit an old prompt."**
Cache keys are your responsibility when you use a template. Include every
input that changes the answer (tenant, prompt, model, tool set) or clear the
`llm` cache namespace.

**"Budget checks never fire."**
`BudgetNode` reads `shared.llmCost` / `shared.llmUsage` unless you pass a
`tracker`. Pass the same tracker to `LLMNode` and to the node, and check that
your pricing function actually returns a cost.

**"Memory search returns nothing."**
Search is lexical, not semantic: it filters by token overlap and tag bonus. Use
words present in the stored text, or use `SemanticMemoryNode` (requires Ollama)
for meaning-based recall.

---

## License

qflow 2.0 is MIT licensed, matching `package.json` and npm metadata.
