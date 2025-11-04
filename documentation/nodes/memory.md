## MemoryNode

The `MemoryNode` stores and retrieves text memories (keyword-based).

### Parameters

*   `action`: The action to perform: 'store' or 'retrieve'.
*   `content`: Required for 'store' action. The text content of the memory to store.
*   `query`: Required for 'retrieve' action. Keywords to search for within stored memories.
*   `id`: Optional for 'store' action. A unique identifier for the memory. If not provided, one will be generated.
*   `memoryPath`: Optional. The directory path where memories are stored. Defaults to './agent_memies'.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { MemoryNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running MemoryNode Example ---');

  // --- Example 1: Store a memory ---
  console.log('\n--- Storing a Memory ---');
  const storeMemoryNode = new MemoryNode();
  storeMemoryNode.setParams({
    action: 'store',
    content: 'The capital of France is Paris. It is known for the Eiffel Tower.',
    id: 'france_capital'
  });

  const storeFlow = new AsyncFlow(storeMemoryNode);
  try {
    const result = await storeFlow.runAsync({});
    console.log('Store Memory Result:', result);
  } catch (error) {
    console.error('Store Memory Flow Failed:', error);
  }

  // --- Example 2: Retrieve a memory ---
  console.log('\n--- Retrieving a Memory ---');
  const retrieveMemoryNode = new MemoryNode();
  retrieveMemoryNode.setParams({
    action: 'retrieve',
    query: 'Eiffel Tower'
  });

  const retrieveFlow = new AsyncFlow(retrieveMemoryNode);
  try {
    const result = await retrieveFlow.runAsync({});
    console.log('Retrieve Memory Result:', result);
  } catch (error) {
    console.error('Retrieve Memory Flow Failed:', error);
  }

  console.log('\n--- MemoryNode Example Finished ---');
})();
```
