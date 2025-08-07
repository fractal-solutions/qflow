import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import {
  SemanticMemoryNode,
  UserInputNode,
  ReadFileNode,
  WriteFileNode
} from '../src/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

// --- Configuration ---
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

const KNOWLEDGE_BASE_DIR = path.join(os.tmpdir(), 'qflow_rag_user_kb');

const knowledgeBaseContent = [
  { id: 'doc_ai_overview', content: 'Artificial intelligence (AI) is a broad field of computer science that gives computers the ability to perform human-like cognitive functions such as learning, problem-solving, and decision-making. It encompasses machine learning, deep learning, and natural language processing.' },
  { id: 'doc_ml_basics', content: 'Machine learning (ML) is a core component of AI, enabling systems to learn from data without explicit programming. It\'s categorized into supervised, unsupervised, and reinforcement learning. Supervised learning uses labeled data, while unsupervised learning finds patterns in unlabeled data.' },
  { id: 'doc_deep_learning_details', content: 'Deep learning is a subset of machine learning that uses artificial neural networks with multiple layers (deep neural networks) to analyze data. This architecture allows it to learn complex patterns directly from raw data, leading to breakthroughs in image recognition, speech recognition, and natural language processing.' },
  { id: 'doc_nlp_applications', content: 'Natural Language Processing (NLP) is an AI field focused on human-computer interaction through language. Applications include sentiment analysis (determining emotional tone), machine translation (converting text between languages), chatbots, and text summarization.' },
  { id: 'doc_computer_vision', content: 'Computer vision is an interdisciplinary field of artificial intelligence that trains computers to interpret and understand the visual world. Using digital images and videos, machines can identify and classify objects, detect and track events, and even reconstruct 3D scenes.' },
  { id: 'doc_reinforcement_learning', content: 'Reinforcement learning (RL) is an area of machine learning concerned with how intelligent agents ought to take actions in an environment to maximize the notion of cumulative reward. It\'s used in robotics, game playing (like AlphaGo), and autonomous driving.' },
  { id: 'doc_ethical_ai', content: 'Ethical AI considers the moral implications of developing and deploying artificial intelligence. Key concerns include bias in algorithms, privacy, accountability, and the potential impact on employment and society. Responsible AI development emphasizes fairness, transparency, and human oversight.' },
  { id: 'doc_ai_in_healthcare', content: 'AI is transforming healthcare by assisting with diagnostics, drug discovery, personalized treatment plans, and predictive analytics for disease outbreaks. Machine learning algorithms can analyze vast amounts of patient data to identify patterns and make predictions.' },
  { id: 'doc_ai_in_finance', content: 'In finance, AI is used for fraud detection, algorithmic trading, credit scoring, and personalized financial advice. Machine learning models can identify suspicious transactions or predict market trends with high accuracy.' },
  { id: 'doc_future_ai', content: 'The future of AI is expected to bring more advanced autonomous systems, hyper-personalized experiences, and breakthroughs in scientific research. Challenges include ensuring AI safety, addressing societal impacts, and achieving true general artificial intelligence.' },
  { id: 'doc_generative_ai', content: 'Generative AI refers to AI models that can create new content, such as images, text, audio, and video. Examples include Large Language Models (LLMs) like GPT-3, DALL-E for image generation, and models for creating synthetic data. These models learn patterns from existing data to generate novel outputs.' },
  { id: 'doc_ai_ethics_bias', content: 'Bias in AI systems can arise from biased training data, flawed algorithms, or societal prejudices reflected in the data. Addressing bias is crucial for fair and equitable AI, often involving data auditing, algorithmic fairness techniques, and diverse development teams.' },
  { id: 'doc_ai_safety', content: 'AI safety is a research area focused on preventing unintended harmful outcomes from advanced AI systems. This includes ensuring AI systems are aligned with human values, robust to adversarial attacks, and transparent in their decision-making processes.' },
  { id: 'doc_federated_learning', content: 'Federated learning is a machine learning approach that trains algorithms on decentralized datasets located on local devices (e.g., mobile phones, IoT devices) without exchanging the data itself. Only model updates are sent to a central server, enhancing privacy and reducing data transfer costs.' },
  { id: 'doc_edge_ai', content: 'Edge AI involves deploying AI models directly on edge devices (e.g., sensors, cameras, smart appliances) rather than in the cloud. This reduces latency, enhances privacy, and enables real-time decision-making, especially in applications like autonomous vehicles and industrial automation.' },
  { id: 'doc_explainable_ai', content: 'Explainable AI (XAI) is a set of techniques that allows users to understand why an AI model made a particular decision. As AI models become more complex, XAI is crucial for building trust, ensuring fairness, and complying with regulations, especially in critical domains like healthcare and finance.' },
  { id: 'doc_transfer_learning', content: 'Transfer learning is a machine learning technique where a model trained on one task is re-purposed or fine-tuned for a second, related task. This is particularly useful when data for the second task is scarce, as it leverages knowledge gained from the first task, often seen in computer vision and NLP with pre-trained models.' },
  { id: 'doc_nlp_transformers', content: 'Transformers are a type of neural network architecture that has revolutionized Natural Language Processing. They rely on self-attention mechanisms to weigh the importance of different words in a sequence, allowing for parallel processing and capturing long-range dependencies more effectively than traditional RNNs. They are the foundation of modern LLMs.' },
  { id: 'doc_mlops', content: 'MLOps (Machine Learning Operations) is a set of practices that aims to streamline the entire machine learning lifecycle, from data collection and model development to deployment, monitoring, and maintenance. It combines DevOps principles with ML-specific considerations to ensure reliable and efficient ML systems.' },
  { id: 'doc_ai_in_education', content: 'AI in education is being used for personalized learning paths, intelligent tutoring systems, automated grading, and administrative tasks. AI can adapt to individual student needs, provide instant feedback, and help educators identify learning gaps.' },
];

// --- Helper Function to Setup and Load Knowledge Base ---
async function setupAndLoadKnowledgeBase() {
  console.log(`[Setup] Ensuring knowledge base directory exists: ${KNOWLEDGE_BASE_DIR}`);
  await fs.mkdir(KNOWLEDGE_BASE_DIR, { recursive: true }).catch(() => {});

  console.log('[Setup] Writing knowledge base files to disk...');
  for (const doc of knowledgeBaseContent) {
    const filePath = path.join(KNOWLEDGE_BASE_DIR, `${doc.id}.txt`);
    const writeFileNode = new WriteFileNode();
    writeFileNode.setParams({
      filePath: filePath,
      content: doc.content
    });
    await new AsyncFlow(writeFileNode).runAsync({});
    console.log(`[Setup] Wrote ${doc.id}.txt`);
  }
  console.log('[Setup] All knowledge base files written.');

  console.log('[Setup] Loading knowledge base files into SemanticMemoryNode...');
  const files = await fs.readdir(KNOWLEDGE_BASE_DIR);
  for (const file of files) {
    if (file.endsWith('.txt')) {
      const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
      const readFileNode = new ReadFileNode();
      readFileNode.setParams({ filePath: filePath });
      const content = await new AsyncFlow(readFileNode).runAsync({});

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
      console.log(`[Setup] Loaded ${file} into semantic memory.`);
    }
  }
  console.log('[Setup] Knowledge base loading complete.');
}

// --- Main Workflow ---
(async () => {
  console.log('--- Running Interactive RAG Resource Retriever Workflow ---');
  console.log("INFO: Ensure Ollama is running and embedding model is pulled (e.g., 'ollama pull nomic-embed-text').");

  // 0. Setup and load the knowledge base into semantic memory
  await setupAndLoadKnowledgeBase();

  // 1. Node to get the user's query
  const getUserQueryNode = new UserInputNode();
  getUserQueryNode.setParams({ prompt: '\nAsk a question about AI, ML, NLP, or related topics (type \'exit\' to quit): ' });

  // 2. Node to retrieve relevant sources
  const retrieveSourcesNode = new SemanticMemoryNode();
  retrieveSourcesNode.setParams({
    action: 'retrieve',
    topK: 5, // Retrieve top 5 most relevant chunks
    memoryPath: KNOWLEDGE_BASE_DIR,
    embeddingModel: OLLAMA_EMBEDDING_MODEL,
    embeddingBaseUrl: OLLAMA_BASE_URL
  });

  // 3. Custom node to process user input and orchestrate retrieval
  class RAGOrchestratorNode extends AsyncNode {
    async execAsync(prepRes, shared) {
      const userQuery = shared.userInput; // Get user input from shared state

      if (userQuery.toLowerCase() === 'exit') {
        console.log('Exiting RAG retriever and cleaning up...');
        return 'exit_flow'; // Signal to exit the main flow
      }

      console.log(`[RAG] Retrieving relevant sources for query: "${userQuery}"...`);

      // Set the query for the retrieveSourcesNode
      retrieveSourcesNode.setParams({ ...retrieveSourcesNode.params, query: userQuery });

      // Run the retrieval flow
      const retrieveFlow = new AsyncFlow(retrieveSourcesNode);
      const retrievedSources = await retrieveFlow.runAsync({});

      console.log(`[RAG] Found ${retrievedSources.length} relevant sources for "${userQuery}":`);
      if (retrievedSources.length > 0) {
        retrievedSources.forEach((source, index) => {
          console.log(`  ${index + 1}. ID: ${source.id}, Similarity: ${source.similarity.toFixed(4)}`);
          console.log(`     Content: "${source.content.substring(0, Math.min(source.content.length, 150))}..."`);
        });
      } else {
        console.log('  No relevant sources found.');
      }
    }

    async postAsync(shared, prepRes, execRes) {
      if (execRes === 'exit_flow') return execRes;
      return 'continue'; // Always signal to continue loop
    }
  }

  class ExitNode extends AsyncNode {
    async execAsync(prepRes, shared) {
      return;
    }
  }

  const ragOrchestratorNode = new RAGOrchestratorNode();
  const exitNode = new ExitNode();

  // Chain: Get User Query -> RAG Orchestrator
  getUserQueryNode.next(ragOrchestratorNode);

  // Loop back to get user input indefinitely
  ragOrchestratorNode.next(getUserQueryNode, 'continue');
  ragOrchestratorNode.next(exitNode, 'exit_flow');

  // Create and run the flow
  const ragFlow = new AsyncFlow(getUserQueryNode);

  try {
    await ragFlow.runAsync({});
    // This part will only be reached if the flow somehow terminates internally without error
    console.log('--- Interactive RAG Resource Retriever Workflow Finished Unexpectedly ---');
  } catch (error) {
    console.error('--- Interactive RAG Resource Retriever Workflow Failed ---', error);
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

