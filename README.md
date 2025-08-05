# qflow: A Lightweight and Flexible JavaScript Workflow and Agent Library

`qflow` is a lightweight and flexible JavaScript library designed for creating and managing complex workflows and autonomous agents. Inspired by the simplicity and power of flow-based programming, `qflow` provides a minimalist yet expressive API to define sequences of operations, handle data flow, and manage execution, both synchronously and asynchronously.

With zero external dependencies for its core functionality, `qflow` is built for performance and ease of integration into any JavaScript environment, from Node.js backends to browser-based applications.

## Features

*   **Modular & Extensible:** Easily define custom nodes and compose them into complex flows.
*   **Synchronous & Asynchronous Flows:** Supports both blocking and non-blocking execution patterns.
*   **Batch Processing:** Efficiently process collections of data through dedicated batch nodes and flows.
*   **Retry Mechanisms:** Built-in support for retrying failed operations with configurable delays.
*   **Conditional Transitions:** Define dynamic flow paths based on execution outcomes.
*   **Built-in Nodes:** Comes with pre-built nodes for common tasks like LLM interactions, web scraping, and API integrations (GitHub, HackerNews, Stripe).

## Installation

You can install `qflow` via npm or Bun:

```bash
npm install @fractal-solutions/qflow
# or
bun add @fractal-solutions/qflow
```

## Core Abstractions

`qflow` is built around a few core abstractions that allow you to define powerful and flexible workflows.

### Node

The fundamental building block of any `qflow` workflow. A `Node` represents a single operation or step in your flow.

*   `prep(shared)`: Prepares data for execution.
*   `exec(prepRes)`: Executes the node's primary logic.
*   `post(shared, prepRes, execRes)`: Processes the result of `exec`.
*   `setParams(params)`: Sets parameters for the node.
*   `next(node, action = "default")`: Chains this node to another, defining the next step in the flow.
*   `transition(action)`: Initiates a conditional transition to another node.

**Asynchronous Nodes (`AsyncNode`, `AsyncBatchNode`, `AsyncParallelBatchNode`)**
For operations that involve I/O or are inherently asynchronous, `qflow` provides `AsyncNode` and its variants. These nodes use `async`/`await` for non-blocking execution.

### Flow

A `Flow` orchestrates the execution of a sequence of `Node`s. It defines the overall path and manages the transitions between nodes.

*   `start(startNode)`: Sets the initial node for the flow. (Note: In practice, you often pass the start node directly to the `Flow` constructor).
*   `_orch(shared, params)` / `_orchAsync(shared, params)`: Internal methods used to run the flow, especially when passing initial parameters to the starting node.

**Batch Flows (`BatchFlow`, `AsyncBatchFlow`, `AsyncParallelBatchFlow`)**
These flows are designed to process collections of items, running a sub-flow for each item in the batch. `AsyncParallelBatchFlow` executes batch items concurrently.

### ConditionalTransition

A helper class used with `Node.transition()` to define conditional branching in your flows.

*   `to(targetNode)`: Specifies the target node for the transition.

## Basic Usage & Examples

More detailed implementations available in the [examples](examples/) directory.

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

Using `transition()` for dynamic branching based on an action.

```javascript
import { Node, Flow } from '@fractal-solutions/qflow';

class ConditionalNode extends Node {
  constructor(shouldGoLeft) {
    super();
    this.shouldGoLeft = shouldGoLeft;
  }

  exec() {
    if (this.shouldGoLeft) {
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

const conditionalNode = new ConditionalNode(true);
const leftNode = MessageNode('Went Left');
const rightNode = MessageNode('Went Right');

conditionalNode.next(leftNode, 'left');
conditionalNode.next(rightNode, 'right');

const conditionalFlow = new Flow(conditionalNode);
conditionalFlow.run({});
// Expected output:
// ConditionalNode: Going left
// Went Left

const conditionalNode2 = new ConditionalNode(false);
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

### 5. Batch Processing

Processing multiple items through a flow.

```javascript
import { Node, BatchFlow, AsyncParallelBatchFlow, AsyncNode } from '@fractal-solutions/qflow';

// Synchronous Batch Flow
console.log('\n--- Running Synchronous Batch Flow ---');

class MyBatchNode extends Node {
  exec() {
    console.log(`BatchNode: Processing item ${this.params.item}`);
    return 'default';
  }
}

const batchNode = new MyBatchNode();
const batchFlow = new BatchFlow(batchNode);
batchFlow.prep = () => [ { item: 1 }, { item: 2 }, { item: 3 } ];
batchFlow.run({});
// Expected output:
// BatchNode: Processing item 1
// BatchNode: Processing item 2
// BatchNode: Processing item 3

// Asynchronous Parallel Batch Flow
console.log('\n--- Running Asynchronous Parallel Batch Flow ---');

class MyAsyncParallelBatchNode extends AsyncNode {
  async execAsync() {
    console.log(`AsyncParallelBatchNode: Starting item ${this.params.item}`);
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    console.log(`AsyncParallelBatchNode: Finished item ${this.params.item}`);
    return 'default';
  }
}

const asyncParallelBatchNode = new MyAsyncParallelBatchNode();
const asyncParallelBatchFlow = new AsyncParallelBatchFlow(asyncParallelBatchNode);
asyncParallelBatchFlow.prepAsync = async () => [ { item: 1 }, { item: 2 }, { item: 3 }, { item: 4 }, { item: 5 } ];
await asyncParallelBatchFlow.runAsync({});
// Expected output (order may vary due to parallel execution):
// AsyncParallelBatchNode: Starting item 1
// AsyncParallelBatchNode: Starting item 2
// ...
// AsyncParallelBatchNode: Finished item 1
// AsyncParallelBatchNode: Finished item 2
// ...
```

### 6. Retry Mechanism

Configuring a node to retry on failure.

```javascript
import { Node, Flow } from '@fractal-solutions/qflow';

let retryCount = 0;
class RetryNode extends Node {
  constructor() {
    super(3, 0.1); // 3 retries, 0.1s wait
  }

  exec() {
    retryCount++;
    if (retryCount < 3) {
      console.log(`RetryNode: Failing, attempt ${retryCount}`);
      throw new Error('Failed!');
    } else {
      console.log('RetryNode: Succeeded!');
      return 'default';
    }
  }

  execFallback(prepRes, error) {
    console.log('RetryNode: Fallback executed');
  }
}

const retryNode = new RetryNode();
const retryFlow = new Flow(retryNode);
retryFlow.run({});
// Expected output:
// RetryNode: Failing, attempt 1
// RetryNode: Failing, attempt 2
// RetryNode: Succeeded!
```

## Built-in Nodes

`qflow` comes with a set of pre-built nodes to accelerate common development tasks. These are available via `@fractal-solutions/qflow/nodes`.

*   **`LLMNode`**: Interact with Large Language Models (e.g., for text generation, summarization).
*   **`HackerNewsNode`**: Fetch data from the Hacker News API.
*   **`GitHubNode`**: Interact with the GitHub API (e.g., fetch repository details, user info).
*   **`StripeNode`**: Integrate with the Stripe API for payment processing.
*   **`WebScraperNode`**: Perform web scraping tasks to extract data from web pages.

**Example: Using a Built-in Node (WebScraperNode)**

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { ScrapeURLNode } from '@fractal-solutions/qflow/nodes'; // Correct import for WebScraperNode

// Define a flow to scrape a URL and display its title
class ScrapeTitleFlow extends AsyncFlow {
  constructor() {
    super();
    const scraper = new ScrapeURLNode(); // Use ScrapeURLNode as per examples
    scraper.setParams({
      url: 'https://example.com',
      selectors: {
        title: 'h1' // Select the h1 tag
      }
    });
    this.start(scraper); // Set the starting node for the flow
  }
}

async function runScrapeFlow() {
  const flow = new ScrapeTitleFlow();
  // Run the flow. The result will be the output of the last node in the flow.
  const result = await flow.runAsync({});
  console.log('Scraped Title:', result.title);
}

runScrapeFlow();
// Expected output (will vary based on example.com content):
// Scraped Title: Example Domain
```

## Integration

`qflow` is designed to be highly flexible and can be integrated into various application architectures:

*   **CLI Tools:** Build powerful command-line tools that automate complex tasks.
*   **Web Servers (e.g., Express.js, Koa):** Implement API endpoints that trigger workflows for data processing, background jobs, or agent-driven responses.
*   **Background Services:** Run long-running processes or scheduled tasks.
*   **Browser Applications:** Create interactive, client-side workflows (ensure appropriate polyfills for `SharedArrayBuffer` if using synchronous `wait` in `Node`).

## Contributing

We welcome contributions! Please see our GitHub repository for more details on how to contribute.

---
