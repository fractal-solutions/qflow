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
