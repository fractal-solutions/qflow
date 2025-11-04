## OpenRouterLLMNode

The `OpenRouterLLMNode` is used to interact with the OpenRouter API.

### Parameters

*   `apiKey`: Your OpenRouter API key.
*   `prompt`: The prompt to send to the model.
*   `model`: The OpenRouter model ID (e.g., 'openai/gpt-4o', 'mistralai/mistral-7b-instruct').
*   `siteUrl`: Optional. Site URL for rankings on openrouter.ai.
*   `siteTitle`: Optional. Site title for rankings on openrouter.ai.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { OpenRouterLLMNode } from '@fractal-solutions/qflow/nodes';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

(async () => {
  if (!OPENROUTER_API_KEY) {
    console.warn("WARNING: OPENROUTER_API_KEY is not set. Please set it to run the OpenRouterLLMNode example.");
    return;
  }

  console.log('--- Running OpenRouterLLMNode Example ---');

  const openrouterNode = new OpenRouterLLMNode();
  openrouterNode.setParams({
    apiKey: OPENROUTER_API_KEY,
    prompt: "What is the capital of Canada?",
    model: "mistralai/mistral-7b-instruct" // A common OpenRouter model
  });

  const openrouterFlow = new AsyncFlow(openrouterNode);

  try {
    const result = await openrouterFlow.runAsync({});
    console.log('--- OpenRouter Response ---');
    console.log(result);
    console.log('--- Workflow Finished ---');
  } catch (error) {
    console.error('--- Workflow Failed ---', error);
  }
})();
```
