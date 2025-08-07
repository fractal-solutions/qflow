import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { MemoryNode, DeepSeekLLMNode } from '../src/nodes';

// Intermediate node to build the prompt for the LLM
class PromptBuilderNode extends AsyncNode {
  async execAsync(prepRes) {
    const retrievedContent = prepRes.map(mem => mem.content).join('\n\n');
    const question = this.params.question; // Question passed from test
    const prompt = `Based on the following context, answer the question:\n\nContext:\n${retrievedContent}\n\nQuestion: ${question}`;
    return prompt;
  }
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the MemoryNode RAG example.");
    return;
  }

  console.log('--- Running MemoryNode Test Workflow ---');

  // --- Test 1: Store a memory ---
  console.log('\n--- Test 1: Storing a Memory ---');
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
    if (result.status === 'stored') {
      console.log('Test 1 Passed: Memory stored successfully.');
    } else {
      console.error('Test 1 Failed: Memory not stored.');
    }
  } catch (error) {
    console.error('Test 1 Failed: Store Memory Flow Failed:', error);
  }

  // --- Test 2: Retrieve a memory ---
  console.log('\n--- Test 2: Retrieving a Memory ---');
  const retrieveMemoryNode = new MemoryNode();
  retrieveMemoryNode.setParams({
    action: 'retrieve',
    query: 'Eiffel Tower'
  });

  const retrieveFlow = new AsyncFlow(retrieveMemoryNode);
  try {
    const result = await retrieveFlow.runAsync({});
    console.log('Retrieve Memory Result:', result);
    if (result.length > 0 && result[0].content.includes('Eiffel Tower')) {
      console.log('Test 2 Passed: Memory retrieved successfully.');
    } else {
      console.error('Test 2 Failed: Memory not retrieved or incorrect.');
    }
  } catch (error) {
    console.error('Test 2 Failed: Retrieve Memory Flow Failed:', error);
  }

  // --- Test 3: Simple RAG Example with MemoryNode and LLM ---
  console.log('\n--- Test 3: Simple RAG Example ---');

  // Store another memory for RAG
  const storeRagMemoryNode = new MemoryNode();
  storeRagMemoryNode.setParams({
    action: 'store',
    content: 'The primary function of a CPU is to execute instructions that make up a computer program.',
    id: 'cpu_function'
  });
  await new AsyncFlow(storeRagMemoryNode).runAsync({});

  // Step 1: Retrieve relevant memories based on a query
  const ragRetrieveNode = new MemoryNode();
  ragRetrieveNode.setParams({
    action: 'retrieve',
    query: 'computer program'
  });

  // Step 2: Use an LLM to answer a question based on retrieved memories
  const ragLLMNode = new DeepSeekLLMNode();
  ragLLMNode.preparePrompt = (shared) => {
    const retrievedContent = shared.memoryResult.map(mem => mem.content).join('\n\n');
    ragLLMNode.setParams({
      apiKey: DEEPSEEK_API_KEY,
      prompt: `Based on the following context, answer the question:\n\nContext:\n${retrievedContent}\n\nQuestion: What is the main role of a CPU?`,
      keyword: 'rag_llm'
    });
  };

  ragRetrieveNode.next(ragLLMNode);

  

  const ragFlow = new AsyncFlow(ragRetrieveNode);
  try {
    const ragResult = await ragFlow.runAsync({});
    console.log('RAG Example LLM Response:', ragResult);
    if (ragResult.toLowerCase().includes('execute instructions') && ragResult.toLowerCase().includes('cpu')) {
      console.log('Test 3 Passed: RAG example produced relevant answer.');
    }
    else {
      console.error('Test 3 Failed: RAG example did not produce relevant answer.');
    }
  }
  catch (error) {
    console.error('Test 3 Failed: RAG Flow Failed:', error);
  }

  console.log('\n--- MemoryNode Test Workflow Finished ---');
})();