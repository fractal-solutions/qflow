import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import {
  UserInputNode,
  HuggingFaceLLMNode
} from '../src/nodes';

// --- Configuration ---
const HF_TOKEN = process.env.HF_TOKEN; // Your Hugging Face API token
const HF_MODEL = process.env.HF_MODEL || "openai/gpt-oss-20b:novita"; // Example model

(async () => {
  if (!HF_TOKEN) {
    console.warn("WARNING: HF_TOKEN is not set. Please set it to run the HuggingFace Chat LLM example.");
    console.warn("You can get a token from https://huggingface.co/settings/tokens");
    return;
  }

  console.log('--- Running HuggingFace Chat LLM Workflow ---');
  console.log(`Using model: ${HF_MODEL}`);
  console.log('Type "exit" to quit.');

  // 1. Node to get user input
  const getUserInputNode = new UserInputNode();
  getUserInputNode.setParams({ prompt: '\nYou: ' });

  // 2. Node to send prompt to HuggingFace LLM
  const hfLLMNode = new HuggingFaceLLMNode();
  hfLLMNode.setParams({
    model: HF_MODEL,
    hfToken: HF_TOKEN,
    temperature: 0.7,
    max_new_tokens: 250,
    baseUrl: 'https://router.huggingface.co/v1' // Use OpenAI-compatible router
  });

  // 3. Custom node to process LLM response and loop
  class ChatOrchestratorNode extends AsyncNode {
    async execAsync(prepRes, shared) {
      const userInput = shared.userInput; // Get user input from shared state

      if (userInput.toLowerCase() === 'exit') {
        console.log('Exiting chat. Goodbye!');
        return 'exit_flow'; // Signal to exit the main flow
      }

      // Set the prompt for the LLM node
      hfLLMNode.setParams({ ...hfLLMNode.params, prompt: userInput });

      // Run the LLM flow
      const llmFlow = new AsyncFlow(hfLLMNode);
      const llmResponse = await llmFlow.runAsync({});

      console.log(`AI: ${llmResponse}`);

      return 'continue'; // Signal to continue loop
    }

    postAsync(prepRes, execRes, shared) {
      if (execRes === 'exit_flow') return 'exit_flow';
      return 'continue';
    }
  }

  const chatOrchestratorNode = new ChatOrchestratorNode();

  // Define a node to handle the explicit exit condition
  const exitNode = new (class extends AsyncNode {
    async execAsync() {
      console.log('Workflow gracefully terminated.');
      return 'default'; // Allows the flow to complete
    }

    async postAsync(prepRes, execRes, shared) {
      return execRes;
    }
  })();

  // Chain: Get User Input -> Chat Orchestrator
  getUserInputNode.next(chatOrchestratorNode);

  // Loop back to get user input indefinitely
  chatOrchestratorNode.next(getUserInputNode, 'continue');

  // Explicitly handle exit condition
  chatOrchestratorNode.next(exitNode, 'exit_flow');

  // Create and run the flow
  const chatFlow = new AsyncFlow(getUserInputNode);

  try {
    await chatFlow.runAsync({});
    console.log('\n--- HuggingFace Chat LLM Workflow Finished ---');
  } catch (error) {
    console.error('\n--- HuggingFace Chat LLM Workflow Failed ---', error);
  }
})();
