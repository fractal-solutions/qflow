import { AsyncFlow } from '../src/qflow.js';
import { DeepSeekLLMNode } from '../src/nodes/llm.js';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

class SimpleLLMNode extends DeepSeekLLMNode {
  // The prompt will be set dynamically from user input
  preparePrompt() {
    // No need to prepare here, as the prompt is already in this.params.prompt
  }
}

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn(`
      *****************************************************************
      * WARNING: DeepSeek API key is not set.                         *
      * Please set the DEEPSEEK_API_KEY environment variable or       *
      * ensure it's in your .env file to run this example.            *
      *****************************************************************
    `);
    return;
  }

  console.log('--- Starting Simple DeepSeek LLM Workflow ---');

  // Get creative user input for the prompt
  const userInput = prompt("What's on your mind? (e.g., 'Tell me a short story about a space cat', 'Explain quantum entanglement simply')\nYour prompt: ");

  if (!userInput) {
    console.log("No prompt provided. Exiting.");
    return;
  }

  const llmNode = new SimpleLLMNode();
  llmNode.setParams({
    apiKey: DEEPSEEK_API_KEY,
    prompt: userInput, // Set the user's input as the prompt
    keyword: 'user_query' // A placeholder keyword for logging
  });

  const llmFlow = new AsyncFlow(llmNode);

  try {
    console.log(`Sending your prompt to DeepSeek...`);
    // Use runAsync() directly, passing initial shared state if needed (empty object here)
    const result = await llmFlow.runAsync({});
    console.log('\n--- DeepSeek Response ---');
    console.log(result);
    console.log('\n--- Workflow Finished ---');
  } catch (error) {
    console.error('\n--- Workflow Failed ---', error);
  }
})();
