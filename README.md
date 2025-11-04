# qflow: A Lightweight and Flexible JavaScript Workflow and Agent Library

`qflow` is a lightweight and flexible JavaScript library designed for creating and managing complex workflows and autonomous agents. It provides a minimalist yet expressive API to define sequences of operations, manage data flow, and orchestrate execution, supporting both synchronous and asynchronous patterns.

## Features

*   **Modular & Extensible:** Easily define custom nodes and compose them into complex, reusable flows.
*   **Synchronous & Asynchronous Flows:** Supports both blocking and non-blocking execution models.
*   **Shared State Management:** Pass and manipulate data across nodes using a central, mutable `shared` object.
*   **Batch Processing:** Efficiently process collections of data through dedicated batch nodes and flows, including parallel execution.
*   **Agents:** Built upon the `qflow` core functionality are plug and play agents with extensive tool integrations available.
*   **Built-in Integrations:** Comes with pre-built nodes for multiple tasks like LLM interactions, browser use, pdf tools, webhooks, spreadsheet manipulation, code interpretation, media manipulation, web scraping, and popular API integrations (GitHub, Git, Open Router, HackerNews, Stripe, Maps).
*   **Custom Agent Tools:** Build your own Agent tools using the flow registry pattern.

## Installation

You can install `qflow` via npm or Bun:

```bash
npm install @fractal-solutions/qflow
# or
bun add @fractal-solutions/qflow
```

To get started quickly with a new project, you can use the `create-qflow` tool:

```bash
bunx create-qflow@latest <project-name>
```

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
*   `prepAsync(shared)`
*   `execAsync(prepRes, shared)`
*   `postAsync(shared, prepRes, execRes)`
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


## Agents

For a detailed explanation of the agents, see the [Agents documentation](documentation/agents.md). The tools available to agents are documented in the [Tools documentation](documentation/integrated_nodes.md).

## Integrated Nodes and their Examples

For a detailed explanation of the integrated nodes and their examples, see the [Integrated Nodes documentation](documentation/nodes/index.md).


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
*   **Debugger:** Use your IDE's built-in debugger (e.g., VS Code's debugger) or Node.js/Bun's inspector (`node --inspect` or `bun --inspect`). Set breakpoints within your node's lifecycle methods to step through the execution and examine the state.
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
    *   Use your preferred testing framework (e.g., Jest, Mocha, Bun's built-in test runner).

```javascript
// Example (using Bun's test runner syntax)
import { test, expect } from "bun:test";
import { Node, Flow } from '@fractal-solutions/qflow';

class TestNodeA extends Node {
  exec(input) { return input + 1; }
}

class TestNodeB extends Node {
  exec(input) { return input * 2; }
}

test("Simple Flow should process data correctly", () => {
  const nodeA = new TestNodeA();
  const nodeB = new TestNodeB();
  nodeA.next(nodeB);

  const flow = new Flow(nodeA);
  const sharedState = { initialValue: 5 };
  const result = flow.run(sharedState); // Assuming run returns the final execRes of the last node

  expect(result).toBe(12); // (5 + 1) * 2 = 12
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

## Integration

`qflow` is designed to be highly flexible and can be integrated into various application architectures:

*   **CLI Tools:** Build powerful command-line tools that automate complex tasks.
*   **Web Servers (e.g., Express.js, Koa):** Implement API endpoints that trigger workflows for data processing, background jobs, or agent-driven responses.
*   **Background Services:** Run long-running processes or scheduled tasks.
*   **Browser Applications:** Create interactive, client-side workflows (ensure appropriate polyfills for `SharedArrayBuffer` if using synchronous `wait` in `Node`).

## Contributing

We welcome contributions! Please see our GitHub repository for more details on how to contribute.



