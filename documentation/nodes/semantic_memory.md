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
