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

class AddNode extends Node {
  exec(input) { return input + 5; }
}

class MultiplyNode extends Node {
  exec(input) { return input * 2; }
}

const add = new AddNode();
const multiply = new MultiplyNode();

// Chain the nodes
add.next(multiply);

// Create the flow, starting with the 'add' node
const flow = new Flow(add);

// Run the flow. Initial parameters can be passed via the second argument to _orch.
const result = flow._orch(null, { params: 10 });
console.log('Flow result:', result); // Expected: 30 ((10 + 5) * 2)
```

### 3. Conditional Flow

Using `transition()` for dynamic branching based on an action.

```javascript
import { Node, Flow } from '@fractal-solutions/qflow';

class CheckValueNode extends Node {
  exec(value) {
    if (value > 10) {
      return 'greater';
    } else {
      return 'lessOrEqual';
    }
  }
}

class GreaterNode extends Node {
  exec() { return 'Value is greater than 10'; }
}

class LessOrEqualNode extends Node {
  exec() { return 'Value is less than or equal to 10'; }
}

const check = new CheckValueNode();
const greater = new GreaterNode();
const lessOrEqual = new LessOrEqualNode();

// Chain the nodes with conditional transitions
check.transition('greater').to(greater);
check.transition('lessOrEqual').to(lessOrEqual);

// Create the flow, starting with the 'check' node
const flow = new Flow(check);

let result1 = flow._orch(null, { params: 15 }); // Pass params directly to _orch
console.log(result1); // Expected: Value is greater than 10

let result2 = flow._orch(null, { params: 7 });
console.log(result2); // Expected: Value is less than or equal to 10
```

### 4. Asynchronous Flow

Handling asynchronous operations within a flow.

```javascript
import { AsyncNode, AsyncFlow } from '@fractal-solutions/qflow';

class FetchDataNode extends AsyncNode {
  async execAsync(url) {
    console.log(`Fetching data from: ${url}`);
    // Simulate an API call
    return new Promise(resolve => setTimeout(() => resolve(`Data from ${url}`), 100));
  }
}

class ProcessDataNode extends AsyncNode {
  async execAsync(data) {
    console.log(`Processing: ${data}`);
    return data.toUpperCase();
  }
}

const fetchNode = new FetchDataNode();
const processNode = new ProcessDataNode();

// Chain the nodes
fetchNode.next(processNode);

// Create the async flow, starting with the 'fetchNode'
const asyncFlow = new AsyncFlow(fetchNode);

async function runAsyncFlow() {
  // Run the flow, passing the URL as an initial parameter to the first node
  const result = await asyncFlow._orchAsync(null, { params: 'https://api.example.com/data' });
  console.log('Async Flow Result:', result);
}

runAsyncFlow();
// Expected output:
// Fetching data from: https://api.example.com/data
// Processing: Data from https://api.example.com/data
// Async Flow Result: DATA FROM HTTPS://API.EXAMPLE.COM/DATA
```

### 5. Batch Processing

Processing multiple items through a flow.

```javascript
import { Node, BatchFlow } from '@fractal-solutions/qflow';

class ProcessItemNode extends Node {
  exec(item) {
    return `Processed: ${item}`;
  }
}

const processItem = new ProcessItemNode();

// Create the batch flow, starting with the 'processItem' node
const batchFlow = new BatchFlow(processItem);

// Define the items to process. For BatchFlow, the prep method should return an array.
batchFlow.prep = () => ['itemA', 'itemB', 'itemC'];

const results = batchFlow.run({}); // Run the batch flow
console.log('Batch Flow Results:', results);
// Expected output:
// Batch Flow Results: [ 'Processed: itemA', 'Processed: itemB', 'Processed: itemC' ]
```

### 6. Retry Mechanism

Configuring a node to retry on failure.

```javascript
import { Node } from '@fractal-solutions/qflow';

let attempt = 0;
class FlakyNode extends Node {
  constructor() {
    super(3, 0.1); // maxRetries = 3, wait = 0.1 seconds
  }

  exec(input) {
    attempt++;
    console.log(`FlakyNode attempt ${attempt} for input: ${input}`);
    if (attempt < 3) {
      throw new Error('Simulated failure');
    }
    return `Success on attempt ${attempt}`;
  }

  execFallback(prepRes, error) {
    console.error('FlakyNode failed after retries:', error.message);
    return 'Fallback result due to persistent failure';
  }
}

const flakyNode = new FlakyNode();
const result = flakyNode.run('test');
console.log('Flaky Node Result:', result);
// Expected output (may vary slightly due to timing):
// FlakyNode attempt 1 for input: test
// FlakyNode attempt 2 for input: test
// FlakyNode attempt 3 for input: test
// Flaky Node Result: Success on attempt 3
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