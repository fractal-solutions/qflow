# qflow 2.0 — Canary Roadmap

Branch: `canary/2.0` (from `main` @ `1.0.84`)

## Agreed direction

| Decision | Choice |
| --- | --- |
| Runtime contract | **Bun-only, done properly.** Lean into `bun:sqlite`, `Bun.spawn`, Bun-native SQLite. No Node portability work. |
| API compatibility | Breaking changes allowed in 2.0, with a migration guide. |
| Priority | **New features and growth first.** Foundational debt is fixed only where it blocks shipping a feature. |
| Package layout | One package (`@fractal-solutions/qflow`) with subpath exports and lazy boundaries. |
| License | **MIT** — owner confirmed; `LICENSE`, `package.json`, npm metadata and README now agree. |

## Product thesis

qflow's differentiator is breadth of integrations plus usable agent patterns. 2.0 should turn that from a collection of examples into a **platform**: durable agent runs, standard tool interoperability, and one agent engine that can grow new reasoning patterns cheaply.

## Growth tracks (in order)

### Track 1 — MCP bridge *(done)*
- [x] Canary branch created
- [x] `QFlowMCPServer`: expose every registered qflow node as an MCP tool over stdio (`initialize`, `tools/list`, `tools/call`).
- [x] `MCPClientNode`: let qflow agents call external MCP servers via `Bun.spawn`.
- [x] Fix tool registry: missing `AsyncNode` import, Windows dynamic import, consumer `qflow.config.js` resolution.
- [x] Export `./mcp` subpath, add tests and docs.

### Track 2 — One agent engine *(done)*
- [x] `src/agent/engine.js`: one `AgentEngine` containing the loop, tool execution, history management, finish confirmation and response parsing.
- [x] `src/agent/strategies.js`: declarative `default` / `raor` / `ooda` / `lpavrl` / `pema` phase definitions; `getStrategy()` and `listStrategies()`.
- [x] Legacy classes (`AgentNode`, `BaseAgent`, and the four pattern agents) are thin subclasses that select a strategy — existing imports keep working.
- [x] New options-object constructor: `new AgentNode({ llmNode, availableTools, strategy: 'raor', ... })`.
- [x] Added `./agent` subpath export and `src/agent/index.js`.
- [x] Fixed the missing `SummarizeNode` import, custom-tool validation, and the five node files that imported `nodes/index.js` (circular dependency).
- [x] Tests cover all five strategies end to end with a scripted LLM.
- [x] Streaming LLM output as flow events.

**Migration note:** the positional constructor still works. Prefer the options object for new code; reasoning patterns are now data, so a custom pattern can be added with `agentStrategies.myPattern = {...}` and `strategy: 'myPattern'` instead of a new class.

### Track 2b — Streaming events *(done)*
- [x] `AsyncNode.execAsync(prepRes, shared, observer)` now receives the flow observer, so any node can emit custom events via `observer.emit(name, payload)`.
- [x] `AsyncFlow.onAny()` / `on('*')` subscribes to every event; nested flow events are forwarded with `nested: true` and `parentFlowId`.
- [x] `@fractal-solutions/qflow/streaming` exports `streamChatCompletions()` and the `llm:delta` / `llm:reasoning` / `llm:done` event names.
- [x] `StreamingLLMNode` and `AgentStreamingLLMNode` stream OpenAI-compatible providers (OpenAI, DeepSeek, OpenRouter, Hugging Face router) and return the same final string as their non-streaming counterparts.
- [x] `AgentEngine` forwards its observer to the LLM node, so agent token deltas surface on the outer flow.

**Usage:** `flow.on('llm:delta', ({ delta, text }) => process.stdout.write(delta))`. LLM nodes can be called directly as `node.runAsync(shared, observer)` when outside a flow.

**Durable usage:** `const { runId } = await flow.runDurable({ shared })`; later, `await flow.runDurable({ runId, resume: true })`. The checkpointer can be shared across flow instances, so resume works after a process restart.

### Track 3 — Durable execution (Bun-native) *(first slice done)*
- [x] `SQLiteCheckpointer`: `bun:sqlite` store for runs and per-node checkpoints (`shared`, params, action, cursor).
- [x] `DurableFlow`: run IDs, a checkpoint after every successful node, `runDurable()` with `resume: true`, and `runAsync()` compatibility.
- [x] Failed runs keep their last committed cursor so a later process can resume without replaying completed nodes.
- [x] `AbortSignal` is checked at node boundaries and exposed to nodes via the observer.
- [x] `listRuns()` / `listCheckpoints()` provide replay/debugging data; run/checkpoint events flow through the normal observer channel.
- [x] New `./durable` subpath export and tests covering completion, resume, cancellation and return shapes.
- [x] `exportRunTrace()` / `createRunTrace()` produce JSON-safe run traces with checkpoints.
- [x] `./trace` normalizes `recordFlow()`, snapshot, and durable-run shapes into one viewer format.

### Track 4 — Graph semantics, DX & trace viewer *(done)*
- [x] Fan-out/fan-in (`./graph`), error edges (`onError`), guarded loops (`maxSteps`) and `timeout` on `Flow` / `AsyncFlow`.
- [x] `@fractal-solutions/qflow/testing`: `MockNode`, `MockLLMNode`, `recordFlow()` and deterministic trace snapshots.
- [x] `site/#trace`: paste/upload/filter/download traces, view node spans, token deltas, checkpoints, and payloads.
- [x] Heavy integrations are opt-in with guarded dynamic imports and actionable install errors.

## Node innovation *(done in 2.0.0-canary.3)*

Nodes now understand they are part of an agent run, not just wrappers around APIs. Implemented in the order below; the full chain compounds: tracing makes agents debuggable, checkpoints make them safe, and shared tool specs make them portable.

1. **Provider-neutral LLM node** *(done)*
   - [x] One `LLMNode` with an adapter registry (`openai` + OpenAI-compatible providers, `anthropic`, `ollama`, `gemini`) in `src/llm/` and the `./llm` export.
   - [x] Capability negotiation for streaming, tool calls, structured output, reasoning and usage; normalized `usage` / `cost` accounting.
   - [x] Provider failures emit `llm:retry` / `llm:fallback` events; `llm:negotiated`, `llm:capability`, `llm:usage` and `llm:tool_call` make runs observable.

2. **Reusable `ToolSpec` layer** *(done)*
   - [x] `ToolSpec` + `toolSpecFromNode()` promote `getToolDefinition()` to a spec with permissions, idempotency keys, timeouts, dry-run and side-effect hints (`./tool-spec`).
   - [x] The same spec powers agent prompts, MCP `tools/list` / `tools/call`, LLM tool schemas and generated Markdown docs.
   - [x] `ToolRegistry` adds namespaces, capability/permission grants, validation and an idempotency store.

3. **Agent-native control nodes** *(done)*
   - [x] First-class `PlanNode`, `CriticNode`, `ReflectNode`, `FinishNode` and `HumanApprovalNode` in `src/agent/control_nodes.js`.
   - [x] `AgentEngine.asFlow()` / `buildAgentFlow()` turn declarative strategies into checkpointable, traceable `AsyncFlow`s with one node per phase.
   - [x] `strategyGraph()` and `describeGraph()` expose JSON nodes/edges for visual authoring.

4. **Replay-safe side-effect nodes** *(done)*
   - [x] `withReplaySafeSideEffect()` and `ReplaySafeNode` reserve an operation before execution via a new SQLite `qflow_side_effects` table.
   - [x] `HttpRequestNode`, `GitNode`, `WebHookNode` and `DatabaseNode` accept `operationId` templates; completed effects replay their recorded result.
   - [x] Reserved-but-unfinished effects raise `SideEffectUncertainError` / `QFLOW_SIDE_EFFECT_UNCERTAIN` instead of re-running.
   - [x] Resume now retries from the start node when a run failed before its first checkpoint.

5. **Dataflow and graph nodes** *(done)*
   - [x] `MapNode`, `ReduceNode`, `JoinNode`, `BranchNode` and `CycleNode` with contract validation and explicit iteration/item budgets.
   - [x] `StateContract` / `defineState()` (`./contracts`) validate shared state at node boundaries; `describeGraph()` supports visual authoring.

6. **Evaluation and testing nodes** *(done)*
   - [x] `AssertNode`, `ScoreNode`, `CompareNode` and `ReplayNode` (`./eval`) turn normalized traces into regression suites.
   - [x] `compareTraces()` / `deepDiff()` ignore volatile IDs, timings and stack traces; `createEvalSuite()` runs cases against a flow.
   - [x] Replay pairs with the site viewer's JSON traces: select a trace, replay it against a new flow, diff the spans and payloads.

7. **Bun-native performance nodes** *(done)*
   - [x] `BunSpawnNode`, `SQLiteQueryNode`, `FileWatchNode` and Web Stream transform nodes in `src/bun_nodes.js` (`./bun`).
   - [x] Built on `Bun.spawn`, `bun:sqlite` and `Bun.watch` with no optional native dependencies.

## Shipping floor (kept deliberately small)

- [x] `type: module`, export map including `/mcp`, `/agent`, `/streaming`, `/durable`, `/trace`, `/optional`, `/logger`, `/llm`, `/tool-spec`, `/contracts`, `/side-effects`, `/eval` and `/bun`; pinned toolchain + lockfile.
- [x] Real tests under `tests/`; keep `examples/*_test.js` demos out of test discovery.
- [x] CI: typecheck + tests on Bun (`.github/workflows/ci.yml`).
- [x] Resolve license mismatch; CHANGELOG + migration guide.

## Explicitly deferred

Node portability, `docs/` cleanup, site build-system overhaul, and the security/capability audit are tracked but not on the critical path for the first 2.0 canary.
