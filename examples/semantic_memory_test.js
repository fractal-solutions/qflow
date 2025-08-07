import { AsyncFlow } from '../src/qflow.js';
import { SemanticMemoryNode, DeepSeekLLMNode } from '../src/nodes';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the SemanticMemoryNode RAG example.");
    return;
  }

  console.log('--- Running SemanticMemoryNode Test Workflow ---');

  // --- Test 1: Store a semantic memory ---
  console.log('\n--- Test 1: Storing a Semantic Memory ---');
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
    if (result.status === 'stored') {
      console.log('Test 1 Passed: Semantic memory stored successfully.');
    } else {
      console.error('Test 1 Failed: Semantic memory not stored.');
    }
  } catch (error) {
    console.error('Test 1 Failed: Store Semantic Memory Flow Failed:', error);
  }

  // --- Test 2: Retrieve a semantic memory ---
  console.log('\n--- Test 2: Retrieving a Semantic Memory ---');
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
    if (result.length > 0 && result[0].content.includes('Paris') && result[0].similarity > 0.5) {
      console.log('Test 2 Passed: Semantic memory retrieved successfully.');
    } else {
      console.error('Test 2 Failed: Semantic memory not retrieved or incorrect.');
    }
  } catch (error) {
    console.error('Test 2 Failed: Retrieve Semantic Memory Flow Failed:', error);
  }

  // --- Test 3: Simple Semantic RAG Example with SemanticMemoryNode and LLM ---
  console.log('\n--- Test 3: Simple Semantic RAG Example ---');

  // Store another memory for RAG
  const storeRagSemanticMemoryNode = new SemanticMemoryNode();
  storeRagSemanticMemoryNode.setParams({
    action: 'store',
    content: 'Quantum computing uses quantum-mechanical phenomena like superposition and entanglement to perform computations.',
    id: 'quantum_comp_intro',
    metadata: { topic: 'physics' }
  });
  await new AsyncFlow(storeRagSemanticMemoryNode).runAsync({});

  // Step 1: Retrieve relevant semantic memories based on a query
  const ragRetrieveSemanticNode = new SemanticMemoryNode();
  ragRetrieveSemanticNode.setParams({
    action: 'retrieve',
    query: 'how does quantum computers work',
    topK: 1
  });

  // Step 2: Use an LLM to answer a question based on retrieved memories
  const ragLLMNode = new DeepSeekLLMNode();
  ragLLMNode.setParams({ apiKey: DEEPSEEK_API_KEY });

  ragRetrieveSemanticNode.next(ragLLMNode);

  ragLLMNode.preparePrompt = (shared) => {
    const retrievedContent = shared.semanticMemoryResult.map(mem => mem.content).join('\n\n');
    ragLLMNode.setParams({
      prompt: `Based on the following context, answer the question:\n\nContext:\n${retrievedContent}\n\nQuestion: Explain quantum computing in simple terms.`,
      keyword: 'semantic_rag_llm'
    });
  };

  const ragFlow = new AsyncFlow(ragRetrieveSemanticNode);
  try {
    const ragResult = await ragFlow.runAsync({});
    console.log('Semantic RAG Example LLM Response:', ragResult);
    if (ragResult.toLowerCase().includes('superposition') && ragResult.toLowerCase().includes('entanglement')) {
      console.log('Test 3 Passed: Semantic RAG example produced relevant answer.');
    } else {
      console.error('Test 3 Failed: Semantic RAG example did not produce relevant answer.');
    }
  } catch (error) {
    console.error('Test 3 Failed: Semantic RAG Flow Failed:', error);
  }

  console.log('\n--- SemanticMemoryNode Test Workflow Finished ---');
})();