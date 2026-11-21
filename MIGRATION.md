# Migrating to qflow 2.0

qflow 2.0 is Bun-only. Existing `Node`, `Flow`, `AsyncNode`, `AsyncFlow`, and built-in node imports keep working; most changes are additive.

## Runtime

```bash
bun add @fractal-solutions/qflow
bun test tests
bun run build
```

Node.js is no longer a supported runtime. 2.0 uses Bun APIs directly (`Bun.spawn`, `bun:sqlite`, Bun's streaming `fetch`).

## New subpath exports

| Import | Contents |
| --- | --- |
| `@fractal-solutions/qflow` | Core node and flow classes |
| `@fractal-solutions/qflow/nodes` | Built-in nodes, including `StreamingLLMNode` and `AgentStreamingLLMNode` |
| `@fractal-solutions/qflow/agent` | `AgentEngine`, strategies, and all legacy agent classes |
| `@fractal-solutions/qflow/mcp` | `QFlowMCPServer` and `MCPClientNode` |
| `@fractal-solutions/qflow/streaming` | `streamChatCompletions()` and event-name constants |
| `@fractal-solutions/qflow/durable` | `SQLiteCheckpointer` and `DurableFlow` |
| `@fractal-solutions/qflow/testing` | `MockNode`, `MockLLMNode`, `recordFlow()` and snapshot helpers |
| `@fractal-solutions/qflow/graph` | `FanOutNode` and `FanInNode` |
| `@fractal-solutions/qflow/trace` | `normalizeTrace()`, `serializeTrace()` and `writeTraceFile()` |
| `@fractal-solutions/qflow/optional` | Optional dependency map and guarded loader |
| `@fractal-solutions/qflow/logger` | `log`, `setLogLevel` and `LogLevel` |

## Async lifecycle methods

`prepAsync`, `execAsync`, and `postAsync` now receive an optional `observer` as their final argument:

```js
async execAsync(prepRes, shared, observer = {}) {
  observer.emit?.('my:event', { value: 1 });
  return prepRes;
}
```

Existing implementations that accept fewer arguments are unaffected. `AsyncFlow.on()` still works, and `onAny()` / `on('*')` now receive every event. Nested flow events are forwarded with `nested: true`.

## Flow options

`Flow` and `AsyncFlow` now accept an optional second argument:

```js
const flow = new AsyncFlow(startNode, {
  maxSteps: 100,
  timeout: 30_000,
  onError: recoveryNode,
});
```

`maxSteps` guards loops, `timeout` rejects with a `TimeoutError`, and `onError` routes a failed node to a recovery node with `shared.error` populated. Existing `new AsyncFlow(startNode)` usage is unchanged.

## Agents

The five agent classes (`AgentNode`, `RAORAgent`, `OODAAgent`, `LPAVRLAgent`, `PEMAAgent`) remain available with their original constructors. Internally they are now thin wrappers around one `AgentEngine` with declarative strategies.

Prefer the options object for new code:

```js
import { AgentNode } from '@fractal-solutions/qflow/agent';

const agent = new AgentNode({
  llmNode,
  availableTools,
  strategy: 'raor',
  requireFinishConfirmation: false,
});
```

Custom strategies can be registered without subclassing:

```js
import { agentStrategies } from '@fractal-solutions/qflow/agent';

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

## Streaming

```js
import { AsyncFlow } from '@fractal-solutions/qflow';
import { StreamingLLMNode } from '@fractal-solutions/qflow/nodes';

const flow = new AsyncFlow(new StreamingLLMNode());
flow.on('llm:delta', ({ delta }) => process.stdout.write(delta));
await flow.runAsync({
  prompt: 'Hello',
  apiKey: Bun.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
});
```

Events: `llm:delta`, `llm:reasoning`, `llm:done`.

## Durable runs

```js
import { DurableFlow, SQLiteCheckpointer } from '@fractal-solutions/qflow/durable';

const checkpointer = new SQLiteCheckpointer('./runs.db');
const flow = new DurableFlow(startNode, { checkpointer });

const { runId } = await flow.runDurable({ shared: {} });
// After a restart or crash:
await flow.runDurable({ runId, resume: true });
```

`runDurable()` returns `{ runId, result, shared, steps, resumed }`. `runAsync()` still returns only the result, backed by a new durable run.

## Optional integrations

Heavy integrations moved from `dependencies` to `optionalDependencies`. Importing qflow or the full node catalog no longer loads Playwright, webview-bun, xlsx, serialport, ssh2, simple-git, ws, cheerio, ajv, ajv-formats, or node-cron. Each node loads its package only when the action needs it.

If you use one of those nodes, install its package explicitly:

```bash
bun add --optional playwright
bun add --optional webview-bun
bun add --optional xlsx
```

Missing packages throw an actionable `QFLOW_OPTIONAL_DEPENDENCY_MISSING` error containing the exact install command. The same commands work in CI and lockfiles because the packages remain declared in `package.json`.

## Traces

`recordFlow()` output can now be normalized and written as JSON for the site trace viewer:

```js
import { recordFlow } from '@fractal-solutions/qflow/testing';
import { writeTraceFile } from '@fractal-solutions/qflow/trace';

const recorder = recordFlow(flow);
await flow.runAsync(shared);
await writeTraceFile(recorder.events, './trace.json');
```

For durable runs, use `createRunTrace(checkpointer, runId, { events: recorder.events, includeState: true })`.

## License

The license is now MIT, matching `package.json` and npm metadata.
