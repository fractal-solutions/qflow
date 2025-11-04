## EmbeddingNode

The `EmbeddingNode` generates vector embeddings for text (requires Ollama).

### Parameters

*   `text`: The text string to generate an embedding for.
*   `model`: Optional. The Ollama embedding model name to use (e.g., 'nomic-embed-text'). Defaults to 'nomic-embed-text'.
*   `baseUrl`: Optional. The base URL of the Ollama API (e.g., 'http://localhost:11434'). Defaults to 'http://localhost:11434'.
