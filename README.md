# qflow

A lightweight and flexible JavaScript library for creating and managing workflows. Adopted Pocket Flow design.

## Core Concepts

qflow allows you to define complex workflows as a series of connected nodes. Each node represents a step in the process, and you can control the flow of execution based on the outcome of each step.

*   **`Node`**: The fundamental building block of a qflow. A `Node` is a single step in your workflow. It has three main lifecycle methods:
    *   `prep(shared)`: Prepare data for the `exec` method. The `shared` object is passed through the entire flow.
    *   `exec(prepRes)`: The main logic of the node. It receives the result from the `prep` method.
    *   `post(shared, prepRes, execRes)`:  Clean up or process the results after the `exec` method. **The return value of this method determines the next action in the flow.**

*   **`Flow`**: A `Flow` manages the execution of a series of connected `Node`s. You define the starting node and the transitions between nodes.

## Features

*   **Synchronous and Asynchronous Execution**: qflow provides both synchronous and asynchronous versions of `Node`s and `Flow`s, allowing you to handle both CPU-bound and I/O-bound tasks efficiently.
*   **Batch Processing**: The `BatchFlow` and `AsyncBatchFlow` classes allow you to process arrays of items in a single workflow.
*   **Parallel Execution**: The `AsyncParallelBatchNode` and `AsyncParallelBatchFlow` classes enable you to execute asynchronous operations in parallel for maximum efficiency.
*   **Retries and Error Handling**: The `Node` class has built-in support for retries with a configurable delay. You can also define a `execFallback` method to handle cases where all retries fail.
*   **Conditional Transitions**: You can define multiple successors for a node and choose which one to transition to based on the return value of the `exec` or `post` method.

## Understanding Nodes, Flows, and Data Management

### Nodes: The Building Blocks

Each `Node` in qflow represents a distinct step in your workflow. Nodes are designed with a clear lifecycle to manage their execution:

*   **`prep(shared)`**: This method is called before `exec`. It's ideal for preparing any data or resources needed for the node's main logic. The `shared` object, which is a mutable object passed throughout the entire flow, can be used here to access or store global state. The return value of `prep` is passed as `prepRes` to the `exec` method.
*   **`exec(prepRes)`**: This is the core logic of your node. It receives the result from the `prep` method (`prepRes`). The `exec` method should perform the primary task of the node. **The return value of `exec` is crucial for controlling the flow's path.** It can be a string representing an "action" (e.g., "success", "failure", "long", "short") that the `Flow` uses to determine the next node.
*   **`post(shared, prepRes, execRes)`**: This method is called after `exec` completes. It's suitable for cleanup, logging, or further processing of the `exec` result. It receives the `shared` object, the `prepRes`, and the `execRes`. **The return value of `post` also dictates the flow's path, similar to `exec`.** If both `exec` and `post` return a value, the `post` method's return value takes precedence for determining the next transition.

### Flows: Orchestrating Execution

A `Flow` acts as the orchestrator for your nodes. It defines the sequence of execution and manages transitions between nodes.

*   **Starting a Flow**: You initialize a `Flow` with a `startNode`. This is the first node that will be executed when the flow runs.
*   **Transitions**: Nodes are connected using the `node.next(nextNode, action)` method. When a node's `exec` or `post` method returns an `action` string, the `Flow` looks for a successor node registered with that specific action. If no action is specified (or the method returns `undefined`), the "default" action is used. This allows for powerful conditional branching in your workflows.

### Data Transfer and State Management

qflow provides two primary mechanisms for data management within a flow:

1.  **Node-Specific Parameters (`this.params`)**: Each node instance has a `this.params` object. This object is populated by the `Flow` when it calls `node.setParams(params)`. This is the recommended way to pass data *into* a specific node for its execution. For `BatchFlow` and `AsyncBatchFlow`, the `prep` (or `prepAsync`) method should return an array of objects, where each object contains the `params` for a single batch item.
    ```javascript
    // Example of setting params for a node
    class MyNode extends Node {
      exec() {
        console.log(this.params.myValue);
      }
    }
    const myNode = new MyNode();
    // When running a flow, the flow will call myNode.setParams({ myValue: 'hello' });
    ```

2.  **Shared State (`shared` object)**: The `shared` object is a mutable object that is passed to the `prep`, `exec`, and `post` methods of every node in the flow. This object is ideal for maintaining global state or data that needs to be accessible and modifiable across multiple nodes in the workflow. Any changes made to the `shared` object by one node will be visible to subsequent nodes.

### Nuances

*   **Return Values for Transitions**: The string returned by a node's `exec` or `post` method is critical for defining the flow's path. If a node returns "success", the flow will look for a successor registered with the "success" action. If no action is returned, the "default" action is assumed.
*   **Error Handling**: Nodes can throw errors. The `Node` class provides `maxRetries` and `wait` parameters for automatic retries. If all retries fail, the `execFallback` method is called.
*   **Asynchronous Operations**: For asynchronous operations, use `AsyncNode` and `AsyncFlow`. Their lifecycle methods (`prepAsync`, `execAsync`, `postAsync`) are `async` functions, allowing you to use `await` for non-blocking operations.

## API Reference

### `BaseNode`

The base class for all nodes.

*   `constructor()`
*   `setParams(params)`: Sets the parameters for the node.
*   `next(node, action = "default")`: Defines the next node in the flow.
*   `prep(shared)`: Pre-execution logic.
*   `exec(prepRes)`: Execution logic.
*   `post(shared, prepRes, execRes)`: Post-execution logic. The return value of this method is used to determine the next node in the flow.
*   `run(shared)`: Runs the node.

### `Node`

Extends `BaseNode` with retry logic.

*   `constructor(maxRetries = 1, wait = 0)`: `maxRetries` is the number of times to retry on failure, and `wait` is the delay in seconds between retries.
*   `execFallback(prepRes, error)`:  Logic to execute if all retries fail.

### `Flow`

Manages a workflow of nodes.

*   `constructor(start = null)`: `start` is the starting node of the flow.
*   `start(startNode)`: Sets the starting node.
*   `run(shared)`: Runs the entire flow.

### `BatchFlow`

Extends `Flow` for batch processing. The `prep` method should return an array of objects, where each object contains the parameters for a single execution of the flow.

### Asynchronous Classes

qflow provides asynchronous versions of the core classes:

*   `AsyncNode`
*   `AsyncFlow`
*   `AsyncBatchFlow`
*   `AsyncParallelBatchFlow`

These classes have `...Async` versions of the lifecycle methods (e.g., `prepAsync`, `execAsync`, `postAsync`) and support `async/await`. The `AsyncFlow` class has a `runAsync` method to execute the flow.

## Usage Examples

### Basic Flow

```javascript
import { Node, Flow } from './qflow.js';

// A node that prints a message
class MessageNode extends Node {
    exec() {
        console.log("Hello from MessageNode!");
        return 'default'; // Transition to the default successor
    }
}

// A node that prints the current time
class TimeNode extends Node {
    exec() {
        console.log(`Current time: ${Date.now()}`);
        return 'default';
    }
}

// Create the nodes
const messageNode = new MessageNode();
const timeNode = new TimeNode();

// Define the workflow
messageNode.next(timeNode); // After messageNode, go to timeNode

// Create and run the flow
const flow = new Flow(messageNode);
flow.run({});
```

### Batch Flow

```javascript
import { Node, BatchFlow } from './qflow.js';

class MyBatchNode extends Node {
  exec() {
    console.log(`BatchNode: Processing item ${this.params.item}`);
    return 'default';
  }
}

const batchNode = new MyBatchNode();
const batchFlow = new BatchFlow(batchNode);

// The prep method returns an array of parameter objects for the batch.
batchFlow.prep = () => [ { item: 1 }, { item: 2 }, { item: 3 } ];

batchFlow.run({});
```

### Async Parallel Batch Flow

```javascript
import { AsyncNode, AsyncParallelBatchFlow } from './qflow.js';

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

// The prepAsync method returns an array of parameter objects for the batch.
asyncParallelBatchFlow.prepAsync = async () => [ { item: 1 }, { item: 2 }, { item: 3 }, { item: 4 }, { item: 5 } ];

await asyncParallelBatchFlow.runAsync({});
```

## Extending qflow with LLM Nodes

qflow's flexible node structure makes it straightforward to integrate with external APIs, including Large Language Models (LLMs). By creating custom `AsyncNode` implementations, you can easily add capabilities like text generation, summarization, and more to your workflows.

Below are examples of how you might create nodes for popular LLM providers. Remember to handle API keys securely (e.g., using environment variables) and to include necessary `fetch` polyfills or libraries if running in environments that don't natively support `fetch` (like Node.js without a recent version or a polyfill).

### OpenAI GPT-3.5 Turbo Node

This example demonstrates an `AsyncNode` that interacts with the OpenAI Chat Completions API.

```javascript
import { AsyncNode } from './qflow.js';

class OpenAILLMNode extends AsyncNode {
  async execAsync() {
    const { prompt, apiKey } = this.params; // prompt and apiKey passed via node params

    if (!prompt) {
      throw new Error('Prompt is required for OpenAILLMNode.');
    }
    if (!apiKey) {
      throw new Error('OpenAI API Key is required.');
    }

    console.log(`OpenAILLMNode: Sending prompt to OpenAI: "${prompt.substring(0, 50)}..."`);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error.message}`);
      }

      const data = await response.json();
      const llmResponse = data.choices[0].message.content.trim();
      console.log(`OpenAILLMNode: Received response: "${llmResponse.substring(0, 50)}..."`);
      return llmResponse; // Return the LLM's response
    } catch (error) {
      console.error('OpenAILLMNode: Error during API call:', error);
      throw error; // Re-throw to trigger qflow's retry/fallback
    }
  }
}

// Example Usage in a Flow:
import { AsyncFlow } from './qflow.js';

const openAILLMNode = new OpenAILLMNode();
// Pass prompt and API key via params
openAILLMNode.setParams({
  prompt: 'Write a short, creative slogan for a new coffee shop.',
  apiKey: process.env.OPENAI_API_KEY // Load from environment variable
});

const llmFlow = new AsyncFlow(openAILLMNode);
const llmResult = await llmFlow.runAsync({});
console.log('LLM Flow Result:', llmResult);

```

### Google Gemini Node

This example demonstrates an `AsyncNode` that interacts with the Google Gemini API.

```javascript
import { AsyncNode } from './qflow.js';

class GeminiLLMNode extends AsyncNode {
  async execAsync() {
    const { prompt, apiKey } = this.params; // prompt and apiKey passed via node params

    if (!prompt) {
      throw new Error('Prompt is required for GeminiLLMNode.');
    }
    if (!apiKey) {
      throw new Error('Google Gemini API Key is required.');
    }

    console.log(`GeminiLLMNode: Sending prompt to Gemini: "${prompt.substring(0, 50)}..."`);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error.message}`);
      }

      const data = await response.json();
      const llmResponse = data.candidates[0].content.parts[0].text.trim();
      console.log(`GeminiLLMNode: Received response: "${llmResponse.substring(0, 50)}..."`);
      return llmResponse; // Return the LLM's response
    } catch (error) {
      console.error('GeminiLLMNode: Error during API call:', error);
      throw error; // Re-throw to trigger qflow's retry/fallback
    }
  }
}

// Example Usage in a Flow:
import { AsyncFlow } from './qflow.js';

const geminiLLMNode = new GeminiLLMNode();
// Pass prompt and API key via params
geminiLLMNode.setParams({
  prompt: 'Generate a short, catchy headline for a tech blog post about AI in healthcare.',
  apiKey: process.env.GEMINI_API_KEY // Load from environment variable
});

const llmFlow = new AsyncFlow(geminiLLMNode);
const llmResult = await llmFlow.runAsync({});
console.log('LLM Flow Result:', llmResult);

```

### Chaining LLM Responses in a Flow

One of the powerful features of qflow is the ability to chain nodes, allowing the output of one node to become the input for the next. This is particularly useful for multi-step LLM interactions, such as generating an initial response and then refining or expanding upon it.

This example demonstrates a flow where an OpenAI LLM generates a slogan, and then a second OpenAI LLM expands on that slogan.

```javascript
import { AsyncNode, AsyncFlow } from './qflow.js';

// Re-using the OpenAILLMNode defined above
// class OpenAILLMNode extends AsyncNode { ... }

class SloganExpansionNode extends AsyncNode {
  async execAsync() {
    const { slogan, apiKey } = this.params; // slogan from previous node, apiKey

    if (!slogan) {
      throw new Error('Slogan is required for SloganExpansionNode.');
    }
    if (!apiKey) {
      throw new Error('OpenAI API Key is required.');
    }

    const prompt = `Expand on the following coffee shop slogan: "${slogan}"`;
    console.log(`SloganExpansionNode: Sending prompt to OpenAI: "${prompt.substring(0, 50)}..."`);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/complements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error.message}`);
      }

      const data = await response.json();
      const expandedSlogan = data.choices[0].message.content.trim();
      console.log(`SloganExpansionNode: Received response: "${expandedSlogan.substring(0, 50)}..."`);
      return expandedSlogan; // Return the expanded slogan
    } catch (error) {
      console.error('SloganExpansionNode: Error during API call:', error);
      throw error; // Re-throw to trigger qflow's retry/fallback
    }
  }
}

// Example Usage in a Chained Flow:

import { AsyncFlow } from './qflow.js';

const apiKey = process.env.OPENAI_API_KEY; // Load from environment variable

const sloganGenerator = new OpenAILLMNode();
sloganGenerator.setParams({
  prompt: 'Generate a short, creative slogan for a new coffee shop.',
  apiKey: apiKey
});

const sloganExpander = new SloganExpansionNode();
sloganExpander.setParams({
  apiKey: apiKey
});

// Chain the nodes: output of sloganGenerator becomes input for sloganExpander
sloganGenerator.next(sloganExpander);

const chainedLLMFlow = new AsyncFlow(sloganGenerator);
const finalResult = await chainedLLMFlow.runAsync({});
console.log('Chained LLM Flow Final Result:', finalResult);

```

## Installation

Since qflow is a single file, you can simply import it into your project.

```javascript
import { Node, Flow } from './qflow.js';
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request.