## GeminiLLMNode

The `GeminiLLMNode` is used to interact with the Google Gemini API.

### Parameters

*   `apiKey`: Your Google Gemini API key.
*   `prompt`: The prompt to send to the model.
*   `model`: The model to use.
*   `temperature`: The temperature to use for the generation.
*   `max_tokens`: The maximum number of tokens to generate.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { GeminiLLMNode } from '@fractal-solutions/qflow/nodes';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

(async () => {
  if (!GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set. Please set it to run the GeminiLLMNode example.");
    return;
  }

  console.log('--- Running GeminiLLMNode Example ---');

  const geminiNode = new GeminiLLMNode();
  geminiNode.setParams({
    apiKey: GEMINI_API_KEY,
    prompt: "Tell me a short poem about a cloud.",
    model: "gemini-pro" // Common Gemini model
  });

  const geminiFlow = new AsyncFlow(geminiNode);

  try {
    const result = await geminiFlow.runAsync({});
    console.log('--- Gemini Response ---');
    console.log(result);
    console.log('--- Workflow Finished ---');
  } catch (error) {
    console.error('--- Workflow Failed ---', error);
  }
})();
```
