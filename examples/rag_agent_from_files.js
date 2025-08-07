import { AsyncFlow } from '../src/qflow.js';
import {
  AgentDeepSeekLLMNode,
  OllamaLLMNode,
  SemanticMemoryNode,
  WriteFileNode,
  ReadFileNode,
  ListDirectoryNode,
  UserInputNode,
  AgentNode
} from '../src/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

// --- Configuration ---
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_LLM_MODEL = process.env.OLLAMA_LLM_MODEL || 'llama2'; // e.g., llama2, mistral
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

// Set to 'deepseek' or 'ollama' to choose which LLM the agent will use
const LLM_CHOICE = process.env.LLM_CHOICE || 'deepseek'; 

const KNOWLEDGE_BASE_DIR = path.join(os.tmpdir(), 'qflow_rag_knowledge_base');

// --- Helper Function to Setup Knowledge Base ---
async function setupKnowledgeBase() {
  console.log(`[Setup] Ensuring knowledge base directory exists: ${KNOWLEDGE_BASE_DIR}`);
  await fs.mkdir(KNOWLEDGE_BASE_DIR, { recursive: true }).catch(() => {});

  const filesToCreate = [
    { name: 'ai_basics.txt', content: 'Artificial intelligence (AI) is intelligence demonstrated by machines. It involves machine learning, deep learning, and natural language processing. AI aims to enable machines to perform human-like cognitive functions.' },
    { name: 'ml_types.txt', content: 'Machine learning (ML) is a subset of AI. It includes supervised learning (training on labeled data), unsupervised learning (finding patterns in unlabeled data), and reinforcement learning (learning through trial and error). Supervised learning examples: classification, regression. Unsupervised learning examples: clustering, dimensionality reduction.' },
    { name: 'nlp_intro.txt', content: 'Natural Language Processing (NLP) is a field of AI that focuses on enabling computers to understand, interpret, and generate human language. Key NLP tasks include sentiment analysis, machine translation, and text summarization.' },
    { name: 'deep_learning.txt', content: 'Deep learning is a specialized branch of machine learning that uses neural networks with many layers (deep neural networks). It has revolutionized areas like image recognition and speech recognition. Convolutional Neural Networks (CNNs) are used for images, Recurrent Neural Networks (RNNs) for sequences, and Transformers for advanced NLP.' },
  ];

  console.log('[Setup] Writing knowledge base files...');
  for (const file of filesToCreate) {
    const filePath = path.join(KNOWLEDGE_BASE_DIR, file.name);
    await fs.writeFile(filePath, file.content, 'utf-8');
    console.log(`[Setup] Wrote ${file.name}`);
  }
  console.log('[Setup] Knowledge base setup complete.');
}

// --- Main Workflow ---
(async () => {
  if (LLM_CHOICE === 'deepseek' && !DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the DeepSeek RAG Agent example.");
    return;
  }
  if (LLM_CHOICE === 'ollama') {
    console.log("INFO: Ensure Ollama is running and models are pulled (e.g., 'ollama pull llama2' and 'ollama pull nomic-embed-text').");
  }

  console.log('--- Running RAG Agent from Files Workflow ---');

  // 0. Setup the knowledge base files
  await setupKnowledgeBase();

  // 1. Node to get the goal from the user
  const getGoalNode = new UserInputNode();
  getGoalNode.setParams({ prompt: 'Please ask a question about AI, ML, or NLP: ' });

  // 2. Instantiate the LLM for the agent's reasoning and final answer generation
  let agentLLM;
  if (LLM_CHOICE === 'deepseek') {
    agentLLM = new AgentDeepSeekLLMNode();
    agentLLM.setParams({ apiKey: DEEPSEEK_API_KEY });
  } else {
    agentLLM = new OllamaLLMNode();
    agentLLM.setParams({ model: OLLAMA_LLM_MODEL, baseUrl: OLLAMA_BASE_URL });
  }

  // 3. Instantiate the tools the agent can use
  const semanticMemoryNode = new SemanticMemoryNode();
  semanticMemoryNode.setParams({
    memoryPath: KNOWLEDGE_BASE_DIR, // Use the knowledge base directory for memories
    embeddingModel: OLLAMA_EMBEDDING_MODEL,
    embeddingBaseUrl: OLLAMA_BASE_URL
  });

  // Map tool names to their instances
  const availableTools = {
    semantic_memory_node: semanticMemoryNode,
    // The agent will use its internal LLM for reasoning, so no separate llm_reasoning tool is needed here
    // If you wanted the agent to explicitly call a different LLM for reasoning, you'd add it here.
  };

  // 4. Instantiate the AgentNode
  const agent = new AgentNode(agentLLM, availableTools);

  // Agent's prepAsync: This is where the RAG logic happens
  agent.prepAsync = async (shared) => {
    const userQuery = shared.userInput; // Get the user's question

    // First, store all knowledge base files into semantic memory
    console.log('[Agent] Storing knowledge base files into semantic memory...');
    const files = await fs.readdir(KNOWLEDGE_BASE_DIR);
    for (const file of files) {
      if (file.endsWith('.txt')) {
        const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const storeNode = new SemanticMemoryNode();
        storeNode.setParams({
          action: 'store',
          content: content,
          id: file.replace('.txt', ''),
          memoryPath: KNOWLEDGE_BASE_DIR, // Ensure it stores in the correct path
          embeddingModel: OLLAMA_EMBEDDING_MODEL,
          embeddingBaseUrl: OLLAMA_BASE_URL
        });
        await new AsyncFlow(storeNode).runAsync({});
      }
    }
    console.log('[Agent] Knowledge base loaded into semantic memory.');

    // Then, retrieve relevant context using the semantic memory tool
    console.log(`[Agent] Retrieving relevant context for query: "${userQuery}"...`);
    const retrieveNode = new SemanticMemoryNode();
    retrieveNode.setParams({
      action: 'retrieve',
      query: userQuery,
      topK: 3, // Retrieve top 3 most relevant chunks
      memoryPath: KNOWLEDGE_BASE_DIR, // Ensure it retrieves from the correct path
      embeddingModel: OLLAMA_EMBEDDING_MODEL,
      embeddingBaseUrl: OLLAMA_BASE_URL
    });
    const retrieveFlow = new AsyncFlow(retrieveNode);
    const retrievedContexts = await retrieveFlow.runAsync({});

    const contextString = retrievedContexts.map(c => c.content).join('\n\n');

    // Construct the prompt for the LLM with the retrieved context
    const prompt = `You are a helpful assistant. Use the following context to answer the question. If the answer is not in the context, state that you don't know.

Context:
${contextString}

Question: ${userQuery}

Answer:`;

    // Set the agent's goal (which becomes the LLM's prompt)
    agent.setParams({ goal: prompt });
  };

  // 5. Chain the nodes: Get Goal -> Agent
  getGoalNode.next(agent);

  // 6. Create and run the flow
  const ragAgentFlow = new AsyncFlow(getGoalNode);

  try {
    const finalResult = await ragAgentFlow.runAsync({});
    console.log('\n--- RAG Agent from Files Workflow Finished ---');
    console.log('Final Agent Output:', finalResult);
  } catch (error) {
    console.error('\n--- RAG Agent from Files Workflow Failed ---', error);
  } finally {
    // Clean up temporary knowledge base (optional)
    try {
      console.log(`[Cleanup] Cleaning up knowledge base directory: ${KNOWLEDGE_BASE_DIR}`);
      await fs.rm(KNOWLEDGE_BASE_DIR, { recursive: true, force: true });
      console.log(`[Cleanup] Cleaned up.`);
    } catch (e) {
      console.warn(`[Cleanup] Could not clean up ${KNOWLEDGE_BASE_DIR}:`, e.message);
    }
  }
})();