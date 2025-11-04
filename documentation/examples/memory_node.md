### 15. Memory Node (Lightweight RAG)

Storing and retrieving text-based memories for lightweight Retrieval-Augmented Generation (RAG).

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { MemoryNode, DeepSeekLLMNode } from '@fractal-solutions/qflow/nodes';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the MemoryNode RAG example.");
    return;
  }

  console.log('--- Running MemoryNode RAG Example ---');

  // 1. Store a memory
  const storeMemory = new MemoryNode();
  storeMemory.setParams({
    action: 'store',
    content: 'The capital of France is Paris. It is known for the Eiffel Tower.',
    id: 'france_capital'
  });
  await new AsyncFlow(storeMemory).runAsync({});
  console.log('Memory stored.');

  // 2. Store another memory for RAG
  const storeRagMemory = new MemoryNode();
  storeRagMemory.setParams({
    action: 'store',
    content: 'The primary function of a CPU is to execute instructions that make up a computer program.',
    id: 'cpu_function'
  });
  await new AsyncFlow(storeRagMemory).runAsync({});
  console.log('Another memory stored.');

  // 3. Retrieve relevant memories based on a query
  const ragRetrieve = new MemoryNode();
  ragRetrieve.setParams({
    action: 'retrieve',
    query: 'computer program'
  });

  // 4. Use an LLM to answer a question based on retrieved memories
  const ragLLM = new DeepSeekLLMNode();
  ragLLM.preparePrompt = (shared) => {
    const retrievedContent = shared.memoryResult.map(mem => mem.content).join('\n\n');
    ragLLM.setParams({
      apiKey: DEEPSEEK_API_KEY,
      prompt: `Based on the following context, answer the question:\n\nContext:\n${retrievedContent}\n\nQuestion: What is the main role of a CPU?`,
      keyword: 'rag_llm'
    });
  };

  ragRetrieve.next(ragLLM);

  const ragFlow = new AsyncFlow(ragRetrieve);
  try {
    const ragResult = await ragFlow.runAsync({});
    console.log('\n--- RAG Example LLM Response ---');
    console.log(ragResult);
  } catch (error) {
    console.error('RAG Flow Failed:', error);
  }

  console.log('\n--- MemoryNode RAG Example Finished ---');
})();
```
