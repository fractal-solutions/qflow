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


  The introduction of the `AgentNode` is a game-changer for qflow. It shifts the paradigm from
  pre-defined, static workflows to dynamic, intelligent, and autonomous task execution.

  Here are some key capabilities and applications unlocked by having agents:


   1. **Autonomous Goal Achievement:** Agents can now take high-level, open-ended goals (e.g.,
      "Research the best AI frameworks for 2025") and dynamically break them down into
      sub-tasks, selecting and executing the appropriate tools (web search, web scraper, LLM
      for summarization) to achieve the objective.
   2. **Complex Problem Solving:** Agents can tackle multi-step problems that require iterative
      reasoning, external information gathering, and dynamic decision-making based on
      observations. They can adapt their plan as they go.
   3. **Self-Correction and Robustness:** With the **"Reason -> Act -> Observe"** loop, agents can
      identify when a tool fails or produces unexpected results. They can then use their LLM
      reasoning to diagnose the problem and attempt alternative strategies or tools.
   4. **Dynamic Workflow Generation:** Instead of you explicitly defining every step of a workflow,
      the agent generates its own execution path at runtime, choosing tools as needed. This
      makes qflow highly adaptable to unforeseen circumstances.
   5. **Enhanced Automation:** Automate tasks that previously required human intervention, complex
      branching logic, or rigid, brittle scripts. Agents can handle variability and
      uncertainty.
   6. **Interactive Assistants:** Combined with the UserInputNode, agents can become truly
      interactive. They can ask clarifying questions, seek approval for critical actions, or
      provide progress updates, making them more collaborative.
   7. **Data Analysis and Reporting:** Agents can gather data from various sources (web, files,
      APIs), process it (potentially with a future code interpreter), and then synthesize
      findings into structured reports or summaries.
   8. **Research and Information Synthesis:** Agents can research topics, scrape relevant pages,
      and synthesize information into comprehensive answers or documents, acting as automated
      research assistants.

## How to use the Docs and Examples


The examples in [Basic Usage & Examples](#basic-usage--examples) below will cover the core functionalities of `qflow`. For more advanced and specific use cases involving the built-in integrations, please explore the [`examples/` folder](https://github.com/fractal-solutions/qflow/tree/main/examples) in the project's GitHub repository. There you will find detailed scripts demonstrating how to use nodes for:

*   [**LLMs (DeepSeek, OpenAI, Gemini, Ollama, Hugging Face):**](#7-inter-node-communication-with-shared-state-advanced-example) The core of agentic behavior.
    *   For agents, use specialized LLM nodes like `AgentDeepSeekLLMNode`, `AgentOpenAILLMNode`, `AgentOllamaLLMNode`.
    *   **Hugging Face Models:** Leverage Hugging Face's free Inference API (OpenAI-compatible endpoint) by using `HuggingFaceLLMNode` and `AgentHuggingFaceLLMNode` with `baseUrl: 'https://router.huggingface.co/v1'` and your Hugging Face API token. Ensure you specify the correct `model` ID (e.g., `openai/gpt-oss-20b:novita`).
*   [**Agent:**](#12-interactive-agent-example) Orchestrating tools and LLM reasoning to achieve complex goals.
*   [**Embedding:**](#18-embedding-node) For generating vector embeddings from text using Ollama.
*   [**Semantic Memory:**](#19-semantic-memory-node) For storing and retrieving memories based on semantic similarity (RAG) using Ollama. A slightly more advanced RAG is implemented as [RAG with user query input](https://github.com/fractal-solutions/qflow/blob/main/examples/rag_user_input.js).
*   [**Memory:**](#15-memory-node-lightweight-rag) For lightweight, keyword-based long-term memory and 'RAG' (lightweight, dependency free option).
*   [**Transform:**](#16-transform-node) For dynamic data manipulation and reformatting.
*   [**CodeInterpreter:**](#14-code-interpreter-example) For executing dynamic code (in Python) within the workflow. Specific instructions on library use in [matplotlib example](#17-plotting-data-with-python-code-interpreter).
*   [**Interactive Agent:**](#12-interactive-agent-example) An agent that takes a goal from user input and uses its tools to achieve it.
*   [**Shell:**](#8-shell-command-example) For system-level interaction and execution.
*   [**HTTP:**](#10-generic-http-request-example) For universal API access.
*   [**FileSystem:**](#9-file-system-example) For reading and writing local data.
*   **User Input:** For human-in-the-loop control.
*   [**Web Search:**](#11-web-search-example) Discovering information on the web using either:
    *   `DuckDuckGoSearchNode`: API-key-free, using DuckDuckGo's HTML interface.
    *   `GoogleSearchNode`: Requires a Google API Key and Custom Search Engine ID for more robust results.
*   **WebScraper:** For targeted web scraping.
*   [**DataExtractor:**](#13-data-extraction-example) For targeted data extraction.
*   **GitHub:** Creating and managing issues.
*   **HackerNews:** Fetching top stories and item details.
*   **Stripe:** Creating charges and retrieving account balances.

These examples are a great resource for understanding how to leverage `qflow` to its full potential.

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
  AgentNode,
  CodeInterpreterNode,
  MemoryNode,
  TransformNode
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
  const codeInterpreter = new CodeInterpreterNode(); // Agent can execute code
  const memoryNode = new MemoryNode(); // Agent can store and retrieve memories
  const transformNode = new TransformNode(); // Agent can transform data

  // Map tool names to their instances
  const availableTools = {
    duckduckgo_search: duckduckgoSearch,
    shell_command: shellCommand,
    read_file: readFile,
    write_file: writeFile,
    http_request: httpRequest,
    web_scraper: webScraper,
    user_input: userInput,
    code_interpreter: codeInterpreter,
    memory_node: memoryNode,
    transform_node: transformNode,
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

### 13. Data Extraction Example

Extracting structured data from HTML, JSON, or plain text.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DataExtractorNode, WebScraperNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running DataExtractorNode Test Workflow ---');

  // Example 1: Extracting from HTML (using WebScraperNode to get HTML)
  console.log('\n--- HTML Extraction Example ---');
  const scrapeNode = new WebScraperNode();
  scrapeNode.setParams({ url: 'https://www.example.com' });

  const extractHtmlNode = new DataExtractorNode();
  extractHtmlNode.setParams({
    type: 'html',
    selector: 'h1' // Extract the text from the first h1 tag
  });

  scrapeNode.next(extractHtmlNode);

  extractHtmlNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Extracted HTML (h1 content):', execRes);
    return 'default';
  };

  const htmlFlow = new AsyncFlow(scrapeNode);
  try {
    await htmlFlow.runAsync({});
  } catch (error) {
    console.error('HTML Extraction Flow Failed:', error);
  }

  // Example 2: Extracting from JSON
  console.log('\n--- JSON Extraction Example ---');
  const jsonContent = JSON.stringify({
    user: {
      id: 123,
      name: 'John Doe',
      contact: {
        email: 'john.doe@example.com',
        phone: '123-456-7890'
      },
      roles: ['admin', 'editor']
    },
    products: [
      { id: 1, name: 'Laptop', price: 1200 },
      { id: 2, name: 'Mouse', price: 25 }
    ]
  }, null, 2);

  const extractJsonNode = new DataExtractorNode();
  extractJsonNode.setParams({
    input: jsonContent,
    type: 'json',
    jsonPath: 'user.contact.email' // Extract email from nested JSON
  });

  extractJsonNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Extracted JSON (user email):', execRes);
    return 'default';
  };

  const jsonFlow = new AsyncFlow(extractJsonNode);
  try {
    await jsonFlow.runAsync({});
  } catch (error) {
    console.error('JSON Extraction Flow Failed:', error);
  }

  // Example 3: Extracting from Text (Regex)
  console.log('\n--- Text Extraction Example (Regex) ---');
  const textContent = "User IDs: user_123, user_456, admin_789. Emails: test@example.com, another@domain.org.";

  const extractTextNode = new DataExtractorNode();
  extractTextNode.setParams({
    input: textContent,
    type: 'text',
    regex: 'user_(\\d+)', // Extract numbers after 'user_'
    group: 1 // Capture group 1
  });

  extractTextNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Extracted Text (User IDs):', execRes);
    return 'default';
  };

  const textFlow = new AsyncFlow(extractTextNode);
  try {
    await textFlow.runAsync({});
  } catch (error) {
    console.error('Text Extraction Flow Failed:', error);
  }

  console.log('\n--- DataExtractorNode Test Workflow Finished ---');
})();

```

### 14. Code Interpreter Example

Executing Python code within the workflow.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { CodeInterpreterNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  const pythonCode = `
print("Hello from the Code Interpreter!")
result = 10 + 20
print(f"The sum is: {result}")
`;

  const codeInterpreter = new CodeInterpreterNode();
  codeInterpreter.setParams({
    code: pythonCode,
    timeout: 5000, // Max 5 seconds for execution
    requireConfirmation: false // Set to false to bypass user confirmation
  });

  codeInterpreter.postAsync = async (shared, prepRes, execRes) => {
    console.log('--- Code Interpreter Output ---');
    console.log('Stdout:', execRes.stdout);
    console.log('Stderr:', execRes.stderr);
    console.log('Exit Code:', execRes.exitCode);
    return 'default';
  };

  const flow = new AsyncFlow(codeInterpreter);
  try {
    await flow.runAsync({});
  } catch (error) {
    console.error('Code Interpreter Flow Failed:', error);
  }
})();
```

### 15. Memory Node (Lightweight RAG)

Storing and retrieving text-based memories for lightweight Retrieval-Augmented Generation (RAG).

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { MemoryNode, DeepSeekLLMNode } from '@fractal-solutions/qflow/nodes';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the MemoryNode RAG example.");
    return;
  }

  console.log('--- Running MemoryNode RAG Example ---');

  // 1. Store a memory
  const storeMemory = new MemoryNode();
  storeMemory.setParams({
    action: 'store',
    content: 'The capital of France is Paris. It is known for the Eiffel Tower.',
    id: 'france_capital'
  });
  await new AsyncFlow(storeMemory).runAsync({});
  console.log('Memory stored.');

  // 2. Store another memory for RAG
  const storeRagMemory = new MemoryNode();
  storeRagMemory.setParams({
    action: 'store',
    content: 'The primary function of a CPU is to execute instructions that make up a computer program.',
    id: 'cpu_function'
  });
  await new AsyncFlow(storeRagMemory).runAsync({});
  console.log('Another memory stored.');

  // 3. Retrieve relevant memories based on a query
  const ragRetrieve = new MemoryNode();
  ragRetrieve.setParams({
    action: 'retrieve',
    query: 'computer program'
  });

  // 4. Use an LLM to answer a question based on retrieved memories
  const ragLLM = new DeepSeekLLMNode();
  ragLLM.preparePrompt = (shared) => {
    const retrievedContent = shared.memoryResult.map(mem => mem.content).join('\n\n');
    ragLLM.setParams({
      apiKey: DEEPSEEK_API_KEY,
      prompt: `Based on the following context, answer the question:\n\nContext:\n${retrievedContent}\n\nQuestion: What is the main role of a CPU?`,
      keyword: 'rag_llm'
    });
  };

  ragRetrieve.next(ragLLM);

  const ragFlow = new AsyncFlow(ragRetrieve);
  try {
    const ragResult = await ragFlow.runAsync({});
    console.log('\n--- RAG Example LLM Response ---');
    console.log(ragResult);
  } catch (error) {
    console.error('RAG Flow Failed:', error);
  }

  console.log('\n--- MemoryNode RAG Example Finished ---');
})();
```

### 16. Transform Node

Dynamically transforming data using custom JavaScript functions.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { TransformNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running TransformNode Example ---');

  // Example 1: Map an array of numbers
  const numbers = [1, 2, 3];
  const doubleNumbers = new TransformNode();
  doubleNumbers.setParams({
    input: numbers,
    transformFunction: '(data) => data.map(x => x * 2)'
  });

  const flow1 = new AsyncFlow(doubleNumbers);
  try {
    const result = await flow1.runAsync({});
    console.log('Doubled Numbers:', result); // Expected: [2, 4, 6]
  } catch (error) {
    console.error('Transform Flow 1 Failed:', error);
  }

  // Example 2: Filter an array of objects
  const users = [
    { name: 'Alice', active: true },
    { name: 'Bob', active: false },
    { name: 'Charlie', active: true }
  ];
  const activeUsers = new TransformNode();
  activeUsers.setParams({
    input: users,
    transformFunction: '(data) => data.filter(user => user.active)'
  });

  const flow2 = new AsyncFlow(activeUsers);
  try {
    const result = await flow2.runAsync({});
    console.log('Active Users:', result); // Expected: [{ name: 'Alice', active: true }, { name: 'Charlie', active: true }]
  } catch (error) {
    console.error('Transform Flow 2 Failed:', error);
  }

  // Example 3: Extract a specific property from an object
  const product = { id: 1, name: 'Laptop', price: 1200 };
  const productName = new TransformNode();
  productName.setParams({
    input: product,
    transformFunction: '(data) => data.name'
  });

  const flow3 = new AsyncFlow(productName);
  try {
    const result = await flow3.runAsync({});
    console.log('Product Name:', result); // Expected: 'Laptop'
  } catch (error) {
    console.error('Transform Flow 3 Failed:', error);
  }

  console.log('\n--- TransformNode Example Finished ---');
})();
```

### 17. Plotting Data with Python Code Interpreter

Demonstrates using the `CodeInterpreterNode` to execute Python code for data visualization, saving the output to a file.

**Prerequisites:** To run this example, you need Python and `matplotlib` installed. It is highly recommended to use a Python [virtual environment](https://docs.python.org/3/library/venv.html) to manage your Python dependencies.

Follow these steps in *your project folder* where you are using `qflow`:

1.  **Create a Python Virtual Environment:**
    ```bash
    python3 -m venv .venv
    ```

2.  **Activate the Virtual Environment:**
    *   On Linux/macOS:
        ```bash
        source .venv/bin/activate
        ```
    *   On Windows (Command Prompt):
        ```bash
        .venv\Scripts\activate.bat
        ```
    *   On Windows (PowerShell):
        ```powershell
        .venv\Scripts\Activate.ps1
        ```

3.  **Install `matplotlib` (and any other Python libraries) within the activated environment:**
    ```bash
    pip install matplotlib
    ```

4.  **Configure the Python Interpreter Path:**
    Create or update a `.env` file in your project's root directory (where your `qflow` application runs) and add the following line, pointing to the Python executable within your virtual environment:
    ```bash
    QFLOW_PYTHON_INTERPRETER=/path/to/your/project/.venv/bin/python
    # Example for Windows:
    # QFLOW_PYTHON_INTERPRETER=C:\path\to\your\project\.venv\Scripts\python.exe
    ```
    *Note: If you are not using Bun (which loads `.env` files by default), you might need a library like `dotenv` (e.g., `require('dotenv').config();`) in your application to load environment variables from the `.env` file.*


```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { CodeInterpreterNode, WriteFileNode } from '@fractal-solutions/qflow/nodes';
import path from 'path';
import os from 'os';

(async () => {
  console.log('--- Running Plot Data with Python CodeInterpreter Example ---');

  // 1. Define sample data
  const dataToPlot = {
    x: [1, 2, 3, 4, 5],
    y: [2, 4, 5, 4, 6]
  };

  // Define temporary file paths
  const tempDir = os.tmpdir();
  const dataFileName = `plot_data_${Date.now()}.json`;
  const plotFileName = `sample_plot_${Date.now()}.png`;
  const dataFilePath = path.join(tempDir, dataFileName);
  const plotFilePath = path.join(tempDir, plotFileName);

  // 2. Python script for plotting
  const pythonPlotScript = `
import matplotlib.pyplot as plt
import json
import sys

# Get data file path and output plot path from command line arguments
data_file_path = sys.argv[1]
output_plot_path = sys.argv[2]

# Read data from the specified JSON file
with open(data_file_path, 'r') as f:
    data = json.load(f)

x_data = data['x']
y_data = data['y']

# Create the plot
plt.figure(figsize=(8, 6))
plt.plot(x_data, y_data, marker='o', linestyle='-', color='b')
plt.title('Sample Data Plot')
plt.xlabel('X-axis')
plt.ylabel('Y-axis')
plt.grid(True)

# Save the plot
plt.savefig(output_plot_path)
print(f"Plot saved to {output_plot_path}")
`;

  // 3. Write data to a temporary JSON file
  const writeDataNode = new WriteFileNode();
  writeDataNode.setParams({
    filePath: dataFilePath,
    content: JSON.stringify(dataToPlot)
  });

  // 4. Run the Python script using CodeInterpreterNode
  const plotNode = new CodeInterpreterNode();
  plotNode.setParams({
    code: pythonPlotScript,
    args: [dataFilePath, plotFilePath], // Pass data file and output plot paths as arguments
    timeout: 15000, // Increased timeout for plotting
    requireConfirmation: false, // No confirmation needed for this automated task
    interpreterPath: process.env.QFLOW_PYTHON_INTERPRETER || 'python' // Allow user to specify Python interpreter path, defaults to 'python'
  });

  // 5. Chain the nodes
  writeDataNode.next(plotNode);

  // 6. Run the flow
  const flow = new AsyncFlow(writeDataNode);
  try {
    await flow.runAsync({});
    console.log(`\nPlotting workflow finished. Check for plot at: ${plotFilePath}`);
  } catch (error) {
    console.error('Plotting Workflow Failed:', error);
  }
})();
```

### 18. Embedding Node

Generates vector embeddings for text using a local Ollama server. Essential for semantic search and RAG.

**Prerequisites:** Ensure you have [Ollama](https://ollama.ai/) installed and an embedding model pulled (e.g., `ollama pull nomic-embed-text`).

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { EmbeddingNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running EmbeddingNode Example ---');

  const textToEmbed = "Hello, world! This is a test sentence.";
  const embedNode = new EmbeddingNode();
  embedNode.setParams({
    text: textToEmbed,
    model: 'nomic-embed-text', // Ensure this model is pulled in Ollama
    baseUrl: 'http://localhost:11434' // Default Ollama URL
  });

  embedNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Embedding Result (first 5 dimensions):', execRes.embedding.slice(0, 5));
    console.log('Embedding Length:', execRes.embedding.length);
    return 'default';
  };

  const flow = new AsyncFlow(embedNode);
  try {
    await flow.runAsync({});
  } catch (error) {
    console.error('Embedding Flow Failed:', error);
  }

  console.log('\n--- EmbeddingNode Example Finished ---');
})();
```

### 19. Semantic Memory Node

Stores and retrieves text-based memories using vector embeddings for semantic search. This enables agents to have a more advanced, meaning-based long-term memory.

**Prerequisites:** Requires [Ollama](https://ollama.ai/) and an embedding model (e.g., `ollama pull nomic-embed-text`).

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { SemanticMemoryNode, DeepSeekLLMNode } from '@fractal-solutions/qflow/nodes';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the SemanticMemoryNode RAG example.");
    return;
  }

  console.log('--- Running SemanticMemoryNode RAG Example ---');

  // 1. Store a semantic memory
  const storeSemanticMemory = new SemanticMemoryNode();
  storeSemanticMemory.setParams({
    action: 'store',
    content: 'The capital of France is Paris. It is known for the Eiffel Tower and its romantic atmosphere.',
    id: 'france_capital_sem',
    metadata: { source: 'wikipedia', topic: 'geography' }
  });
  await new AsyncFlow(storeSemanticMemory).runAsync({});
  console.log('Semantic memory stored.');

  // 2. Store another memory for RAG
  const storeRagSemanticMemory = new SemanticMemoryNode();
  storeRagSemanticMemory.setParams({
    action: 'store',
    content: 'Quantum computing uses quantum-mechanical phenomena like superposition and entanglement to perform computations.',
    id: 'quantum_comp_intro',
    metadata: { topic: 'physics' }
  });
  await new AsyncFlow(storeRagSemanticMemory).runAsync({});
  console.log('Another semantic memory stored.');

  // 3. Retrieve relevant semantic memories based on a query
  const ragRetrieveSemantic = new SemanticMemoryNode();
  ragRetrieveSemantic.setParams({
    action: 'retrieve',
    query: 'city of love',
    topK: 1
  });

  // 4. Use an LLM to answer a question based on retrieved memories
  const ragLLM = new DeepSeekLLMNode();
  ragLLM.setParams({ apiKey: DEEPSEEK_API_KEY });

  ragRetrieveSemantic.next(ragLLM);

  ragLLM.preparePrompt = (shared) => {
    const retrievedContent = shared.semanticMemoryResult.map(mem => mem.content).join('\n\n');
    ragLLM.setParams({
      prompt: `Based on the following context, answer the question:\n\nContext:\n${retrievedContent}\n\nQuestion: Explain quantum computing in simple terms.`,
      keyword: 'semantic_rag_llm'
    });
  };

  const ragFlow = new AsyncFlow(ragRetrieveSemantic);
  try {
    const ragResult = await ragFlow.runAsync({});
    console.log('\n--- Semantic RAG Example LLM Response ---');
    console.log(ragResult);
  } catch (error) {
    console.error('RAG Flow Failed:', error);
  }

  console.log('\n--- SemanticMemoryNode RAG Example Finished ---');
})();
```




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
