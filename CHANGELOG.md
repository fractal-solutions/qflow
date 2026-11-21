# Changelog

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
