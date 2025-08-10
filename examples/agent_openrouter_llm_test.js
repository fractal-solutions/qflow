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
  TransformNode,
  CodeInterpreterNode,
  SubFlowNode,
  IteratorNode,
  AppendFileNode,
  MemoryNode,
  AgentOpenRouterLLMNode,
  InteractiveInputNode,
  SystemNotificationNode
    } from '../src/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { BrowserControlNode } from '../src/nodes/browser_control.js';

// --- Configuration ---
const OPENROUTER_API_KEY = process.env.OPEN_ROUTER_KEY;
const OPENROUTER_MODEL = process.env.OPEN_ROUTER_MODEL || 'openai/gpt-4o';
const OPENROUTER_SITE_URL = process.env.OPEN_ROUTER_URL || 'https://example.com';
const OPENROUTER_SITE_TITLE = process.env.OPENROUTER_SITE_TITLE || 'QFlow Agent';

const KNOWLEDGE_BASE_DIR = path.join(os.tmpdir(), 'qflow_or_agent_kb');

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
  if (!OPENROUTER_API_KEY) {
    console.warn("WARNING: OPENROUTER_API_KEY is not set. Please set it to run the OpenRouter Agent example.");
    console.warn("You can get a token from https://openrouter.ai/settings/tokens");
    return;
  }

  console.log('--- Running OpenRouter Agent Test Workflow ---');

  // 0. Setup the knowledge base files
  await setupAndLoadKnowledgeBase();

  // 1. Node to get the goal from the user
  const getGoalNode = new UserInputNode();
  getGoalNode.setParams({ prompt: 'Please enter the agent\'s goal: ' });

  // 2. Instantiate the LLM for the agent\'s reasoning
  const agentLLM = new AgentOpenRouterLLMNode();
  agentLLM.setParams({
    model: OPENROUTER_MODEL,
    apiKey: OPENROUTER_API_KEY,
    siteUrl: OPENROUTER_SITE_URL,
    siteTitle: OPENROUTER_SITE_TITLE,
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
  const codeInterpreter = new CodeInterpreterNode();
  const subFlow = new SubFlowNode();
  const iterator = new IteratorNode(); 
  const interactiveInput = new InteractiveInputNode();
  const systemNotification = new SystemNotificationNode();
  const browserControl = new BrowserControlNode();

  class StatefulAppendFileNode extends AppendFileNode {
    async execAsync(prepRes, shared) {
      this.setParams(shared.item);
      return super.execAsync();
    }
  }

  class StatefulMemoryNode extends MemoryNode {
    async execAsync(prepRes, shared) {
      this.setParams(shared.item);
      return super.execAsync();
    }
  }

  const appendToFileFlow = new AsyncFlow(new StatefulAppendFileNode());
  const memoryNodeFlow = new AsyncFlow(new StatefulMemoryNode());

  const flowRegistry = {
    append_to_file_flow: appendToFileFlow,
    memory_node_flow: memoryNodeFlow,
  };

  // Map tool names to their instances
  const availableTools = {
    duckduckgo_search: duckduckgoSearch,
    shell_command: shellCommand,
    read_file: readFile,
    write_file: writeFile,
    http_request: httpRequest,
    web_scraper: webScraper,
    browser_control: browserControl,
    interactive_input: interactiveInput,
    system_notification: systemNotification,
    semantic_memory_node: semanticMemoryNode,
    transform_node: transformNode,
    code_interpreter: codeInterpreter,
    sub_flow: subFlow,
    iterator: iterator,
    
    // Add other tools as needed
  };

  // 4. Instantiate the AgentNode
  // 2.1. Instantiate a separate LLM for summarization (can be the same model or a smaller one)
  const summarizeLLM = new AgentOpenRouterLLMNode();
  summarizeLLM.setParams({
    model: OPENROUTER_MODEL, // Or a smaller model like 'openai/gpt-3.5-turbo'
    apiKey: OPENROUTER_API_KEY,
    siteUrl: OPENROUTER_SITE_URL,
    siteTitle: OPENROUTER_SITE_TITLE,
  });

  // 4. Instantiate the AgentNode
  const agent = new AgentNode(agentLLM, availableTools, summarizeLLM, flowRegistry);
  // The goal will be set dynamically from the UserInputNode's output
  agent.prepAsync = async (shared) => {
    agent.setParams({ goal: shared.userInput });
  };

  // 5. Chain the nodes: Get Goal -> Agent
  getGoalNode.next(agent);

  // 6. Create and run the flow
  const orAgentFlow = new AsyncFlow(getGoalNode);

  try {
    const finalResult = await orAgentFlow.runAsync({});
    console.log('\n--- OpenRouter Agent Test Workflow Finished ---');
    console.log('Final Agent Output:', finalResult);
  } catch (error) {
    console.error('\n--- OpenRouter Agent Test Workflow Failed ---', error);
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