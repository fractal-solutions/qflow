## HuggingFaceLLMNode

The `HuggingFaceLLMNode` is used to interact with the Hugging Face API.

### Parameters

*   `hfToken`: Your Hugging Face API token.
*   `prompt`: The prompt to send to the model.
*   `model`: The Hugging Face model ID (e.g., 'HuggingFaceH4/zephyr-7b-beta', 'openai/gpt-oss-20b:novita').
*   `temperature`: Optional. Controls randomness. Defaults to 0.7.
*   `max_new_tokens`: Optional. Maximum number of tokens to generate. Defaults to 500.
*   `baseUrl`: Optional. The base URL of the Hugging Face router API. Defaults to 'https://router.huggingface.co/v1'.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { HuggingFaceLLMNode } from '@fractal-solutions/qflow/nodes';

const HF_TOKEN = process.env.HF_TOKEN; // Your Hugging Face API token
const HF_MODEL = process.env.HF_MODEL || "openai/gpt-oss-20b:novita"; // Example model

(async () => {
  if (!HF_TOKEN) {
    console.warn("WARNING: HF_TOKEN is not set. Please set it to run the HuggingFaceLLMNode example.");
    return;
  }

  console.log('--- Running HuggingFaceLLMNode Example ---');
  console.log(`Using model: ${HF_MODEL}`);

  const hfLLMNode = new HuggingFaceLLMNode();
  hfLLMNode.setParams({
    model: HF_MODEL,
    hfToken: HF_TOKEN,
    prompt: "Explain the concept of machine learning in a few sentences.",
    temperature: 0.7,
    max_new_tokens: 100,
    baseUrl: 'https://router.huggingface.co/v1' // Use OpenAI-compatible router
  });

  const hfFlow = new AsyncFlow(hfLLMNode);

  try {
    const result = await hfFlow.runAsync({});
    console.log('--- HuggingFace Response ---');
    console.log(result);
    console.log('--- Workflow Finished ---');
  } catch (error) {
    console.error('--- Workflow Failed ---', error);
  }
})();
```
