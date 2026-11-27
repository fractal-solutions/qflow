# Changelog

## Unreleased

### Fixed
- Heavy integration packages are opt-in optional peer dependencies instead of `optionalDependencies`; a plain install no longer pulls Playwright, serialport, webview-bun, and the other integration packages.
- Updated the website to qflow 2.0.0 stable: Bun-only install, public subpath imports, new node families, durable/agent/MCP/LLM/budget/approval/schedule/memory docs, and corrected 2.0 API examples.
- Added package metadata and clean-consumer install regression checks for optional integrations.

Publishing this fix requires a new version; the npm `latest` tag remains `2.0.0` until then.

## 2.0.0

Stable promotion of `2.0.0-canary.4`. No source changes from the final canary;
the same package is now published as `latest`.

### Changed
- Version bumped to `2.0.0`; the npm `latest` dist-tag now points here.
- README and MIGRATION.md describe the stable install path. The `canary` dist-tag still points to `2.0.0-canary.4`.
- MCP client/server metadata now reports `2.0.0`.

See [2.0.0-canary.4](#200-canary4) below for the full feature list.

## 2.0.0-canary.4

Six production gaps closed. Every item below is additive; no existing import
changes. See [MIGRATION.md](MIGRATION.md) and the
[tutorial index](documentation/tutorials/README.md) for step-by-step guides with
option and error-code tables.

### Added
- **Durable human approval** (`./approval`): `WaitForApprovalNode` and `resolveApprovalId()`; `DurableFlow` returns `status: 'suspended'` and checkpointer `approve()` / `reject()` record decisions for resumable runs. Events: `approval:requested`, `approval:resolved`, `approval:pending`; error `QFLOW_APPROVAL_PENDING`.
- **Durable scheduling** (`./schedule`): `ScheduleNode` with `at` / `delayMs` / `cron`, a dependency-free `nextCronTime()`, `listScheduledRuns()` / `setRunDueAt()` and `status: 'scheduled'`. Events: `schedule:waiting`, `schedule:pending`; error `QFLOW_SCHEDULE_PENDING`.
- **Deterministic LLM replay**: `LLMNode` cache support (`cache`, `cacheKey`, `cacheTtlMs`), checkpointer-backed `cacheGet` / `cacheSet` / `clearCache`, and the `llm:cache_hit` event.
- **Budget guardrails** (`./budget`): `BudgetTracker`, `BudgetNode` and `BudgetExceededError` (`QFLOW_BUDGET_EXCEEDED`), with `budget:check` / `budget:exceeded` events and `continue` / `exceeded` routing.
- **Unified memory** (`./memory`): `MemoryStore`, `InMemoryMemoryStore`, `SQLiteMemoryStore` and `MemoryStoreNode` with add/search/get/delete/list/clear operations and `memory:add` / `memory:search` events.
- **Flow versioning**: `DurableFlow` `version`, `onVersionMismatch` (`abort` / `migrate` / `ignore`) and `migrate` callback; `FlowVersionMismatchError` (`QFLOW_FLOW_VERSION_MISMATCH`) plus `flow:version_migrated`, `flow:version_mismatch` and `flow:node_remapped` events.
- **Side-effect worker leases**: `workerId` / `leaseMs` on checkpointer, flow and replay-safe nodes; atomic `INSERT OR IGNORE` reservations, `failSideEffect()` and `SideEffectClaimedError` (`QFLOW_SIDE_EFFECT_CLAIMED`).
- New subpath exports: `./approval`, `./schedule`, `./budget`, `./memory`; durable helpers and errors are re-exported from `/durable`, and all new nodes from `/nodes`.
- Tutorial index plus five new tutorials: approval, scheduling, LLM replay, budget guardrails and multi-tenant memory.

### Changed
- `runDurable()` now returns `status` (`completed`, `suspended`, `scheduled`) in addition to `{runId, result, shared, steps, resumed}`; ordinary failures still throw.
- `SQLiteCheckpointer` constructor accepts `{workerId, leaseMs}` and migrates older databases by adding the new columns.
- `DurableFlow` re-enters a waiting node on resume and reads recorded approval/schedule state from `shared` and SQLite.
- `ReplaySafeNode` and `withReplaySafeSideEffect()` accept `workerId` / `leaseMs`.
- Version bumped to `2.0.0-canary.4`.

### Fixed
- An expired or competing side-effect reservation can no longer be reset by another worker's upsert.
- Stale resume cursors fall back to the saved node class name instead of silently starting over.
- `MIGRATION.md` expanded into a guided reference; README now maps every production gap to 1-2-3 steps and links to the tutorials.

### Tests
- 18 new tests across `tests/durable_gaps.test.js` and `tests/node_gaps.test.js`; full suite: 92 passing tests across 18 files.

## 2.0.0-canary.3

### Added
- Provider-neutral `LLMNode` (`./llm`): adapter registry for OpenAI-compatible providers, Anthropic, Ollama and Gemini, capability negotiation, streaming, tool calls, retries/fallbacks, token/cost accounting and `llm:*` events.
- `ToolSpec` / `ToolRegistry` (`./tool-spec`): one portable definition for agent tools, MCP tools, LLM schemas and generated docs, with namespaces, capability/permission grants, dry-run, timeouts and idempotency caching.
- Replay-safe side effects (`./side-effects`): `ReplaySafeNode`, `withReplaySafeSideEffect()` and `SideEffectUncertainError`; SQLite `qflow_side_effects` reservations on `DurableFlow`.
- Opt-in `operationId` support on `HttpRequestNode`, `GitNode`, `WebHookNode` and `DatabaseNode` so completed effects replay instead of re-running.
- Dataflow nodes in `./graph`: `MapNode`, `ReduceNode`, `JoinNode`, `BranchNode`, `CycleNode` and `describeGraph()`; `./contracts` adds `StateContract` / `defineState()` validation.
- Agent-native nodes (`./agent`): `PlanNode`, `CriticNode`, `ReflectNode`, `FinishNode`, `HumanApprovalNode`, plus `AgentEngine.asFlow()` and `strategyGraph()`.
- Evaluation nodes (`./eval`): `AssertNode`, `ScoreNode`, `CompareNode`, `ReplayNode`, `compareTraces()`, `deepDiff()` and `createEvalSuite()`.
- Bun-native nodes (`./bun`): `BunSpawnNode`, `SQLiteQueryNode`, `FileWatchNode`, `StreamTransformNode`, `StreamMapNode`, `StreamFilterNode` and `StreamReduceNode`.
- New subpath exports: `./llm`, `./tool-spec`, `./contracts`, `./side-effects`, `./eval`, `./bun`; new node families are also re-exported from `./nodes` / `./agent`.
- Tests for every new family; the suite now has 74 passing tests.
- Four offline end-to-end examples in `examples/v2/` (with `bun run examples:v2`) showing replay-safe checkout, one tool spec across agent/MCP/docs, dataflow trace replay, and Bun-native ingest.

### Changed
- `AgentEngine` accepts `toolRegistry`, `grantedCapabilities` and `grantedPermissions`, and shares one `initialize()` path with `asFlow()`.
- `QFlowMCPServer` can be constructed with `{ toolRegistry }` and call tools through the registry execute path.
- `ReplayNode` compares status/events/spans by default; saved checkpoints are treated as input metadata, not replay output.
- Version bumped to `2.0.0-canary.3`.

### Fixed
- `StateContract` no longer shadows its own `validate()` method when a custom validator is supplied.
- `ToolRegistry.allowed()` accepts capability/permission arrays as well as sets.
- `DurableFlow` retries from the start node when a run failed before its first checkpoint, and persists object-valued node actions as JSON.
- `AgentFlowFinishNode` now returns the flow's final output instead of an empty string.

## 2.0.0-canary.2

### Added
- Site trace viewer at `#trace`: paste, upload, filter, inspect, and download flow/durable-run traces.
- `./trace` export: `normalizeTrace()`, `buildTraceSpans()`, `serializeTrace()` and `writeTraceFile()`.
- `SQLiteCheckpointer.exportRunTrace()` / `createRunTrace()` for viewer-friendly durable traces.
- `./optional` export exposing the optional dependency map and `loadOptional()`.
- `./logger` export, matching the documented per-node logging API.

### Changed
- Heavy integration packages are now `optionalDependencies` and load only when their node action runs.
- Missing optional packages throw `QFLOW_OPTIONAL_DEPENDENCY_MISSING` with an exact `bun add --optional ...` command.
- README examples and 2.0 export documentation were updated; Bun-only installation is now explicit.

### Fixed
- `Flow.run()` test example asserted the wrong return value.
- Per-node logging with `type: 'none'` now actually disables output.
- Logger module uses ESM imports instead of `require()`.

## 2.0.0-canary.1

### Added
- MCP bridge: `QFlowMCPServer`, `MCPClientNode`, `qflow-mcp` stdio binary, and the `./mcp` export.
- Unified agent engine with declarative `default`, `raor`, `ooda`, `lpavrl`, and `pema` strategies plus the `./agent` export.
- First-class flow events: nodes receive an observer, flows support `onAny()`, nested events are forwarded.
- Streaming LLM support: `streamChatCompletions()`, `StreamingLLMNode`, `AgentStreamingLLMNode`, and `llm:*` events under `./streaming`.
- Bun-native durable execution: `SQLiteCheckpointer`, `DurableFlow`, resume-after-failure, run/checkpoint history, and `AbortSignal` cancellation under `./durable`.
- Testing utilities under `./testing`: `MockNode`, `MockLLMNode`, `recordFlow()` and deterministic trace snapshots.
- Graph semantics: `FanOutNode` / `FanInNode` under `./graph`, plus `maxSteps`, `timeout` and `onError` flow options.
- Migration guide for 2.0.

### Changed
- Async lifecycle methods accept an optional observer as their final argument.
- `AgentEngine` forwards the flow observer to its LLM node, so streamed agent output reaches the outer flow.
- Bumped version to `2.0.0-canary.1`.
- Replaced the stale LGPL-2.1 `LICENSE` with MIT.

### Fixed
- Missing `SummarizeNode` imports and custom-tool validation in the agent engine.
- Circular imports caused by five nodes importing `nodes/index.js`.
- Tool registry imports and consumer config resolution used by the MCP bridge.

## 1.0.84

Previous 1.x release.
