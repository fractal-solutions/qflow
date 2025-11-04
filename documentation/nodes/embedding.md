## EmbeddingNode

The `EmbeddingNode` generates vector embeddings for text (requires Ollama).

### Parameters

*   `text`: The text string to generate an embedding for.
*   `model`: Optional. The Ollama embedding model name to use (e.g., 'nomic-embed-text'). Defaults to 'nomic-embed-text'.
*   `baseUrl`: Optional. The base URL of the Ollama API (e.g., 'http://localhost:11434'). Defaults to 'http://localhost:11434'.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { EmbeddingNode } from '@fractal-solutions/qflow/nodes';

// Ollama typically runs locally, so no API key is strictly needed unless configured otherwise.
// const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

(async () => {
  console.log('--- Running EmbeddingNode Example (Ollama) ---');

  const embeddingNode = new EmbeddingNode();
  embeddingNode.setParams({
    text: "The quick brown fox jumps over the lazy dog.",
    model: "nomic-embed-text", // Default Ollama embedding model
    // baseUrl: OLLAMA_BASE_URL // Uncomment if Ollama is not on default URL
  });

  const embeddingFlow = new AsyncFlow(embeddingNode);

  try {
    const result = await embeddingFlow.runAsync({});
    console.log('--- Embedding Result ---');
    console.log('Embedding vector (first 5 elements):', result.embedding.slice(0, 5));
    console.log('Vector length:', result.embedding.length);
    console.log('--- Workflow Finished ---');
  } catch (error) {
    console.error('--- Workflow Failed ---', error);
  }
})();
```
