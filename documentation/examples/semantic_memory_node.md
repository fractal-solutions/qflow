### 19. Semantic Memory Node

Stores and retrieves text-based memories using vector embeddings for semantic search. This enables agents to have a more advanced, meaning-based long-term memory.

**Prerequisites:** Requires [Ollama](https://ollama.ai/) and an embedding model (e.g., `ollama pull nomic-embed-text`).

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { SemanticMemoryNode, DeepSeekLLMNode } from '@fractal-solutions/qflow/nodes';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the SemanticMemoryNode RAG example.");
    return;
  }

  console.log('--- Running SemanticMemoryNode RAG Example ---');

  // 1. Store a semantic memory
  const storeSemanticMemory = new SemanticMemoryNode();
  storeSemanticMemory.setParams({
    action: 'store',
    content: 'The capital of France is Paris. It is known for the Eiffel Tower and its romantic atmosphere.',
    id: 'france_capital_sem',
    metadata: { source: 'wikipedia', topic: 'geography' }
  });
  await new AsyncFlow(storeSemanticMemory).runAsync({});
  console.log('Semantic memory stored.');

  // 2. Store another memory for RAG
  const storeRagSemanticMemory = new SemanticMemoryNode();
  storeRagSemanticMemory.setParams({
    action: 'store',
    content: 'Quantum computing uses quantum-mechanical phenomena like superposition and entanglement to perform computations.',
    id: 'quantum_comp_intro',
    metadata: { topic: 'physics' }
  });
  await new AsyncFlow(storeRagSemanticMemory).runAsync({});
  console.log('Another semantic memory stored.');

  // 3. Retrieve relevant semantic memories based on a query
  const ragRetrieveSemantic = new SemanticMemoryNode();
  ragRetrieveSemantic.setParams({
    action: 'retrieve',
    query: 'city of love',
    topK: 1
  });

  // 4. Use an LLM to answer a question based on retrieved memories
  const ragLLM = new DeepSeekLLMNode();
  ragLLM.setParams({ apiKey: DEEPSEEK_API_KEY });

  ragRetrieveSemantic.next(ragLLM);

  ragLLM.preparePrompt = (shared) => {
    const retrievedContent = shared.semanticMemoryResult.map(mem => mem.content).join('\n\n');
    ragLLM.setParams({
      prompt: `Based on the following context, answer the question:\n\nContext:\n${retrievedContent}\n\nQuestion: Explain quantum computing in simple terms.`,
      keyword: 'semantic_rag_llm'
    });
  };

  const ragFlow = new AsyncFlow(ragRetrieveSemantic);
  try {
    const ragResult = await ragFlow.runAsync({});
    console.log('\n--- Semantic RAG Example LLM Response ---');
    console.log(ragResult);
  } catch (error) {
    console.error('RAG Flow Failed:', error);
  }

  console.log('\n--- SemanticMemoryNode RAG Example Finished ---');
})();
```