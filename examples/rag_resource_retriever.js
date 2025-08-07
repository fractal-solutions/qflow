import { AsyncFlow } from '../src/qflow.js';
import {
  SemanticMemoryNode,
} from '../src/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

// --- Configuration ---
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

const KNOWLEDGE_BASE_DIR = path.join(os.tmpdir(), 'qflow_rag_retriever_kb');

const knowledgeBaseContent = [
  { id: 'doc_ai_basics', content: 'Artificial intelligence (AI) is intelligence demonstrated by machines. It involves machine learning, deep learning, and natural language processing. AI aims to enable machines to perform human-like cognitive functions.' },
  { id: 'doc_ml_types', content: 'Machine learning (ML) is a subset of AI. It includes supervised learning (training on labeled data), unsupervised learning (finding patterns in unlabeled data), and reinforcement learning (learning through trial and error). Supervised learning examples: classification, regression. Unsupervised learning examples: clustering, dimensionality reduction.' },
  { id: 'doc_nlp_intro', content: 'Natural Language Processing (NLP) is a field of AI that focuses on enabling computers to understand, interpret, and generate human language. Key NLP tasks include sentiment analysis, machine translation, and text summarization.' },
  { id: 'doc_deep_learning', content: 'Deep learning is a specialized branch of machine learning that uses neural networks with many layers (deep neural networks). It has revolutionized areas like image recognition and speech recognition. Convolutional Neural Networks (CNNs) are used for images, Recurrent Neural Networks (RNNs) for sequences, and Transformers for advanced NLP.' },
  { id: 'doc_history_ai', content: 'The history of AI dates back to the 1950s with pioneers like Alan Turing. Early AI research focused on symbolic methods and expert systems, which were rule-based approaches to problem-solving.' },
  { id: 'doc_robotics', content: 'Robotics is an interdisciplinary field that integrates computer science and engineering. Robotics involves the design, construction, operation, and use of robots. The goal of robotics is to design machines that can help and assist humans.' },
];

// --- Helper Function to Setup Knowledge Base ---
async function setupAndLoadKnowledgeBase() {
  console.log(`[Setup] Ensuring knowledge base directory exists: ${KNOWLEDGE_BASE_DIR}`);
  await fs.mkdir(KNOWLEDGE_BASE_DIR, { recursive: true }).catch(() => {});

  console.log('[Setup] Storing knowledge base content into SemanticMemoryNode...');
  for (const doc of knowledgeBaseContent) {
    const storeNode = new SemanticMemoryNode();
    storeNode.setParams({
      action: 'store',
      content: doc.content,
      id: doc.id,
      memoryPath: KNOWLEDGE_BASE_DIR, // Ensure it stores in the correct path
      embeddingModel: OLLAMA_EMBEDDING_MODEL,
      embeddingBaseUrl: OLLAMA_BASE_URL
    });
    await new AsyncFlow(storeNode).runAsync({});
    console.log(`[Setup] Stored ${doc.id}`);
  }
  console.log('[Setup] Knowledge base loading complete.');
}

// --- Main Workflow ---
(async () => {
  console.log('--- Running RAG Resource Retriever Workflow ---');
  console.log("INFO: Ensure Ollama is running and embedding model is pulled (e.g., 'ollama pull nomic-embed-text').");

  // 0. Setup and load the knowledge base into semantic memory
  await setupAndLoadKnowledgeBase();

  // --- Self-Generated Test Cases ---
  const testCases = [
    {
      query: 'What is artificial intelligence?',
      expectedTopResultId: 'doc_ai_basics',
      description: 'Basic AI definition'
    },
    {
      query: 'Tell me about different types of machine learning.',
      expectedTopResultId: 'doc_ml_types',
      description: 'Machine learning types'
    },
    {
      query: 'How do computers understand human language?',
      expectedTopResultId: 'doc_nlp_intro',
      description: 'Natural Language Processing'
    },
    {
      query: 'What are neural networks used for in deep learning?',
      expectedTopResultId: 'doc_deep_learning',
      description: 'Deep learning and neural networks'
    },
    {
      query: 'Who started AI research?',
      expectedTopResultId: 'doc_history_ai',
      description: 'History of AI'
    },
    {
      query: 'What is the field of robots?',
      expectedTopResultId: 'doc_robotics',
      description: 'Robotics definition'
    },
    {
      query: 'What is reinforcement learning?',
      expectedTopResultId: 'doc_ml_types',
      description: 'Specific ML type'
    },
    {
      query: 'What is computer vision?',
      expectedTopResultId: 'doc_deep_learning',
      description: 'Application of deep learning'
    },
  ];

  let allTestsPassed = true;

  for (const testCase of testCases) {
    console.log(`\n--- Test Case: ${testCase.description} (Query: "${testCase.query}") ---`);
    const retrieveNode = new SemanticMemoryNode();
    retrieveNode.setParams({
      action: 'retrieve',
      query: testCase.query,
      topK: 3, // Retrieve top 3 most relevant chunks
      memoryPath: KNOWLEDGE_BASE_DIR,
      embeddingModel: OLLAMA_EMBEDDING_MODEL,
      embeddingBaseUrl: OLLAMA_BASE_URL
    });

    const retrieveFlow = new AsyncFlow(retrieveNode);
    try {
      const retrievedSources = await retrieveFlow.runAsync({});

      console.log('Retrieved Sources (Top 3):');
      if (retrievedSources.length > 0) {
        retrievedSources.forEach((source, index) => {
          console.log(`  ${index + 1}. ID: ${source.id}, Similarity: ${source.similarity.toFixed(4)}`);
          console.log(`     Content: "${source.content.substring(0, 100)}..."`);
        });

        // Assertion: Check if the expected top result is indeed the top result
        if (retrievedSources[0].id === testCase.expectedTopResultId) {
          console.log(`Test Case Passed: Expected top result '${testCase.expectedTopResultId}' found.`);
        } else {
          console.error(`Test Case FAILED: Expected top result '${testCase.expectedTopResultId}', but got '${retrievedSources[0].id}'.`);
          allTestsPassed = false;
        }
      } else {
        console.error('Test Case FAILED: No sources retrieved.');
        allTestsPassed = false;
      }
    } catch (error) {
      console.error(`Test Case FAILED: Error during retrieval: ${error.message}`);
      allTestsPassed = false;
    }
  }

  console.log('\n--- RAG Resource Retriever Workflow Finished ---');
  if (allTestsPassed) {
    console.log('All Retrieval Test Cases Passed Successfully!');
  } else {
    console.error('Some Retrieval Test Cases FAILED.');
  }

  // Clean up temporary knowledge base (optional)
  try {
    console.log(`[Cleanup] Cleaning up knowledge base directory: ${KNOWLEDGE_BASE_DIR}`);
    await fs.rm(KNOWLEDGE_BASE_DIR, { recursive: true, force: true });
    console.log(`[Cleanup] Cleaned up.`);
  } catch (e) {
    console.warn(`[Cleanup] Could not clean up ${KNOWLEDGE_BASE_DIR}:`, e.message);
  }
})();