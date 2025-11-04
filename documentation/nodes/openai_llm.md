## OpenAILLMNode

The `OpenAILLMNode` is used to interact with the OpenAI API.

### Parameters

*   `apiKey`: Your OpenAI API key.
*   `prompt`: The prompt to send to the model.
*   `model`: The model to use.
*   `temperature`: The temperature to use for the generation.
*   `max_tokens`: The maximum number of tokens to generate.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { OpenAILLMNode } from '@fractal-solutions/qflow/nodes';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

(async () => {
  if (!OPENAI_API_KEY) {
    console.warn("WARNING: OPENAI_API_KEY is not set. Please set it to run the OpenAILLMNode example.");
    return;
  }

  console.log('--- Running OpenAILLMNode Example ---');

  const openaiNode = new OpenAILLMNode();
  openaiNode.setParams({
    apiKey: OPENAI_API_KEY,
    prompt: "Write a haiku about a sunny day.",
    model: "gpt-3.5-turbo" // Common OpenAI model
  });

  const openaiFlow = new AsyncFlow(openaiNode);

  try {
    const result = await openaiFlow.runAsync({});
    console.log('--- OpenAI Response ---');
    console.log(result);
    console.log('--- Workflow Finished ---');
  } catch (error) {
    console.error('--- Workflow Failed ---', error);
  }
})();
```
