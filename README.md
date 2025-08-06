# qflow: A Lightweight and Flexible JavaScript Workflow and Agent Library

`qflow` is a lightweight and flexible JavaScript library designed for creating and managing complex workflows and autonomous agents. It provides a minimalist yet expressive API to define sequences of operations, manage data flow, and orchestrate execution, supporting both synchronous and asynchronous patterns.

With zero external dependencies for its core functionality, `qflow` is built for performance and seamless integration into any JavaScript environment, from Node.js backends to browser-based applications.

## Features

*   **Modular & Extensible:** Easily define custom nodes and compose them into complex, reusable flows.
*   **Synchronous & Asynchronous Flows:** Supports both blocking and non-blocking execution models.
*   **Shared State Management:** Pass and manipulate data across nodes using a central, mutable `shared` object.
*   **Batch Processing:** Efficiently process collections of data through dedicated batch nodes and flows, including parallel execution.
*   **Retry Mechanisms:** Built-in support for retrying failed operations with configurable delays.
*   **Conditional Transitions:** Define dynamic flow paths based on execution outcomes.
*   **Built-in Integrations:** Comes with pre-built nodes for common tasks like LLM interactions, web scraping, and popular API integrations (GitHub, HackerNews, Stripe).

## Installation

You can install `qflow` via npm or Bun:

```bash
npm install @fractal-solutions/qflow
# or
bun add @fractal-solutions/qflow
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
*   `transition(action)`: Initiates a conditional transition to another node, allowing for dynamic branching.

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

### ConditionalTransition

A helper class used in conjunction with `Node.transition()` to define conditional branching within your workflows.

*   `to(targetNode)`: Specifies the target node for the transition based on the action returned by the preceding node.


## What Can We Do Now That We Have Agents?


  The introduction of the AgentNode is a game-changer for qflow. It shifts the paradigm from
  pre-defined, static workflows to dynamic, intelligent, and autonomous task execution.

  Here are some key capabilities and applications unlocked by having agents:


   1. Autonomous Goal Achievement: Agents can now take high-level, open-ended goals (e.g.,
      "Research the best AI frameworks for 2025") and dynamically break them down into
      sub-tasks, selecting and executing the appropriate tools (web search, web scraper, LLM
      for summarization) to achieve the objective.
   2. Complex Problem Solving: Agents can tackle multi-step problems that require iterative
      reasoning, external information gathering, and dynamic decision-making based on
      observations. They can adapt their plan as they go.
   3. Self-Correction and Robustness: With the "Reason -> Act -> Observe" loop, agents can
      identify when a tool fails or produces unexpected results. They can then use their LLM
      reasoning to diagnose the problem and attempt alternative strategies or tools.
   4. Dynamic Workflow Generation: Instead of you explicitly defining every step of a workflow,
      the agent generates its own execution path at runtime, choosing tools as needed. This
      makes qflow highly adaptable to unforeseen circumstances.
   5. Enhanced Automation: Automate tasks that previously required human intervention, complex
      branching logic, or rigid, brittle scripts. Agents can handle variability and
      uncertainty.
   6. Interactive Assistants: Combined with the UserInputNode, agents can become truly
      interactive. They can ask clarifying questions, seek approval for critical actions, or
      provide progress updates, making them more collaborative.
   7. Data Analysis and Reporting: Agents can gather data from various sources (web, files,
      APIs), process it (potentially with a future code interpreter), and then synthesize
      findings into structured reports or summaries.
   8. Research and Information Synthesis: Agents can research topics, scrape relevant pages,
      and synthesize information into comprehensive answers or documents, acting as automated
      research assistants.



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

### 7. Inter-Node Communication with Shared State (Advanced Example)

Demonstrates how to pass data between nodes using the `shared` object, particularly important in asynchronous workflows. This example showcases two LLM nodes interacting, where the output of the first influences the input of the second.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DeepSeekLLMNode } from '@fractal-solutions/qflow/nodes';

// Node representing the "Apologist" personality
class ApologistNode extends DeepSeekLLMNode {
  // preparePrompt now receives the shared object
  preparePrompt(shared) {
    const { topic } = this.params;
    this.params.prompt = `You are an eloquent apologist. Your task is to defend the following topic with a concise, positive, and persuasive argument, no more than 3 sentences: "${topic}"`;
  }

  // postAsync is used to ensure shared state is updated after async execution
  async postAsync(shared, prepRes, execRes) {
    shared.apologistArgument = execRes; // Store the argument in shared state
    return 'default'; // Signal default transition
  }
}

// Node representing the "Heretic" personality
class HereticNode extends DeepSeekLLMNode {
  // preparePrompt now receives the shared object
  preparePrompt(shared) {
    const { apologistArgument } = shared; // Access the argument from shared state

    if (!apologistArgument) {
      throw new Error("Apologist's argument is missing from shared state. Cannot critique.");
    }

    this.params.prompt = `You are a skeptical heretic. Your task is to critically analyze and briefly refute or find a flaw in the following argument, no more than 3 sentences: "${apologistArgument}"`;
  }

  // postAsync is used to ensure shared state is updated after async execution
  async postAsync(shared, prepRes, execRes) {
    shared.hereticCritique = execRes; // Store the critique in shared state
    return execRes; // Return the critique as the node's result
  }
}

(async () => {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; // Ensure this is set in .env or env vars

  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DeepSeek API key is not set. Please configure it to run this example.");
    return;
  }

  console.log('--- Starting Apologist vs. Heretic LLM Workflow ---');

  const topicInput = prompt("Enter a topic for the Apologist to defend (e.g., 'The benefits of remote work'):\nYour topic: ");

  if (!topicInput) {
    console.log("No topic provided. Exiting.");
    return;
  }

  const apologist = new ApologistNode();
  apologist.setParams({ apiKey: DEEPSEEK_API_KEY, topic: topicInput });

  const heretic = new HereticNode();
  heretic.setParams({ apiKey: DEEPSEEK_API_KEY });

  apologist.next(heretic);

  const debateFlow = new AsyncFlow(apologist);

  try {
    const sharedState = {}; // Initialize an empty shared state object
    await debateFlow.runAsync(sharedState); // Run the flow, passing the shared state

    console.log('\n--- The Debate Unfolds ---');
    console.log('Topic:', topicInput);
    console.log('\nApologist\'s Argument:');
    console.log(sharedState.apologistArgument);
    console.log('\nHeretic\'s Critique:');
    console.log(sharedState.hereticCritique);
    console.log('\n--- Workflow Finished ---');

  } catch (error) {
    console.error('--- Workflow Failed ---', error);
  }
})();

```

### 8. Shell Command Example

Executing a shell command and printing the output.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { ShellCommandNode } from '@fractal-solutions/qflow/nodes';

const listFiles = new ShellCommandNode();
listFiles.setParams({ command: 'ls -l' });

listFiles.postAsync = async (shared, prepRes, execRes) => {
  console.log('--- File Listing ---');
  console.log(execRes.stdout);
  return 'default';
};

const flow = new AsyncFlow(listFiles);
await flow.runAsync({});
```

### 9. File System Example

Writing to a file and then reading it back.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { WriteFileNode, ReadFileNode } from '@fractal-solutions/qflow/nodes';

const writeFile = new WriteFileNode();
writeFile.setParams({ filePath: './hello.txt', content: 'Hello, qflow!\n' });

const readFile = new ReadFileNode();
readFile.setParams({ filePath: './hello.txt' });

readFile.postAsync = async (shared, prepRes, execRes) => {
  console.log('--- File Content ---');
  console.log(execRes);
  return 'default';
};

writeFile.next(readFile);

const flow = new AsyncFlow(writeFile);
await flow.runAsync({});
```

### 10. Generic HTTP Request Example

Making a GET request to a public API and printing the response.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { HttpRequestNode } from '@fractal-solutions/qflow/nodes';

const getPost = new HttpRequestNode();
getPost.setParams({
  url: 'https://jsonplaceholder.typicode.com/posts/1',
  method: 'GET'
});

getPost.postAsync = async (shared, prepRes, execRes) => {
  console.log('--- API Response ---');
  console.log('Status:', execRes.status);
  console.log('Body:', execRes.body);
  return 'default';
};

const flow = new AsyncFlow(getPost);
await flow.runAsync({});
```

### 11. Web Search Example

Performing web searches using both a free metasearch engine and a commercial API.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DuckDuckGoSearchNode, GoogleSearchNode } from '@fractal-solutions/qflow/nodes';

// Example 1: Using DuckDuckGo (no API key needed)
const ddgSearch = new DuckDuckGoSearchNode();
ddgSearch.setParams({ query: 'qflow library github' });
ddgSearch.postAsync = async (shared, prepRes, execRes) => {
  console.log('\n--- DuckDuckGo Search Results ---');
  execRes.slice(0, 5).forEach(r => console.log(`- ${r.title}: ${r.link}`));
  return 'default';
};

// Example 2: Using Google Custom Search (requires API key and CSE ID)
const googleSearch = new GoogleSearchNode();
googleSearch.setParams({
  query: 'qflow framework benefits',
  apiKey: process.env.GOOGLE_API_KEY, // Set this env var
  cseId: process.env.GOOGLE_CSE_ID   // Set this env var
});
googleSearch.postAsync = async (shared, prepRes, execRes) => {
  console.log('\n--- Google Search Results ---');
  execRes.slice(0, 5).forEach(r => console.log(`- ${r.title}: ${r.link}`));
  return 'default';
};

// Chain them or run independently
const flow1 = new AsyncFlow(ddgSearch);
await flow1.runAsync({});

// Uncomment the following lines to run the Google Search example
// const flow2 = new AsyncFlow(googleSearch);
// await flow2.runAsync({});
```

### 12. Interactive Agent Example

An agent that takes a goal from user input and uses its tools to achieve it.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import {
  AgentDeepSeekLLMNode,
  DuckDuckGoSearchNode,
  ShellCommandNode,
  ReadFileNode,
  WriteFileNode,
  HttpRequestNode,
  ScrapeURLNode, 
  UserInputNode,
  AgentNode
} from '@fractal-solutions/qflow/nodes';

// Ensure your DeepSeek API Key is set as an environment variable
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the Interactive Agent example.");
    return;
  }

  console.log('--- Running Interactive Agent Test Workflow ---');

  // 1. Node to get the goal from the user
  const getGoalNode = new UserInputNode();
  getGoalNode.setParams({ prompt: 'Please enter the agent\'s goal: ' });

  // 2. Instantiate the LLM for the agent's reasoning
  const agentLLM = new AgentDeepSeekLLMNode();
  agentLLM.setParams({ apiKey: DEEPSEEK_API_KEY });

  // 3. Instantiate the tools the agent can use
  const duckduckgoSearch = new DuckDuckGoSearchNode();
  const shellCommand = new ShellCommandNode();
  const readFile = new ReadFileNode();
  const writeFile = new WriteFileNode();
  const httpRequest = new HttpRequestNode();
  const webScraper = new ScrapeURLNode();
  const userInput = new UserInputNode(); // Agent can also ask for user input

  // Map tool names to their instances
  const availableTools = {
    duckduckgo_search: duckduckgoSearch,
    shell_command: shellCommand,
    read_file: readFile,
    write_file: writeFile,
    http_request: httpRequest,
    web_scraper: webScraper,
    user_input: userInput,
    // Add other tools as needed
  };

  // 4. Instantiate the AgentNode
  const agent = new AgentNode(agentLLM, availableTools);
  // The goal will be set dynamically from the UserInputNode's output
  agent.prepAsync = async (shared) => {
    agent.setParams({ goal: shared.userInput });
  };

  // 5. Chain the nodes: Get Goal -> Agent
  getGoalNode.next(agent);

  // 6. Create and run the flow
  const interactiveAgentFlow = new AsyncFlow(getGoalNode);

  try {
    const finalResult = await interactiveAgentFlow.runAsync({});
    console.log('\n--- Interactive Agent Test Workflow Finished ---');
    console.log('Final Agent Output:', finalResult);
  } catch (error) {
    console.error('\n--- Interactive Agent Test Workflow Failed ---', error);
  }
})();
```


## Exploring More Examples

The examples above cover the core functionalities of `qflow`. For more advanced and specific use cases involving the built-in integrations, please explore the [`examples/` folder](https://github.com/fractal-solutions/qflow/tree/main/examples) in the project's GitHub repository. There you will find detailed scripts demonstrating how to use nodes for:

*   **LLMs (DeepSeek, OpenAI, Gemini):** The core of agentic behavior.
    *   For agents, use specialized LLM nodes like `AgentDeepSeekLLMNode` or `AgentOpenAILLMNode`.
*   **Agent:** Orchestrating tools and LLM reasoning to achieve complex goals.
*   **Interactive Agent:** An agent that takes a goal from user input and uses its tools to achieve it.
*   **Shell:** For system-level interaction and execution.
*   **HTTP:** For universal API access.
*   **FileSystem:** For reading and writing local data.
*   **User Input:** For human-in-the-loop control.
*   **Web Search:** Discovering information on the web using either:
    *   `DuckDuckGoSearchNode`: API-key-free, using DuckDuckGo's HTML interface.
    *   `GoogleSearchNode`: Requires a Google API Key and Custom Search Engine ID for more robust results.
*   **WebScraper:** For targeted data extraction.
*   **GitHub:** Creating and managing issues.
*   **HackerNews:** Fetching top stories and item details.
*   **Stripe:** Creating charges and retrieving account balances.

These examples are a great resource for understanding how to leverage `qflow` to its full potential.


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

---
