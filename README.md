# qflow: A Lightweight and Flexible JavaScript Workflow and Agent Library

`qflow` is a lightweight and flexible JavaScript library designed for creating and managing complex workflows and autonomous agents. It provides a minimalist yet expressive API to define sequences of operations, manage data flow, and orchestrate execution, supporting both synchronous and asynchronous patterns.

## Features

*   **Modular & Extensible:** Easily define custom nodes and compose them into complex, reusable flows.
*   **Synchronous & Asynchronous Flows:** Supports both blocking and non-blocking execution models.
*   **Observability:** Monitor workflows with a built-in event system that emits detailed lifecycle events for flows and nodes, including custom and streaming events.
*   **Shared State Management:** Pass and manipulate data across nodes using a central, mutable `shared` object.
*   **Batch Processing:** Efficiently process collections of data through dedicated batch nodes and flows, including parallel execution.
*   **Agents:** Built upon the `qflow` core functionality are plug and play agents with extensive tool integrations available.
*   **Built-in Integrations:** Comes with pre-built nodes for multiple tasks like LLM interactions, browser use, pdf tools, webhooks, spreadsheet manipulation, code interpretation, media manipulation, web scraping, and popular API integrations (GitHub, Git, Open Router, HackerNews, Stripe, Maps).
*   **Custom Agent Tools:** Build your own Agent tools using the flow registry pattern.
*   **MCP Bridge:** Expose qflow nodes as MCP tools over stdio, or call external MCP servers from an agent.
*   **Streaming LLM Output:** Surface token deltas as flow events with OpenAI-compatible providers.
*   **Durable Execution:** Checkpoint flow state to `bun:sqlite` and resume runs after a crash.
*   **Graph Guards:** Fan-out/fan-in nodes, error edges, loop limits and flow-level timeouts.
*   **Trace Viewer:** Export flow/durable-run traces as JSON and inspect them at `#trace` on the docs site.
*   **Opt-in Integrations:** Heavy packages load only when the node action that needs them runs.
*   **Provider-Neutral LLM:** One `LLMNode` with adapters for OpenAI-compatible APIs, Anthropic, Ollama and Gemini, plus capability negotiation, retries, fallbacks and usage/cost events.
*   **Portable Tool Specs:** `ToolSpec` / `ToolRegistry` power agents, MCP export and docs from one definition, with permissions, namespaces, dry-run, timeouts and idempotency.
*   **Replay-Safe Side Effects:** Durable operations reserve an ID before running, replay completed results, and refuse to re-run uncertain effects.
*   **Agent-Native Nodes:** Plan, critique, reflect, finish and human approval as composable, checkpointable graph nodes; `AgentEngine.asFlow()` exposes strategies as inspectable flows.
*   **Dataflow & Contracts:** Map/reduce/join/branch/cycle nodes with typed shared-state schemas and explicit iteration budgets.
*   **Eval & Replay:** Assert, score, compare and replay nodes turn saved traces into regression suites.
*   **Bun-Native Nodes:** Process spawning, SQLite queries, file watching and Web Stream transforms without optional native packages.
*   **Durable Human Approval:** Suspend a run on a decision stored in SQLite, review it in any UI, and resume days later without losing context.
*   **Durable Scheduling:** Suspend until a date, delay or cron slot; a worker resumes due runs without holding an in-process timer.
*   **Deterministic LLM Replay:** Cache normalized completions across workers and restarts, with readable keys and a visible `llm:cache_hit` event.
*   **Budget Guardrails:** Track cost, tokens, duration and steps, then route to a fallback or throw a coded error when a limit is crossed.
*   **Flow Versioning & Worker Leases:** Resume old runs with an explicit migration policy; stop two workers from executing the same side effect.
*   **Unified Memory:** One `MemoryStore` interface with in-memory and SQLite implementations, wrapped by a single `MemoryStoreNode`.

## What qflow 2.0 is good for

| Application | Why the 2.0 node set fits | Start here |
| --- | --- | --- |
| **Tool-using research and copilot agents** | One `LLMNode` switches providers without rewriting flows; `ToolSpec` gives tools permissions, timeouts and idempotency; strategies become inspectable flows with `asFlow()`. | [Unified tool contract example](examples/v2/unified-tool-contract.js) · [Agent flows tutorial](documentation/tutorials/agent-flows.md) |
| **Durable transactional workflows** (checkout, refunds, onboarding) | `DurableFlow` checkpoints every node; replay-safe side effects reserve an operation ID and replay completed results instead of charging twice. | [Replay-safe checkout](examples/v2/replay-safe-checkout.js) · [Side effects tutorial](documentation/tutorials/durable-side-effects.md) |
| **MCP tool servers and agent interoperability** | `ToolRegistry` exposes the same definitions to agents, MCP `tools/list`, LLM tool schemas and generated docs; `MCPClientNode` calls external servers from a flow. | [MCP tutorial](documentation/tutorials/mcp.md) |
| **Data and LLM pipelines** (ETL, enrichment, batch scoring) | `MapNode` / `ReduceNode` / `JoinNode` / `BranchNode` / `CycleNode` add explicit routing and budgets; `StateContract` validates state at node boundaries; Bun stream nodes compose without optional packages. | [Dataflow regression example](examples/v2/dataflow-eval-regression.js) · [Bun ingest example](examples/v2/bun-stream-ingest.js) |
| **Eval-driven LLM products** | Normalized traces are the contract between runtime and tests: replay a saved trace against a new flow, diff spans and payloads, then gate releases with assert/score nodes. | [Trace replay tutorial](documentation/tutorials/trace-driven-eval.md) |
| **Local automation and scripting** | `BunSpawnNode`, `FileWatchNode`, `SQLiteQueryNode` and Web Stream transforms handle process, file and data work with Bun primitives only. | [Bun ingest example](examples/v2/bun-stream-ingest.js) |
| **Visual workflow authoring** | `describeGraph()` and `strategyGraph()` emit JSON nodes/edges, while contracts declare what each boundary expects. | [Dataflow regression example](examples/v2/dataflow-eval-regression.js) |
| **Human-in-the-loop operations** (refunds, overrides, deploys) | `WaitForApprovalNode` suspends a durable run with `status: 'suspended'`; decisions live in SQLite and can be recorded from any UI. | [Approval tutorial](documentation/tutorials/durable-approval.md) |
| **Time-based workflows** (reminders, retries, nightly jobs) | `ScheduleNode` persists a due time, so a worker can resume due runs after any restart. Cron parsing needs no optional package. | [Scheduling tutorial](documentation/tutorials/durable-scheduling.md) |
| **Cost-controlled agents** | `BudgetTracker` accumulates real usage; `BudgetNode` routes to `continue` / `exceeded` and `LLMNode` can hard-stop with `QFLOW_BUDGET_EXCEEDED`. | [Budget tutorial](documentation/tutorials/budget-guardrails.md) |
| **Multi-tenant assistants** | A `MemoryStore` per tenant plus `MemoryStoreNode` keeps recall isolated while flow code stays identical. | [Memory tutorial](documentation/tutorials/multi-tenant-memory.md) |

The earlier production gaps — long-lived approvals, deterministic LLM replay,
distributed side effects and multi-tenant memory/scheduling — are now closed in
`2.0.0-canary.4`. See [Production gaps closed](#production-gaps-closed-200-canary4)
for the 1-2-3 paths, or [MIGRATION.md § 9-15](MIGRATION.md) for every option and
error code.

### 2.0 in three steps

Every durable feature follows the same rhythm. Learn it once and the rest of
the API is predictable:

1. **Create the state owner.** A `SQLiteCheckpointer('./runs.db')` owns runs,
   checkpoints, approvals, schedules, leases and the LLM cache. One file per
   application; share it across workers.
2. **Run with a caller-owned `runId` and read `status`.**
   `await flow.runDurable({ runId, shared })` returns `completed`, `suspended`
   (approval), `scheduled` (time) or throws a coded error. Never assume a call
   finishes just because the process stayed up.
3. **Act on the state, then resume the same run.**
   Record a decision, wait for a due time, or release a stale lease, then call
   `runDurable({ runId, resume: true })`. The waiting node re-enters and reads
   what you recorded.

```javascript
import { DurableFlow, SQLiteCheckpointer } from '@fractal-solutions/qflow/durable';

const checkpointer = new SQLiteCheckpointer('./runs.db', {
  workerId: 'worker-1', // unique per worker: protects side effects with a lease
  leaseMs: 60_000,
});
const flow = new DurableFlow(startNode, { checkpointer, name: 'checkout', version: '1.0.0' });

const outcome = await flow.runDurable({ runId: 'order-1', shared: { orderId: 'ord-1' } });
if (outcome.status === 'suspended' || outcome.status === 'scheduled') {
  // Decide or wait, using checkpointer.listApprovals() / listScheduledRuns().
}
await flow.runDurable({ runId: 'order-1', resume: true });
```

**Why a `runId` you control?** Because the id is the join key between your
system (order, request, invoice) and every checkpoint, decision, reservation and
trace. A generated id is fine for one-off runs; a business id is what makes
recovery possible.

## Installation

To get started quickly with a new project, you can use the `create-qflow` tool (Recommended):

```bash
bunx create-qflow@latest <project-name>
```

or install the package with Bun:

```bash
bun add @fractal-solutions/qflow
```

qflow 2.0 is **Bun-only**. Node.js is not a supported runtime.

### Canary channel

While 2.0 is in prerelease it is published under the `canary` dist-tag, so
`latest` stays on the stable 1.x line. Install it explicitly:

```bash
bun add @fractal-solutions/qflow@canary
# or pin an exact prerelease
bun add @fractal-solutions/qflow@2.0.0-canary.4
```

Read [MIGRATION.md](MIGRATION.md) before upgrading — 2.0 is a breaking release.

## Module Imports

`qflow` provides different entry points for its core functionalities and built-in nodes to keep your imports clean and specific.

*   **Core Classes (`Node`, `Flow`, `AsyncNode`, `AsyncFlow`, etc.):**
    These are imported directly from the main package:
    ```javascript
    import { Node, Flow, AsyncNode, AsyncFlow } from '@fractal-solutions/qflow';
    ```

*   **Built-in Integration Nodes (`LLMNode`, `DeepSeekLLMNode`, `GitHubNode`, `WebScraperNode`, etc.):**
    These are imported from the `/nodes` subpath:
    ```javascript
    import { DeepSeekLLMNode, GitHubNode, WebScraperNode } from '@fractal-solutions/qflow/nodes';
    ```

*   **Agents:** Agent classes and strategies are imported from `/agent`:
    ```javascript
    import { AgentNode, RAORAgent, listStrategies } from '@fractal-solutions/qflow/agent';
    ```

*   **MCP, streaming, durability, testing and tooling:**
    ```javascript
    import { QFlowMCPServer, MCPClientNode } from '@fractal-solutions/qflow/mcp';
    import { streamChatCompletions } from '@fractal-solutions/qflow/streaming';
    import { DurableFlow, SQLiteCheckpointer, createRunTrace } from '@fractal-solutions/qflow/durable';
    import { MockNode, recordFlow } from '@fractal-solutions/qflow/testing';
    import { FanOutNode, FanInNode } from '@fractal-solutions/qflow/graph';
    import { normalizeTrace, writeTraceFile } from '@fractal-solutions/qflow/trace';
    import { OPTIONAL_DEPENDENCIES, loadOptional } from '@fractal-solutions/qflow/optional';
    import { setLogLevel, LogLevel } from '@fractal-solutions/qflow/logger';

    // 2.0 node families
    import { LLMNode, registerLLMAdapter, listLLMAdapters } from '@fractal-solutions/qflow/llm';
    import { ToolSpec, ToolRegistry, generateToolDocs } from '@fractal-solutions/qflow/tool-spec';
    import { StateContract, defineState } from '@fractal-solutions/qflow/contracts';
    import { ReplaySafeNode, SideEffectUncertainError } from '@fractal-solutions/qflow/side-effects';
    import { AssertNode, ScoreNode, CompareNode, ReplayNode } from '@fractal-solutions/qflow/eval';
    import { BunSpawnNode, SQLiteQueryNode, FileWatchNode } from '@fractal-solutions/qflow/bun';

    // Production-gap closures (canary.4), also re-exported from /nodes
    import { WaitForApprovalNode } from '@fractal-solutions/qflow/approval';
    import { ScheduleNode, nextCronTime } from '@fractal-solutions/qflow/schedule';
    import { BudgetNode, BudgetTracker, BudgetExceededError } from '@fractal-solutions/qflow/budget';
    import { MemoryStoreNode, InMemoryMemoryStore, SQLiteMemoryStore } from '@fractal-solutions/qflow/memory';

    // /durable is the single entry point for long-lived run control
    import {
      DurableFlow, WaitForApprovalNode, ScheduleNode, BudgetNode,
      FlowVersionMismatchError, SideEffectClaimedError,
    } from '@fractal-solutions/qflow/durable';
    ```

See [MIGRATION.md](./MIGRATION.md) when upgrading from 1.x, and [CHANGELOG.md](./CHANGELOG.md) for release notes.

## Core Abstractions

`qflow` is built around a few core abstractions that enable powerful and flexible workflow definitions.

### Shared State (`shared` object)

A central, mutable JavaScript object that is passed through the entire flow. Nodes can read from and write to this `shared` object, making it the primary mechanism for passing data and context between different nodes in a workflow. This is particularly useful for accumulating results or maintaining state across multiple steps.

### Node

The fundamental building block of any `qflow` workflow. A `Node` represents a single, atomic operation or step in your flow.

*   `prep(shared)`: Prepares data for execution. Receives the `shared` object.
*   `exec(prepRes)`: Executes the node's primary logic.
*   `post(shared, prepRes, execRes)`: Processes the result of `exec`. Receives the `shared` object.
*   `setParams(params)`: Configures the node with specific parameters. Parameters are accessible via `this.params`.
*   `next(node, action = "default")`: Chains this node to another, defining the next step in the flow.

**Asynchronous Nodes (`AsyncNode`, `AsyncBatchNode`, `AsyncParallelBatchNode`)**
For operations that involve I/O or are inherently asynchronous, `qflow` provides `AsyncNode` and its variants. These nodes leverage `async`/`await` for non-blocking execution. When working within `AsyncFlow`s, it's crucial to implement the `async` versions of the lifecycle methods:
*   `prepAsync(shared, observer)`
*   `execAsync(prepRes, shared, observer)`
*   `postAsync(shared, prepRes, execRes, observer)`

The `observer` is optional and can be used to emit custom flow events with `observer.emit(name, payload)`.
*   `preparePrompt(shared)` (specifically for LLM nodes, allowing prompt construction based on `shared` state)

These `async` methods ensure proper awaiting and data propagation within asynchronous workflows.

### Flow

A `Flow` orchestrates the execution of a sequence of `Node`s. It defines the overall path and manages the transitions between nodes.

*   `start(startNode)`: Sets the initial node for the flow. (Note: In practice, you often pass the start node directly to the `Flow` constructor for conciseness).
*   `_orch(shared, params)` / `_orchAsync(shared, params)`: Internal methods used to run the flow, especially when passing initial parameters to the starting node. For most use cases, `flow.run(sharedState)` or `await flow.runAsync(sharedState)` is sufficient.

**Batch Flows (`BatchFlow`, `AsyncBatchFlow`, `AsyncParallelBatchFlow`)**
These specialized flows are designed to process collections of items. They run a sub-flow for each item in the batch. `AsyncParallelBatchFlow` is particularly useful for concurrently processing batch items, significantly speeding up operations.


## Basic Usage & Examples

### 1. Simple Node

A basic example of defining and running a single node.

```javascript
import { Node } from '@fractal-solutions/qflow';

class MySimpleNode extends Node {
  prep(shared) {
    console.log('Preparing data...');
    return shared.inputData * 2;
  }

  exec(prepRes) {
    console.log('Executing with prepared data:', prepRes);
    return prepRes + 10;
  }

  post(shared, prepRes, execRes) {
    console.log('Post-processing result:', execRes);
    return { finalResult: execRes, originalInput: shared.inputData };
  }
}

const node = new MySimpleNode();
const result = node.run({ inputData: 5 });
console.log('Node run result:', result);
// Expected output:
// Preparing data...
// Executing with prepared data: 10
// Post-processing result: 20
// Node run result: { finalResult: 20, originalInput: 5 }
```

### 2. Simple Flow

Chaining multiple nodes together to form a basic workflow.

```javascript
import { Node, Flow } from '@fractal-solutions/qflow';

let count = 0;

class MessageNode extends Node {
    exec() {
        count++;
        console.log(`New Message ${count}`);
        return `default`;
    }
}

class TimeNode extends Node {
    exec() {
        console.log(`Time ${Date.now()}`);
        return `default`;
    }
}

const m1 = new MessageNode();
const t1 = new TimeNode();
const m2 = new MessageNode();

m1.next(t1);
t1.next(m2);

const flow = new Flow(m1);
flow.run({});
// Expected output (approximate):
// New Message 1
// Time <timestamp>
// New Message 2
```

### 3. Conditional Flow

Using `transition()` for dynamic branching based on an action. This example demonstrates configuring a node using `setParams` for a cleaner API.

```javascript
import { Node, Flow } from '@fractal-solutions/qflow';

class ConditionalNode extends Node {
  exec() {
    // Access shouldGoLeft from this.params, which is set via setParams
    if (this.params.shouldGoLeft) {
      console.log('ConditionalNode: Going left');
      return 'left';
    } else {
      console.log('ConditionalNode: Going right');
      return 'right';
    }
  }
}

// Helper node for conditional transition test
function MessageNode(message) {
  return new (class extends Node {
    exec() {
      console.log(message);
      return 'default';
    }
  })();
}

const conditionalNode = new ConditionalNode();
conditionalNode.setParams({ shouldGoLeft: true }); // Configure via setParams

const leftNode = MessageNode('Went Left');
const rightNode = MessageNode('Went Right');

conditionalNode.next(leftNode, 'left');
conditionalNode.next(rightNode, 'right');

const conditionalFlow = new Flow(conditionalNode);
conditionalFlow.run({});
// Expected output:
// ConditionalNode: Going left
// Went Left

const conditionalNode2 = new ConditionalNode();
conditionalNode2.setParams({ shouldGoLeft: false }); // Configure via setParams

conditionalNode2.next(leftNode, 'left');
conditionalNode2.next(rightNode, 'right');
const conditionalFlow2 = new Flow(conditionalNode2);
conditionalFlow2.run({});
// Expected output:
// ConditionalNode: Going right
// Went Right
```

### 4. Asynchronous Flow

Handling asynchronous operations within a flow.

```javascript
import { AsyncNode, AsyncFlow } from '@fractal-solutions/qflow';

class MyAsyncNode extends AsyncNode {
  async execAsync() {
    console.log('AsyncNode: Starting...');
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('AsyncNode: Finished!');
    return 'default';
  }
}

const asyncNode1 = new MyAsyncNode();
const asyncNode2 = new MyAsyncNode();
asyncNode1.next(asyncNode2);

const asyncFlow = new AsyncFlow(asyncNode1);
await asyncFlow.runAsync({});
// Expected output:
// AsyncNode: Starting...
// AsyncNode: Finished!
// AsyncNode: Starting...
// AsyncNode: Finished!
```

See [documentation/examples.md](documentation/examples.md) for a full list of examples.

## Advanced Examples

### Interactive Webview Form with Validation

This example demonstrates how to create a persistent interactive webview for a multi-field form, perform data validation using `DataValidationNode`, and provide dynamic feedback to the user within the webview. It requires the optional `webview-bun`, `ajv`, and `ajv-formats` packages.

See [examples/advanced_interactive_webview_form.js](examples/advanced_interactive_webview_form.js) for the full example.

### Webview Data Visualization

This example demonstrates how to generate data within a qflow, create dynamic HTML content with embedded JavaScript (using Chart.js) for data visualization, and display this visualization in a `WebviewNode`.

See [examples/webview_data_visualization.js](examples/webview_data_visualization.js) for the full example.



## 2.0 Node Families

These families shipped in `2.0.0-canary.3`; the production-gap closures below
arrived in `2.0.0-canary.4`. All of them are additive: the older
vendor-specific nodes and agent classes keep working.

### Provider-neutral LLM

`LLMNode` replaces a separate class per vendor. Adapters cover `openai` (plus DeepSeek, OpenRouter, Hugging Face, Groq, Together and any OpenAI-compatible endpoint), `anthropic`, `ollama` and `gemini`. Register your own with `registerLLMAdapter()`.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { LLMNode } from '@fractal-solutions/qflow/llm';

const flow = new AsyncFlow(new LLMNode({
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: Bun.env.OPENAI_API_KEY,
  pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
}));
flow.on('llm:delta', ({ delta }) => process.stdout.write(delta));

const result = await flow.runAsync({ prompt: 'Summarize this release.' });
// result: { text, reasoning, toolCalls, usage: { prompt, completion, total, cost }, ... }
```

Capabilities are negotiated before a call: requesting `toolCalls` from an adapter that does not support it emits `llm:capability` and fails without hitting the API. Failures emit `llm:retry`, then `llm:fallback` when `fallbackProviders` is set. Events: `llm:delta`, `llm:reasoning`, `llm:done`, `llm:retry`, `llm:fallback`, `llm:negotiated`, `llm:capability`, `llm:usage`, `llm:tool_call`.

### Tool specs and registries

`ToolSpec` turns `getToolDefinition()` into a portable definition for agents, MCP clients and generated docs. `ToolRegistry` adds namespaces, capability/permission grants, dry-run, timeouts and idempotency caching.

```javascript
import { ToolSpec, ToolRegistry, generateToolDocs } from '@fractal-solutions/qflow/tool-spec';
import { QFlowMCPServer } from '@fractal-solutions/qflow/mcp';

const spec = new ToolSpec({
  name: 'echo',
  description: 'Echo a value.',
  parameters: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] },
  capabilities: ['read'],
  permissions: ['public'],
  idempotencyKey: '{{value}}',
  execute: async ({ value }) => value,
});
const registry = new ToolRegistry({ tools: [spec], grantedCapabilities: ['read'] });
await registry.execute('echo', { value: 'hello' }); // { tool, result, args }
registry.llmTools();                               // OpenAI tool definitions
new QFlowMCPServer({ toolRegistry: registry });    // tools/list + tools/call
generateToolDocs(registry);                        // Markdown
```

`toolSpecFromNode(NodeClass)` derives the same spec from an existing node. Agents accept a registry with `new AgentNode({ llmNode, toolRegistry, grantedCapabilities, grantedPermissions })`.

### Replay-safe side effects

Pass an `operationId` to make an external effect safe across durable replay. The checkpointer reserves the operation before execution; completed effects return their recorded result, while a reserved-but-unfinished effect raises `SideEffectUncertainError` (`QFLOW_SIDE_EFFECT_UNCERTAIN`) instead of running twice.

```javascript
import { DurableFlow, SQLiteCheckpointer } from '@fractal-solutions/qflow/durable';
import { ReplaySafeNode } from '@fractal-solutions/qflow/side-effects';

const charge = new ReplaySafeNode({
  operationId: '{{orderId}}',
  kind: 'charge',
  execute: async ({ input }) => paymentApi.charge(input),
});
const checkpointer = new SQLiteCheckpointer('./runs.db');
const flow = new DurableFlow(charge, { checkpointer });
const runId = 'order-charge-1';

await flow.runDurable({ runId, shared: { orderId: 'ord-1', input: { amount: 42 } } });
await flow.runDurable({ runId, resume: true }); // no second charge
```

`HttpRequestNode`, `GitNode`, `WebHookNode` and `DatabaseNode` also accept `operationId` (with `{{template}}` placeholders). Events: `side_effect:replay`, `side_effect:committed`.

### Dataflow and shared-state contracts

`MapNode`, `ReduceNode`, `JoinNode`, `BranchNode` and `CycleNode` add explicit dataflow routing. `StateContract` validates `shared` at node boundaries, and `describeGraph(flow.startNode)` returns JSON nodes/edges for visual authoring.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { defineState } from '@fractal-solutions/qflow/contracts';
import { MapNode, ReduceNode } from '@fractal-solutions/qflow/graph';

const contract = defineState({
  fields: { items: { type: 'array', required: true } },
  strict: true,
});
const map = new MapNode({ mapper: value => value * 2, inputContract: contract });
const reduce = new ReduceNode({ reducer: (sum, value) => sum + value, initialValue: 0 });
map.next(reduce);
await new AsyncFlow(map).runAsync({ items: [1, 2, 3] }); // shared.reduceResult === 12
```

`CycleNode` enforces `maxIterations` / `maxItems` budgets; events include `cycle:iteration`, `map:item_error` and `reduce:step`.

### Agent-native control nodes

`PlanNode`, `CriticNode`, `ReflectNode`, `FinishNode` and `HumanApprovalNode` are first-class nodes from `/agent`. `AgentEngine.asFlow()` turns any declarative strategy into a runnable, inspectable `AsyncFlow`; each phase becomes its own checkpointable node.

```javascript
import { AgentNode, PlanNode, CriticNode } from '@fractal-solutions/qflow/agent';

const plan = new PlanNode({ llmNode });
const critic = new CriticNode({ llmNode });
plan.next(critic, 'default');
// critic.next(approvedNode, 'approve').next(reviseNode, 'reject')

const flow = new AgentNode({ llmNode, availableTools, strategy: 'raor' }).asFlow();
flow.graph; // { nodes, edges } suitable for a visual editor
```

### Evaluation and trace replay

`AssertNode`, `ScoreNode`, `CompareNode` and `ReplayNode` turn saved traces into regression suites. Volatile fields (IDs, timings, stack traces) are ignored when diffing.

```javascript
import { AssertNode, ScoreNode, createEvalSuite } from '@fractal-solutions/qflow/eval';

const suite = createEvalSuite(flow, [{ name: 'happy path', shared: { input: 'hello' } }]);
const results = await suite.run();
```

`ReplayNode` accepts a trace (or `tracePath`), reruns a `flowFactory`, and diffs events/spans/status; events include `eval:assert`, `eval:score`, `eval:compare` and `eval:replay`.

### Bun-native nodes

Small, composable nodes built on Bun primitives with no optional native dependencies: `BunSpawnNode`, `SQLiteQueryNode`, `FileWatchNode`, `StreamTransformNode`, `StreamMapNode`, `StreamFilterNode` and `StreamReduceNode`.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { BunSpawnNode, SQLiteQueryNode, StreamMapNode } from '@fractal-solutions/qflow/bun';

const spawn = new BunSpawnNode();
spawn.setParams({ command: 'bun', args: ['--version'] });
await new AsyncFlow(spawn).runAsync({}); // shared.spawnStdout

const query = new SQLiteQueryNode();
query.setParams({ database: ':memory:', sql: 'SELECT 1 AS ok', mode: 'all' });
await new AsyncFlow(query).runAsync({}); // shared.sqliteResult

const stream = new StreamMapNode({ transform: value => value * 2 });
await new AsyncFlow(stream).runAsync({ streamInput: [1, 2, 3] }); // shared.streamResult
```

Events include `spawn:exit`, `file:change` and `stream:item`.

## Production gaps closed (2.0.0-canary.4)

The canary.3 families gave qflow breadth. This release closes the six gaps that
prevented those features from running unattended in production. Each subsection
answers three questions: **why it exists**, **the 1-2-3 steps**, and **which
options matter**. Full tables and failure modes live in
[MIGRATION.md](MIGRATION.md) and the linked tutorials.

| Gap | What closes it | Why it matters | Deep dive |
| --- | --- | --- | --- |
| Long-lived human decisions | `WaitForApprovalNode`, `approve()` / `reject()` | A review can take days and outlive the worker | [Approval tutorial](documentation/tutorials/durable-approval.md) |
| Time-based suspension | `ScheduleNode`, `listScheduledRuns()` | Reminders must survive restarts | [Scheduling tutorial](documentation/tutorials/durable-scheduling.md) |
| Non-deterministic model calls | `LLMNode` cache + `llm:cache_hit` | Replay should not re-pay or re-roll a prompt | [LLM replay tutorial](documentation/tutorials/llm-deterministic-cache.md) |
| Unbounded agent spend | `BudgetTracker`, `BudgetNode` | Limits must be enforceable, not documented | [Budget tutorial](documentation/tutorials/budget-guardrails.md) |
| Competing workers / stale graphs | side-effect leases, flow versioning | Exactly-once effects and safe resume after a deploy | [MIGRATION § 9](MIGRATION.md#9-side-effects-replay-and-worker-leases) · [§ 10](MIGRATION.md#10-flow-versioning) |
| Tenant-isolated recall | `MemoryStoreNode`, two store implementations | One flow, separate data per customer | [Memory tutorial](documentation/tutorials/multi-tenant-memory.md) |

### 1. Suspend on a human decision

**Why:** a callback held in process memory cannot wait three days. The approval
is a row in SQLite; the flow returns `status: 'suspended'` and resumes from the
saved decision.

1. Add the gate with a stable id: `new WaitForApprovalNode({ approvalId: '{{requestId}}', prompt: 'Approve?' })` and register `approve` / `reject` successors.
2. Run durably and show `checkpointer.listApprovals(runId, { status: 'pending' })` to a reviewer.
3. Call `checkpointer.approve(runId, decision, approvalId)` (or `reject`), then `runDurable({ runId, resume: true })`.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `approvalId` | template string / function / `true` | `true` | Stable decision key; templates use `{{sharedKey}}` and get an `approval:` prefix |
| `prompt` | string | `null` | Reviewer question; also read from `shared.approvalPrompt` |
| `resultKey` / `approvalsKey` | string | `'approval'` / `'approvals'` | Where the decision and the id→decision map are written in `shared` |
| `metadata` | JSON object | `null` | Extra reviewer context (amount, links, UI hints) |

```javascript
import { DurableFlow, SQLiteCheckpointer, WaitForApprovalNode } from '@fractal-solutions/qflow/durable';

const gate = new WaitForApprovalNode({ approvalId: '{{requestId}}', prompt: 'Approve refund?' });
gate.next(approvedNode, 'approve');
gate.next(rejectedNode, 'reject');

const checkpointer = new SQLiteCheckpointer('./runs.db');
const flow = new DurableFlow(gate, { checkpointer, version: '1.0.0' });
const pending = await flow.runDurable({ runId: 'refund-req-1', shared: { requestId: 'req-1' } });
// pending.status === 'suspended', pending.approvalId === 'approval:req-1'

checkpointer.approve('refund-req-1', { by: 'alice' }, 'approval:req-1');
const finished = await flow.runDurable({ runId: 'refund-req-1', resume: true });
// finished.shared.approval = { approved: true, by: 'alice', ... }
```

### 2. Suspend until a time

**Why:** a timer that lives in a process disappears on restart. The due time is
stored with the run; any worker can pick it up when it is due.

1. Add `ScheduleNode` with `at` (absolute), `delayMs` (relative) or `cron` (five fields) and register the `due` successor.
2. Read `status === 'scheduled'` and `dueAt`; poll `checkpointer.listScheduledRuns({ before: Date.now() })` in a worker.
3. Resume each due `runId` with `{ resume: true }`; the node re-checks the same stored time.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `at` | `Date` / ISO string / epoch ms | `null` | Absolute due time (highest priority) |
| `delayMs` | number | `null` | Relative delay, resolved once |
| `cron` | string | `null` | Five fields: `minute hour day month weekday`, no optional package |
| `dueAtKey` / `scheduleIdKey` | string | `'scheduledAt'` / `'scheduleId'` | Shared keys holding the persisted schedule |

```javascript
import { DurableFlow, SQLiteCheckpointer, ScheduleNode } from '@fractal-solutions/qflow/durable';

const wait = new ScheduleNode({ delayMs: 60_000 });
wait.next(sendReminder, 'due');
const checkpointer = new SQLiteCheckpointer('./runs.db');
const flow = new DurableFlow(wait, { checkpointer });

const paused = await flow.runDurable({ runId: 'reminder-1', shared: {} });
// paused.status === 'scheduled'
for (const run of checkpointer.listScheduledRuns({ before: Date.now() })) {
  await flow.runDurable({ runId: run.runId, resume: true });
}
```

### 3. Replay LLM calls instead of re-paying for them

**Why:** a checkpoint knows a node ran, but the model call itself is external.
A cache makes replay deterministic and emits `llm:cache_hit` so traces show it.

1. Add `cache: true` to `LLMNode` inside a `DurableFlow` (the checkpointer becomes the store), or pass `{ get, set }`.
2. Keep the default request hash, or set `cacheKey: '{{tenant}}:{{prompt}}'` for readable keys.
3. Use `cacheTtlMs` for changing data and listen for `llm:cache_hit` in tests.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `cache` | `true` / `{ get, set }` / `null` | `null` | Cache store; `true` uses the checkpointer's `llm` namespace |
| `cacheKey` | template / function `({request, shared})` / `null` | request hash | Must include every input that changes the answer |
| `cacheTtlMs` | number / `null` | `null` | Entry lifetime; `null` never expires |

```javascript
import { LLMNode, LLM_CACHE_HIT_EVENT } from '@fractal-solutions/qflow/llm';

const llm = new LLMNode({
  provider: 'openai', model: 'gpt-4o-mini',
  cache: true, cacheKey: '{{tenant}}:{{prompt}}',
  cacheTtlMs: 24 * 60 * 60 * 1000,
});
flow.on(LLM_CACHE_HIT_EVENT, ({ key }) => console.log('replayed', key));
```

### 4. Enforce a spend limit

**Why:** "keep costs reasonable" is not a control; a limit with a coded error
and a fallback edge is.

1. Create `new BudgetTracker({ maxCost, maxTokens, maxDurationMs, maxSteps })`.
2. Pass it to `LLMNode` via `budget`, and add `BudgetNode` where the run can branch.
3. Wire `exceeded` to a fallback node, or set `throwOnExceed: true` for `QFLOW_BUDGET_EXCEEDED`.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `maxCost` / `maxTokens` | number | `Infinity` | Spend and token ceilings |
| `maxDurationMs` / `maxSteps` | number | `Infinity` | Wall-clock and step ceilings |
| `tracker` | `BudgetTracker` | `null` | Usage source for `BudgetNode`; without it, reads `shared.llmCost` / `llmUsage` |
| `throwOnExceed` | boolean | `false` | Throw instead of routing to `exceeded` |

```javascript
import { BudgetTracker, BudgetNode } from '@fractal-solutions/qflow/budget';

const budget = new BudgetTracker({ maxCost: 0.50, maxTokens: 20_000 });
const guard = new BudgetNode({ tracker: budget, maxCost: 0.50 });
guard.next(llm, 'continue');       // within limits
guard.next(fallbackNode, 'exceeded'); // over a limit
flow.on('budget:check', result => console.log(result.cost, result.tokens));
```

### 5. Keep workers honest and resumes safe

**Why:** replay protection must also stop two workers starting the same
operation, and a resumed run must not follow a graph that no longer exists.

1. Give each worker a distinct `workerId` and a `leaseMs` longer than the effect.
2. Use stable `operationId` templates (`'{{orderId}}'`) on replay-safe nodes.
3. Set `version` and `onVersionMismatch` (`abort` / `migrate` / `ignore`) on every durable flow that can be resumed.

```javascript
const checkpointer = new SQLiteCheckpointer('./runs.db', {
  workerId: `worker-${process.pid}`, leaseMs: 60_000,
});
const flow = new DurableFlow(charge, {
  checkpointer,
  version: '2.0.0',
  onVersionMismatch: 'migrate',
  migrate: ({ shared }) => ({ ...shared, customerTier: shared.plan ?? 'free' }),
});
// A second live worker gets QFLOW_SIDE_EFFECT_CLAIMED instead of executing.
// A stale resume gets QFLOW_FLOW_VERSION_MISMATCH unless you migrate or ignore.
```

### 6. Isolate tenant memory

**Why:** recall is only useful if it belongs to the right customer. A store per
tenant makes that a construction detail rather than a query filter.

1. Construct `new SQLiteMemoryStore('./tenant-acme.db')` (or `InMemoryMemoryStore()` for tests).
2. Put it in `shared.memoryStore`, then use `MemoryStoreNode` with `operation: 'add'` / `'search'`.
3. Close SQLite stores when a tenant is removed.

| Operation | Reads | Result |
| --- | --- | --- |
| `add` | `text`, `id?`, `tags?`, `metadata?` | stored record |
| `search` | `query` / `text`, `tags?`, `limit?` | scored records |
| `get` / `delete` | `id` | record / boolean |
| `list` / `clear` | — | records / count removed |

```javascript
import { SQLiteMemoryStore, MemoryStoreNode } from '@fractal-solutions/qflow/memory';

const store = new SQLiteMemoryStore('./tenant-acme.db');
const add = new MemoryStoreNode({ operation: 'add', store });
const search = new MemoryStoreNode({ operation: 'search', store, limit: 3 });
await new AsyncFlow(add).runAsync({ memoryInput: { text: 'Net-30 terms', tags: ['policy'] } });
const hits = await new AsyncFlow(search).runAsync({ memoryInput: { query: 'payment terms' } });
```

### Where to go next

- [Tutorial index](documentation/tutorials/README.md) — ten guided paths with option tables.
- [MIGRATION.md](MIGRATION.md) — old→new mapping, every parameter, error codes and troubleshooting.
- [`examples/v2/`](examples/v2/README.md) — four offline, end-to-end stories (`bun run examples:v2`).
- [CHANGELOG.md](CHANGELOG.md) — exact release contents.

## 2.0 End-to-End Examples

The snippets above show individual APIs. For the *why*, see [`examples/v2/`](examples/v2/README.md): four offline stories that compose the new families around real failure modes. Run them all with `bun run examples:v2`.

| Example | Problem it solves | What you'll see |
| --- | --- | --- |
| [`replay-safe-checkout.js`](examples/v2/replay-safe-checkout.js) | A retry after a payment must not charge twice. | A simulated post-commit crash, replay of the recorded charge, and `SideEffectUncertainError` when a reservation has no result. |
| [`unified-tool-contract.js`](examples/v2/unified-tool-contract.js) | Tools get re-described in the agent, MCP server, LLM schema and docs. | One `ToolSpec` feeding all four, plus capability grants, idempotency and `AgentEngine.asFlow()`. |
| [`dataflow-eval-regression.js`](examples/v2/dataflow-eval-regression.js) | A graph changes behavior and nobody notices. | Contract rejection, explicit routing, saved trace replay with zero diffs, and an assert/score suite. |
| [`bun-stream-ingest.js`](examples/v2/bun-stream-ingest.js) | Local ingest shouldn't need optional native packages. | Child-process output through Web Streams into SQLite, plus a real file-watch event. |

## Tutorials

Step-by-step guides for the 2.0 families. Start with the
[full tutorial index](documentation/tutorials/README.md) for two guided learning
paths; the short list below is the quick route.

1. [MCP tool servers and clients](documentation/tutorials/mcp.md)
2. [Provider-neutral LLM nodes](documentation/tutorials/provider-neutral-llm.md)
3. [Durable side effects and safe replay](documentation/tutorials/durable-side-effects.md)
4. [Durable human approval](documentation/tutorials/durable-approval.md)
5. [Durable scheduling](documentation/tutorials/durable-scheduling.md)
6. [Deterministic LLM replay and caching](documentation/tutorials/llm-deterministic-cache.md)
7. [Budget guardrails](documentation/tutorials/budget-guardrails.md)
8. [Multi-tenant memory](documentation/tutorials/multi-tenant-memory.md)
9. [Agent strategies as flows](documentation/tutorials/agent-flows.md)
10. [Trace-driven evaluation](documentation/tutorials/trace-driven-eval.md)

## Integrated Nodes and their Examples

Here's a comprehensive list of integrated nodes available in qflow, along with a brief description and a link to their detailed documentation.

### Data

*   **[CodeInterpreterNode](documentation/nodes/code_interpreter.md)**: Executes Python code snippets.
*   **[DataExtractorNode](documentation/nodes/data_extractor.md)**: Extracts structured data from HTML, JSON, or plain text.
*   **[DatabaseNode](documentation/nodes/database.md)**: Provides a powerful and flexible way to interact with SQL databases.
*   **[EmbeddingNode](documentation/nodes/embedding.md)**: Generates vector embeddings for text (requires Ollama).
*   **[MemoryNode](documentation/nodes/memory.md)**: Stores and retrieves text memories (keyword-based).
*   **[SemanticMemoryNode](documentation/nodes/semantic_memory.md)**: Stores and retrieves text memories via semantic search (requires Ollama).
*   **[TransformNode](documentation/nodes/transform.md)**: Transforms input data using a provided JavaScript function.
*   **[PDFProcessorNode](documentation/nodes/pdf_processor.md)**: Extracts text or images from PDF documents.
*   **[SpreadsheetNode](documentation/nodes/spreadsheet.md)**: Reads from and writes to spreadsheet files (.xlsx, .xls, .csv) with advanced manipulation.
*   **[DataValidationNode](documentation/nodes/data_validation.md)**: Validates structured data against a JSON Schema.

### System

*   **[ShellCommandNode](documentation/nodes/shell_command.md)**: Executes shell commands.
*   **[ReadFileNode](documentation/nodes/read_file.md)**: Reads the content of a specified file.
*   **[WriteFileNode](documentation/nodes/write_file.md)**: Writes content to a specified file.
*   **[AppendFileNode](documentation/nodes/append_file.md)**: Appends content to an existing file.
*   **[ListDirectoryNode](documentation/nodes/list_directory.md)**: Lists the files and subdirectories within a specified directory.
*   **[SystemNotificationNode](documentation/nodes/system_notification.md)**: Displays a system-level notification across OSs.
*   **[DisplayImageNode](documentation/nodes/display_image.md)**: Displays an image file using the system's default image viewer.
*   **[HardwareInteractionNode](documentation/nodes/hardware_interaction.md)**: Communicates with local hardware via serial port (UART).
*   **[ImageGalleryNode](documentation/nodes/image_gallery.md)**: Generates an HTML gallery from multiple image files and opens it in a web browser.
*   **[SpeechSynthesisNode](documentation/nodes/speech_synthesis.md)**: Converts text to spoken audio using OS capabilities or cloud APIs.
*   **[MultimediaProcessingNode](documentation/nodes/multimedia_processing.md)**: Performs various multimedia operations on audio and video files using ffmpeg.
*   **[RemoteExecutionNode](documentation/nodes/remote_execution.md)**: Executes commands on remote machines via SSH.

### Web

*   **[HttpRequestNode](documentation/nodes/http_request.md)**: Makes a generic HTTP request to any URL.
*   **[WebScraperNode](documentation/nodes/web_scraper.md)**: Fetches the HTML content of a given URL.
*   **[DuckDuckGoSearchNode](documentation/nodes/duckduckgo_search.md)**: Performs a web search using DuckDuckGo.
*   **[GoogleSearchNode](documentation/nodes/google_search.md)**: Performs a web search using the Google Custom Search API.
*   **[BrowserControlNode](documentation/nodes/browser_control.md)**: Controls a Playwright browser to navigate pages, interact with elements, evaluate scripts, and take screenshots.
*   **[NavigatorNode](documentation/nodes/navigator.md)**: Controls PinchTab instances/tabs for advanced browser navigation, snapshots, actions, text extraction, media export, and tab safety features.
*   **[WebSocketsNode](documentation/nodes/websockets.md)**: Provides real-time, two-way communication with web services.
*   **[WebhookNode](documentation/nodes/webhook.md)**: Exposes an HTTP endpoint to receive webhooks, triggering a specified qflow flow.
*   **[HttpServerNode](documentation/nodes/http_server.md)**: Creates a web server and handles HTTP requests by triggering a qflow flow.
*   **[InteractiveWebviewNode](documentation/nodes/interactive_webview.md)**: Displays an interactive webview window for notifications, dialogs, or user input.
*   **[WebviewNode](documentation/nodes/webview.md)**: Displays a webview window with custom HTML content.

### Flow Control

*   **[SubFlowNode](documentation/nodes/sub_flow.md)**: Executes a sub-flow.
*   **[IteratorNode](documentation/nodes/iterator.md)**: Iterates items, executes sub-flow for each.
*   **[SchedulerNode](documentation/nodes/scheduler.md)**: Schedules qflow flows for future or recurring execution using cron syntax or a delay.

### Other

*   **[GitNode](documentation/nodes/git.md)**: Performs Git operations like clone, add, commit, and push.
*   **[GISNode](documentation/nodes/gis.md)**: Performs Geographic Information System operations like geocoding and reverse geocoding.
*   **[GitHubNode](documentation/nodes/github.md)**: Performs GitHub operations like creating and managing issues.
*   **[HackerNewsNode](documentation/nodes/hackernews.md)**: Fetches top stories and item details from Hacker News.
*   **[StripeNode](documentation/nodes/stripe.md)**: Performs Stripe operations like creating charges and retrieving account balances.

### LLMs

*   **[DeepSeekLLMNode](documentation/nodes/deepseek_llm.md)**: Interacts with the DeepSeek API.
*   **[OpenAILLMNode](documentation/nodes/openai_llm.md)**: Interacts with the OpenAI API.
*   **[GeminiLLMNode](documentation/nodes/gemini_llm.md)**: Interacts with the Google Gemini API.
*   **[OllamaLLMNode](documentation/nodes/ollama_llm.md)**: Interacts with a local Ollama instance.
*   **[HuggingFaceLLMNode](documentation/nodes/huggingface_llm.md)**: Interacts with the Hugging Face API.
*   **[OpenRouterLLMNode](documentation/nodes/openrouter_llm.md)**: Interacts with the OpenRouter API.

### Agent

*   **[AgentNode](documentation/nodes/agent.md)**: The core of agentic behavior in qflow. It orchestrates tools and LLM reasoning to achieve complex goals.


## Observability (Event System)

`qflow` includes a built-in event system for `AsyncFlow` that provides detailed insights into the execution of your workflows. This allows for powerful, real-time monitoring, logging, and debugging.

You can attach listeners with `on(name, handler)`, subscribe to everything with `onAny(handler)` / `on('*', handler)`, or emit custom events from a node with `observer.emit(name, payload)`.

### Built-in Events

*   `flow:start`: `{ flowId, startTime }`
*   `flow:end`: `{ flowId, endTime, duration, status, error }`
*   `node:start`: `{ flowId, nodeClass, startTime, params }`
*   `node:retry`: `{ flowId, nodeClass, attempt, maxRetries, error }`
*   `node:end`: `{ flowId, nodeClass, endTime, duration, status, result, error }`
*   `llm:delta` / `llm:reasoning` / `llm:done`: streaming payloads from `StreamingLLMNode` and `LLMNode`
*   `llm:retry` / `llm:fallback` / `llm:negotiated` / `llm:capability` / `llm:usage` / `llm:tool_call` / `llm:cache_hit`: provider-neutral LLM lifecycle and deterministic replay
*   `side_effect:replay` / `side_effect:committed`: replay-safe side-effect outcomes
*   `approval:requested` / `approval:resolved` / `approval:pending`: durable human decisions
*   `schedule:waiting` / `schedule:pending`: durable time-based suspension
*   `budget:check` / `budget:exceeded`: spend, token, duration and step guardrails
*   `memory:add` / `memory:search`: unified memory operations
*   `flow:version_migrated` / `flow:version_mismatch` / `flow:node_remapped`: safe resume after a graph change
*   `eval:assert` / `eval:score` / `eval:compare` / `eval:replay`: evaluation results
*   `cycle:iteration` / `map:item_error` / `reduce:step`: dataflow progress
*   `spawn:exit` / `file:change` / `stream:item`: Bun-native node progress
*   `agent:approval`: in-process agent approval decisions
*   `run:start` / `run:end` / `run:resumed` / `checkpoint:saved`: durable-run events

Nested flow events are forwarded to the parent with `nested: true` and `parentFlowId`.

### Coded errors you should handle

Every production-gap failure has a stable `code`, so you can branch on the code
without importing the class:

| Code | Meaning | Usual response |
| --- | --- | --- |
| `QFLOW_APPROVAL_PENDING` | A decision is required | Record it, resume the run |
| `QFLOW_SCHEDULE_PENDING` | The due time has not arrived | Wait, then resume |
| `QFLOW_SIDE_EFFECT_UNCERTAIN` | Effect may have committed; no result recorded | Reconcile with the provider, never retry blindly |
| `QFLOW_SIDE_EFFECT_CLAIMED` | Another worker owns the operation | Wait or let that worker finish |
| `QFLOW_FLOW_VERSION_MISMATCH` | Resume targets a different graph version | Migrate, ignore deliberately, or redeploy the old version |
| `QFLOW_BUDGET_EXCEEDED` | A limit was crossed | Route to a fallback or stop |
| `QFLOW_OPTIONAL_DEPENDENCY_MISSING` | A heavy integration is not installed | Run the printed `bun add --optional ...` command |

Full descriptions are in [MIGRATION.md § 20](MIGRATION.md#20-error-code-reference).

This example demonstrates how to use the built-in event system to monitor the execution of a flow.

```javascript
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';

const colors = {
    reset: "\x1b[0m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    grey: "\x1b[90m"
};
function colorize(text, color) {
    return `${color}${text}${colors.reset}`;
}

// A simple node that simulates some work
class WorkNode extends AsyncNode {
    async execAsync() {
        const workTime = Math.random() * 100 + 50; // 50-150ms
        await new Promise(resolve => setTimeout(resolve, workTime));
        return { status: 'work_done' };
    }
}

// A node that is designed to fail once before succeeding
let failCount = 0;
class SometimesFailsNode extends AsyncNode {
    constructor() {
        // Configure this node to allow 1 retry (for a total of 2 attempts)
        super(2, 0.1); 
    }
    async execAsync() {
        if (failCount < 1) {
            failCount++;
            throw new Error('Simulating a transient error');
        }
        return { status: 'succeeded_after_failure' };
    }
}

// 1. Define the workflow
const startNode = new WorkNode();
const middleNode = new SometimesFailsNode();
const endNode = new WorkNode();

startNode.next(middleNode);
middleNode.next(endNode);

// 2. Create the flow
const myFlow = new AsyncFlow(startNode);

// 3. Attach listeners for observability
myFlow.on('flow:start', (payload) => {
    const time = new Date(payload.startTime).toLocaleTimeString();
    console.log(`\n${colorize(`[FLOW:START]`, colors.cyan)} ${payload.flowId} at ${time}`);
});

myFlow.on('node:start', (payload) => {
    console.log(colorize(`  [NODE:START] ${payload.nodeClass}`, colors.grey));
});

myFlow.on('node:end', (payload) => {
    const status = payload.status.toUpperCase();
    const color = payload.status === 'success' ? colors.green : colors.red;
    const statusStr = colorize(status.padEnd(7), color); // Pad for alignment
    const duration = `${payload.duration.toFixed(2)}ms`.padStart(10);
    console.log(`  [NODE:END]   ${payload.nodeClass.padEnd(18)} | Status: ${statusStr} | Duration: ${duration}`);
    if (payload.error) {
        console.log(colorize(`    └─ ERROR: ${payload.error.message}`, colors.red));
    }
});

myFlow.on('flow:end', (payload) => {
    const status = payload.status.toUpperCase();
    const color = payload.status === 'success' ? colors.green : colors.red;
    const statusStr = colorize(status.padEnd(7), color);
    const duration = `${payload.duration.toFixed(2)}ms`;
    console.log(`\n${colorize(`[FLOW:END]`, colors.cyan)}   ${payload.flowId} | Status: ${statusStr} | Duration: ${duration}`);
    if (payload.error) {
        console.log(colorize(`  └─ FLOW ERROR: ${payload.error.message}`, colors.red));
    }
});

// 4. Run the flow
await myFlow.runAsync({});

// Expected output:
//
// [FLOW:START] <flow-id> at <time>
//   [NODE:START] WorkNode
//   [NODE:END]   WorkNode           | Status: SUCCESS | Duration:  XX.XXms
//   [NODE:START] SometimesFailsNode
//   [NODE:END]   SometimesFailsNode | Status: ERROR   | Duration:   X.XXms
//     └─ ERROR: Simulating a transient error
//   [NODE:START] SometimesFailsNode
//   [NODE:END]   SometimesFailsNode | Status: SUCCESS | Duration:   X.XXms
//   [NODE:START] WorkNode
//   [NODE:END]   WorkNode           | Status: SUCCESS | Duration:  XX.XXms
//
// [FLOW:END]   <flow-id> | Status: SUCCESS | Duration: XXX.XXms
```





## Trace Viewer and Snapshots

Capture events with `recordFlow()`, write a JSON trace, and open `site/index.html#trace` (or the deployed docs site with `#trace`) to inspect the timeline, spans, token deltas, checkpoints, and payloads.

```javascript
import { recordFlow } from '@fractal-solutions/qflow/testing';
import { writeTraceFile } from '@fractal-solutions/qflow/trace';

const recorder = recordFlow(flow);
await flow.runAsync({ prompt: 'Hello' });

await writeTraceFile(recorder.events, './trace.json');
```

For durable runs, merge persisted checkpoints with captured events:

```javascript
import { recordFlow } from '@fractal-solutions/qflow/testing';
import { createRunTrace } from '@fractal-solutions/qflow/durable';
import { writeTraceFile } from '@fractal-solutions/qflow/trace';

const recorder = recordFlow(flow);
const { runId } = await flow.runDurable({ shared: {} });

const trace = createRunTrace(checkpointer, runId, {
  events: recorder.events,
  includeState: true,
});
await writeTraceFile(trace, `./runs/${runId}.json`);
```

`createTraceSnapshot(recorder.events)` remains available for deterministic Bun snapshots; `normalizeTrace()` converts either raw events or snapshots into the viewer's JSON shape.

## Optional Integrations

Core imports stay lightweight. Browser automation, webviews, spreadsheets, serial ports, SSH, Git, cron scheduling, HTML parsing, and schema validation are `optionalDependencies`. They are loaded with a guarded dynamic import only when a matching node action runs.

| Node(s) | Package | Install |
| --- | --- | --- |
| `BrowserControlNode` | `playwright` | `bun add --optional playwright` |
| `WebviewNode`, `InteractiveWebviewNode` | `webview-bun` | `bun add --optional webview-bun` |
| `SpreadsheetNode` | `xlsx` | `bun add --optional xlsx` |
| `HardwareInteractionNode` | `serialport`, `@serialport/parser-readline` | `bun add --optional serialport @serialport/parser-readline` |
| `RemoteExecutionNode` | `ssh2` | `bun add --optional ssh2` |
| `GitNode` | `simple-git` | `bun add --optional simple-git` |
| `WebSocketsNode` | `ws` | `bun add --optional ws` |
| `DuckDuckGoSearchNode`, `DataExtractorNode` (HTML) | `cheerio` | `bun add --optional cheerio` |
| `DataValidationNode` | `ajv`, `ajv-formats` | `bun add --optional ajv ajv-formats` |
| `SchedulerNode` (cron strings) | `node-cron` | `bun add --optional node-cron` |

If a package is missing, the error includes the exact command to install it. You can also inspect the map programmatically:

```javascript
import { OPTIONAL_DEPENDENCIES, optionalInstallCommand } from '@fractal-solutions/qflow/optional';

console.log(OPTIONAL_DEPENDENCIES.playwright); // 'playwright'
console.log(optionalInstallCommand('playwright')); // 'bun add --optional playwright'
```

## Logging

`qflow` provides a simple yet powerful logging mechanism that gives you per-node control over how and where log messages are sent.

### Basic Usage

By default, all built-in nodes will log to the console. You don't need to configure anything for this to work.

### Per-Node Logging Configuration

To customize the logging for a specific node, pass a `logging` object in its parameters. `type` selects the severity (`info`, `warn`, `error`, `debug`, `none`) and `method` selects the destination (`console`, `file`, `event`, `remote`).

```javascript
import { HttpRequestNode } from '@fractal-solutions/qflow/nodes';

const httpNode = new HttpRequestNode();

// This node will log to the console by default
httpNode.setParams({
  url: 'https://api.example.com/data'
});

// This node will log to a file
const anotherHttpNode = new HttpRequestNode();
anotherHttpNode.setParams({
  url: 'https://api.example.com/other-data',
  logging: {
    method: 'file',
    params: { filePath: './logs/http.log' }
  }
});
```

### Logging Methods

The following logging methods are available out of the box:

*   **`console` (default):** Logs messages to the console.
*   **`file`:** Appends log messages to a file.
    *   **params:** `{ filePath: string }`
*   **`event`:** Emits log messages through an event emitter.
    *   **params:** `{ emitter: EventEmitter }`
*   **`remote`:** Sends log messages to a remote server via a POST request.
    *   **params:** `{ url: string }`

### Examples

#### Logging to a File

```javascript
import { CodeInterpreterNode } from '@fractal-solutions/qflow/nodes';

const codeNode = new CodeInterpreterNode();
codeNode.setParams({
  code: 'print("Hello from Python!")',
  logging: {
    method: 'file',
    params: { filePath: './logs/code-interpreter.log' }
  }
});
```

#### Logging to an Event Emitter

This is useful for integrating `qflow`'s logging with your application's event system.

```javascript
import { EventEmitter } from 'events';
import { MemoryNode } from '@fractal-solutions/qflow/nodes';

const myEmitter = new EventEmitter();
myEmitter.on('log', (logEntry) => {
  console.log('Received log event:', logEntry);
});

const memoryNode = new MemoryNode();
memoryNode.setParams({
  action: 'store',
  content: 'This is a test memory.',
  logging: {
    method: 'event',
    params: { emitter: myEmitter }
  }
});
```

#### Disabling Logging for a Node

You can disable logging for a specific node by setting the `type` to `none`.

```javascript
const silentHttpNode = new HttpRequestNode();
silentHttpNode.setParams({
  url: 'https://api.example.com/silent',
  logging: {
    type: 'none'
  }
});
```

### Global Log Level

You can set a global log level to control the verbosity of all logs in your application. Only messages with a severity level equal to or higher than the current log level will be processed.

```javascript
import { setLogLevel, LogLevel } from '@fractal-solutions/qflow/logger';

// Set the global log level to INFO. 
// This will show INFO, WARN, and ERROR messages, but hide DEBUG messages.
setLogLevel(LogLevel.INFO);
```

The available log levels are, in order of severity:

*   `LogLevel.DEBUG`: Detailed information, useful for debugging.
*   `LogLevel.INFO`: General information about the application's state.
*   `LogLevel.WARN`: Indicates a potential problem that does not prevent the application from running.
*   `LogLevel.ERROR`: Indicates a serious error that prevented a specific operation from completing.
*   `LogLevel.NONE`: Disables all logging.

### Making Your Custom Nodes Loggable

You can make your own custom nodes loggable by following the same pattern as the built-in nodes.

1.  **Import the `log` function:**
    ```javascript
    import { log } from '@fractal-solutions/qflow/logger';
    ```

2.  **Call the `log` function:** In your node's methods, call the `log` function and pass `this.params.logging` as the second argument. This will allow users of your node to configure its logging behavior.

Here is an example of a custom node that implements loggable behavior:

```javascript
import { AsyncNode } from '@fractal-solutions/qflow';
import { log } from '@fractal-solutions/qflow/logger';

class MyCustomNode extends AsyncNode {
  async execAsync() {
    log('Starting execution of MyCustomNode', this.params.logging);
    // ... your node's logic ...

    log('Finished execution of MyCustomNode', this.params.logging);

    return 'default';
  }
}

// --- User of your node can now configure logging ---

const myNode = new MyCustomNode();

// This will log to the console (default)
myNode.setParams({ /* ... */ });

// This will log to a file
const anotherNode = new MyCustomNode();
anotherNode.setParams({
  /* ... */,
  logging: {
    method: 'file',
    params: { filePath: './my-custom-node.log' }
  }
});
```


## Agents

For a detailed explanation of the agents, see the [Agents documentation](documentation/agents.md). The tools available to agents are documented in the [Tools documentation](documentation/integrated_nodes.md).

### Extending Agents with Custom Tools

`qflow` agents can be extended with custom tools by defining your own Node classes and making them discoverable. This allows agents to leverage any custom logic or external integrations you build.

#### 1. Creating a Custom Tool Node

To create a custom node that can be used as a tool by an agent, your node class must:
*   Extend `AsyncNode`.
*   Implement a `static getToolDefinition()` method that returns a JSON Schema object describing the tool's name, description, and parameters.

Here's an example of a simple custom node that an agent could use as a tool:

```javascript
// my_nodes/MyCustomToolNode.js
import { AsyncNode } from '@fractal-solutions/qflow';

export class MyCustomToolNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "my_custom_tool",
      description: "A custom tool that greets the user with a personalized message.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the person to greet."
          },
          greeting: {
            type: "string",
            description: "Optional. The greeting message. Defaults to 'Hello'."
          }
        },
        required: ["name"]
      }
    };
  }

  async execAsync() {
    const { name, greeting = 'Hello' } = this.params;
    const message = `${greeting}, ${name}! Welcome to your custom tool.`;
    console.log(message);
    return { message: message };
  }

  async postAsync(shared, prepRes, execRes) {
    shared.customToolOutput = execRes.message;
    return 'default';
  }
}
```

#### 2. Making Custom Tools Discoverable

To make your custom tool nodes available to `qflow` agents, you need to specify their paths in a `qflow.config.js` file in your project's root directory.

First, create a `qflow.config.js` file if you don't have one:

```javascript
// qflow.config.js
/**
 * @type {import('./src/types').QFlowConfig}
 */
const qflowConfig = {
  customNodePaths: [
    './my_nodes/MyCustomToolNode.js', // Path to your custom node file
    // Add more paths for other custom nodes
  ],
};

export default qflowConfig;
```

The `customNodePaths` array should contain paths to your custom node files, relative to your project's root directory. `qflow` will automatically load these files, discover any `AsyncNode` classes with a `static getToolDefinition()` method, and register them as available tools for your agents.

Once configured, your agents will be able to "see" and utilize `my_custom_tool` just like any built-in tool, allowing for powerful and flexible agentic workflows tailored to your specific needs.


## Error Handling


`qflow` provides mechanisms to handle errors gracefully within your workflows.

*   **Node-level Error Handling:**
    *   Synchronous `Node`s: If an error occurs in `prep` or `exec`, it will be caught by the flow and propagate up. You can implement `execFallback(prepRes, error)` in your `Node` subclass to provide a fallback mechanism when `exec` fails after all retries.
    *   Asynchronous `AsyncNode`s: Similarly, `prepAsync` or `execAsync` can throw errors. Implement `execFallbackAsync(prepRes, error)` for asynchronous fallbacks.
*   **Flow-level Error Handling:**
    *   When you run a flow using `flow.run(sharedState)` or `await flow.runAsync(sharedState)`, any unhandled errors from within the nodes will propagate up and can be caught using standard JavaScript `try...catch` blocks around the `run` or `runAsync` call. This allows you to manage errors at the workflow level.

```javascript
import { Node, Flow } from '@fractal-solutions/qflow';

class FailingNode extends Node {
  exec() {
    throw new Error("Something went wrong in FailingNode!");
  }
  execFallback(prepRes, error) {
    console.error("FailingNode fallback triggered:", error.message);
    return "Fallback successful!";
  }
}

const failingNode = new FailingNode();
const errorFlow = new Flow(failingNode);

try {
  const result = errorFlow.run({});
  console.log("Flow completed with result:", result);
} catch (error) {
  console.error("Flow failed with unhandled error:", error.message);
}
// Expected output:
// FailingNode fallback triggered: Something went wrong in FailingNode!
// Flow completed with result: Fallback successful!
```

## Debugging

Debugging `qflow` workflows can be done using standard JavaScript debugging tools and techniques.

*   **`console.log`:** The simplest way to inspect data and execution flow. Strategically place `console.log` statements within `prep`, `exec`, `post`, and their `Async` counterparts to trace the `shared` object, `prepRes`, and `execRes` values.
*   **Debugger:** Use your IDE's built-in debugger or Bun's inspector (`bun --inspect`). Set breakpoints within your node's lifecycle methods to step through the execution and examine the state.
*   **Error Messages:** Pay close attention to the error messages and stack traces. `qflow` aims to provide clear error messages that point to the source of the problem within your nodes.

## Testing

Testing `qflow` workflows involves unit testing individual nodes and integration testing entire flows.

*   **Unit Testing Nodes:**
    *   Test each `Node` or `AsyncNode` subclass in isolation.
    *   Mock external dependencies (e.g., API calls for `LLMNode`, `GitHubNode`) to ensure tests are fast and reliable.
    *   Verify the behavior of `prep`, `exec`, `post`, and their `Async` counterparts, as well as `setParams` and `execFallback`.
*   **Integration Testing Flows:**
    *   Test entire `Flow`s or `AsyncFlow`s to ensure nodes are chained correctly and data flows as expected.
    *   Provide controlled `shared` state inputs and assert on the final `shared` state or the flow's return value.
    *   Use Bun's built-in test runner (`bun test`).

```javascript
// Example (using Bun's test runner syntax)
import { test, expect } from "bun:test";
import { Node, Flow } from '@fractal-solutions/qflow';

class TestNodeA extends Node {
  prep(shared) { return shared.initialValue + 1; }
  exec(prepRes) { return prepRes; }
  post(shared, prepRes, execRes) { shared.value = execRes; return 'default'; }
}

class TestNodeB extends Node {
  prep(shared) { return shared.value; }
  exec(prepRes) { return prepRes * 2; }
  post(shared, prepRes, execRes) { shared.value = execRes; return 'default'; }
}

test("Simple Flow should process data correctly", () => {
  const nodeA = new TestNodeA();
  const nodeB = new TestNodeB();
  nodeA.next(nodeB);

  const flow = new Flow(nodeA);
  const sharedState = { initialValue: 5 };
  flow.run(sharedState);

  // Flow.run() returns the last action, so assert on shared state.
  expect(sharedState.value).toBe(12);
});

test("Node should handle parameters via setParams", () => {
  class ParamNode extends Node {
    exec() { return this.params.value; }
  }
  const node = new ParamNode();
  node.setParams({ value: "hello" });
  const result = node.run({});
  expect(result).toBe("hello");
});
```

2.0 also ships deterministic trace helpers:

```javascript
import { test, expect } from 'bun:test';
import { AsyncFlow } from '@fractal-solutions/qflow';
import { MockLLMNode, recordFlow, createTraceSnapshot } from '@fractal-solutions/qflow/testing';

test('agent prompts the LLM', async () => {
  const llm = new MockLLMNode({ responses: ['done'] });
  const flow = new AsyncFlow(llm);
  const recorder = recordFlow(flow);

  await flow.runAsync({ prompt: 'Hello' });

  expect(llm.calls).toHaveLength(1);
  expect(createTraceSnapshot(recorder.events)).toMatchSnapshot();
});
```

## Integration

`qflow` is designed to be highly flexible and can be integrated into various application architectures:

*   **CLI Tools:** Build powerful command-line tools that automate complex tasks.
*   **Web Servers (e.g., Express.js, Koa):** Implement API endpoints that trigger workflows for data processing, background jobs, or agent-driven responses.
*   **Background Services:** Run long-running processes or scheduled tasks.
*   **Bun Services and Scripts:** Use `Bun.spawn`, `bun:sqlite`, and streaming `fetch` alongside workflows. Reach for the optional integration packages only when a node needs them.

## Contributing

We welcome contributions! Please see our GitHub repository for more details on how to contribute.


