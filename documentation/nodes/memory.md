## MemoryNode

The `MemoryNode` stores and retrieves text memories (keyword-based).

### Parameters

*   `action`: The action to perform: 'store' or 'retrieve'.
*   `content`: Required for 'store' action. The text content of the memory to store.
*   `query`: Required for 'retrieve' action. Keywords to search for within stored memories.
*   `id`: Optional for 'store' action. A unique identifier for the memory. If not provided, one will be generated.
*   `memoryPath`: Optional. The directory path where memories are stored. Defaults to './agent_memies'.
