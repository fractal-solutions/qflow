## SemanticMemoryNode

The `SemanticMemoryNode` stores and retrieves text memories via semantic search (requires Ollama).

### Parameters

*   `action`: The action to perform: 'store' or 'retrieve'.
*   `content`: Required for 'store' action. The text content of the memory to store.
*   `query`: Required for 'retrieve' action. The text query for semantic search.
*   `id`: Optional for 'store' action. A unique identifier for the memory. If not provided, one will be generated.
*   `metadata`: Optional for 'store' action. Key-value pairs to store alongside the memory.
*   `memoryPath`: Optional. The directory path where memories and the index are stored. Defaults to './semantic_memories'.
*   `embeddingModel`: Optional. The Ollama embedding model name to use (e.g., 'nomic-embed-text'). Defaults to 'nomic-embed-text'.
*   `embeddingBaseUrl`: Optional. The base URL of the Ollama API for embeddings. Defaults to 'http://localhost:11434'.
*   `topK`: Optional for 'retrieve' action. The number of top similar results to retrieve. Defaults to 5.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { SemanticMemoryNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running SemanticMemoryNode Example ---');

  // --- Example 1: Store a semantic memory ---
  console.log('\n--- Storing a Semantic Memory ---');
  const storeSemanticMemoryNode = new SemanticMemoryNode();
  storeSemanticMemoryNode.setParams({
    action: 'store',
    content: 'The capital of France is Paris. It is known for the Eiffel Tower and its romantic atmosphere.',
    id: 'france_capital_sem',
    metadata: { source: 'wikipedia', topic: 'geography' }
  });

  const storeSemanticFlow = new AsyncFlow(storeSemanticMemoryNode);
  try {
    const result = await storeSemanticFlow.runAsync({});
    console.log('Store Semantic Memory Result:', result);
  } catch (error) {
    console.error('Store Semantic Memory Flow Failed:', error);
  }

  // --- Example 2: Retrieve a semantic memory ---
  console.log('\n--- Retrieving a Semantic Memory ---');
  const retrieveSemanticMemoryNode = new SemanticMemoryNode();
  retrieveSemanticMemoryNode.setParams({
    action: 'retrieve',
    query: 'city of love',
    topK: 1
  });

  const retrieveSemanticFlow = new AsyncFlow(retrieveSemanticMemoryNode);
  try {
    const result = await retrieveSemanticFlow.runAsync({});
    console.log('Retrieve Semantic Memory Result:', result);
  } catch (error) {
    console.error('Retrieve Semantic Memory Flow Failed:', error);
  }

  console.log('\n--- SemanticMemoryNode Example Finished ---');
})();
```
