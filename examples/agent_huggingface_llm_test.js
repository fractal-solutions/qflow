import { AsyncFlow } from '../src/qflow.js';
import {
  AgentHuggingFaceLLMNode,
  DuckDuckGoSearchNode,
  ShellCommandNode,
  ReadFileNode,
  WriteFileNode,
  HttpRequestNode,
  ScrapeURLNode,
  UserInputNode,
  AgentNode,
  SemanticMemoryNode,
  TransformNode
} from '../src/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

// --- Configuration ---
const HF_TOKEN = process.env.HF_TOKEN; // Your Hugging Face API token
const HF_AGENT_MODEL = process.env.HF_MODEL || 'HuggingFaceH4/zephyr-7b-beta'; // Agent-capable model

const KNOWLEDGE_BASE_DIR = path.join(os.tmpdir(), 'qflow_hf_agent_kb');

const knowledgeBaseContent = [
  { id: 'doc_qflow_overview', content: 'qflow is a lightweight JavaScript library for building workflows and agents. It uses nodes for atomic operations and flows to chain them. It supports async operations and shared state.' },
  { id: 'doc_qflow_nodes', content: 'qflow has various built-in nodes like FileSystemNode, HttpRequestNode, CodeInterpreterNode, SemanticMemoryNode, and TransformNode. These nodes allow agents to interact with the environment.' },
  { id: 'doc_qflow_agent', content: 'The AgentNode in qflow uses an LLM for reasoning and tool selection. It operates in a Reason->Act->Observe loop to achieve complex goals by calling available tools.' },
];

// --- Helper Function to Setup Knowledge Base ---
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
        embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
        embeddingBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
      });
      await new AsyncFlow(storeNode).runAsync({});
      console.log(`[Setup] Loaded ${file} into semantic memory.`);
    }
  }
  console.log('[Setup] Knowledge base loading complete.');
}

// --- Main Workflow ---
(async () => {
  if (!HF_TOKEN) {
    console.warn("WARNING: HF_TOKEN is not set. Please set it to run the HuggingFace Agent example.");
    console.warn("You can get a token from https://huggingface.co/settings/tokens");
    return;
  }

  console.log('--- Running HuggingFace Agent Test Workflow ---');

  // 0. Setup the knowledge base files
  await setupAndLoadKnowledgeBase();

  // 1. Node to get the goal from the user
  const getGoalNode = new UserInputNode();
  getGoalNode.setParams({ prompt: 'Please enter the agent\'s goal (e.g., "What is qflow?"): ' });

  // 2. Instantiate the LLM for the agent's reasoning
  const agentLLM = new AgentHuggingFaceLLMNode();
  agentLLM.setParams({
    model: HF_AGENT_MODEL,
    hfToken: HF_TOKEN,
    temperature: 0.7,
    max_new_tokens: 2000, // Increased for potentially longer JSON outputs
    baseUrl: 'https://router.huggingface.co/v1' // Use OpenAI-compatible router
  });

  // 3. Instantiate the tools the agent can use
  const duckduckgoSearch = new DuckDuckGoSearchNode();
  const shellCommand = new ShellCommandNode();
  const readFile = new ReadFileNode();
  const writeFile = new WriteFileNode();
  const httpRequest = new HttpRequestNode();
  const webScraper = new ScrapeURLNode();
  const userInput = new UserInputNode(); // Agent can also ask for user input
  const semanticMemoryNode = new SemanticMemoryNode();
  semanticMemoryNode.setParams({
    memoryPath: KNOWLEDGE_BASE_DIR, // Use the knowledge base directory for memories
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
    embeddingBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  });
  const transformNode = new TransformNode();

  // Map tool names to their instances
  const availableTools = {
    duckduckgo_search: duckduckgoSearch,
    shell_command: shellCommand,
    read_file: readFile,
    write_file: writeFile,
    http_request: httpRequest,
    web_scraper: webScraper,
    user_input: userInput,
    semantic_memory_node: semanticMemoryNode,
    transform_node: transformNode,
    // Add other tools as needed
  };

  // 4. Instantiate the AgentNode
  const agent = new AgentNode(agentLLM, availableTools);
  // The goal will be set dynamically from the UserInputNode's output
  agent.prepAsync = async (shared) => {
    agent.setParams({ goal: shared.userInput });
  };

  // 5. Chain the nodes: Get Goal -> Agent
  getGoalNode.next(agent);

  // 6. Create and run the flow
  const hfAgentFlow = new AsyncFlow(getGoalNode);

  try {
    const finalResult = await hfAgentFlow.runAsync({});
    console.log('\n--- HuggingFace Agent Test Workflow Finished ---');
    console.log('Final Agent Output:', finalResult);
  } catch (error) {
    console.error('\n--- HuggingFace Agent Test Workflow Failed ---', error);
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