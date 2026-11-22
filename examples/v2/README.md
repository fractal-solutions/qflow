# qflow 2.0 end-to-end examples

These are deliberately not API tours. Each example starts from a problem you actually have in production and shows which 2.0 node family exists to solve it. They run offline with `bun`, use temporary files, and clean up after themselves.

```bash
bun examples/v2/run-all.js
# or one at a time:
bun examples/v2/replay-safe-checkout.js
```

> These in-repo examples import from `../../src` so they work in a fresh checkout. Package consumers use the matching subpaths: `@fractal-solutions/qflow/durable`, `/llm`, `/tool-spec`, `/agent`, `/eval`, `/graph`, `/contracts`, `/bun`, etc.

| Example | The problem | What it demonstrates |
| --- | --- | --- |
| [`replay-safe-checkout.js`](replay-safe-checkout.js) | A retry after a payment must not charge twice. | `DurableFlow` + `ReplaySafeNode`, `operationId` templates, SQLite reservations, replay after a post-commit crash, and `SideEffectUncertainError` when a reservation has no recorded result. |
| [`unified-tool-contract.js`](unified-tool-contract.js) | The same tool gets described differently in the agent, MCP server, LLM schema and docs. | One `ToolSpec` feeding `ToolRegistry`, `AgentEngine.asFlow()`, `QFlowMCPServer`, `llmTools()` and `generateToolDocs()`; capability grants, idempotency, and `toolSpecFromNode()` for legacy nodes. |
| [`dataflow-eval-regression.js`](dataflow-eval-regression.js) | A graph changes behavior and nobody notices until production. | `StateContract`, `MapNode`/`ReduceNode`/`BranchNode`, `describeGraph()`, trace export, `ReplayNode`, `AssertNode`, `ScoreNode` and `createEvalSuite()`. |
| [`bun-stream-ingest.js`](bun-stream-ingest.js) | Local ingest pipelines shouldn't need a pile of optional native dependencies. | `BunSpawnNode`, `StreamMapNode`/`StreamFilterNode`/`StreamReduceNode`, `SQLiteQueryNode`, `FileWatchNode` and `file:change` events. |

## What to look for

- **Replay-safe checkout** prints two gateway counters after a simulated crash. They stay at 1 charge / 1 email even though the node runs again. The second scenario leaves a `pending` row and shows qflow refusing to guess.
- **Unified tool contract** prints the same three tools from MCP, LLM schemas and docs, then shows a read-only registry hiding the write tool and an idempotent save returning `replayed` on the second call.
- **Dataflow regression** rejects an invalid contract, prints the graph, replays a saved JSON trace against a new flow with zero behavioral diffs, and runs a two-case suite.
- **Bun ingest** processes child-process output through Web Streams, aggregates it in SQLite, and reacts to a real file write.
