import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import {
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
  SummarizeNode,
  AgentHuggingFaceLLMNode
} from '../src/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

// --- Configuration ---
const HF_TOKEN = process.env.HF_TOKEN; // Your Hugging Face API token
const HF_AGENT_MODEL = process.env.HF_MODEL || 'HuggingFaceH4/zephyr-7b-beta'; // Agent-capable model
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// --- Stateful Helper Nodes (to allow parameters to be passed via shared.item or shared.params) ---
// These nodes extract their parameters from the `shared` object, typically from `shared.item`
// when used within an IteratorNode, or directly from `shared.params` when used with SubFlowNode.

class StatefulReadFileNode extends ReadFileNode {
  async execAsync(prepRes, shared) {
    this.setParams(shared.item || shared.params);
    return super.execAsync();
  }
}

class StatefulWriteFileNode extends WriteFileNode {
  async execAsync(prepRes, shared) {
    this.setParams(shared.item || shared.params);
    return super.execAsync();
  }
}

class StatefulAppendFileNode extends AppendFileNode {
  async execAsync(prepRes, shared) {
    this.setParams(shared.item || shared.params);
    return super.execAsync();
  }
}

class StatefulHttpRequestNode extends HttpRequestNode {
  async execAsync(prepRes, shared) {
    this.setParams(shared.item || shared.params);
    return super.execAsync();
  }
}

class StatefulScrapeURLNode extends ScrapeURLNode {
  async execAsync(prepRes, shared) {
    this.setParams(shared.item || shared.params);
    return super.execAsync();
  }
}

class StatefulDuckDuckGoSearchNode extends DuckDuckGoSearchNode {
  async execAsync(prepRes, shared) {
    this.setParams(shared.item || shared.params);
    return super.execAsync();
  }
}

class StatefulSummarizeNode extends SummarizeNode {
  async execAsync(prepRes, shared) {
    this.setParams(shared.item || shared.params);
    // The LLM node for summarization needs to be passed explicitly
    this.params.llmNode = new AgentHuggingFaceLLMNode({
      model: HF_AGENT_MODEL,
      hfToken: HF_TOKEN,
      temperature: 0.7,
      max_new_tokens: 1000,
      baseUrl: 'https://router.huggingface.co/v1',
    });
    return super.execAsync();
  }
}

class StatefulTransformNode extends TransformNode {
  async execAsync(prepRes, shared) {
    this.setParams(shared.item || shared.params);
    return super.execAsync();
  }
}

class StatefulCodeInterpreterNode extends CodeInterpreterNode {
  async execAsync(prepRes, shared) {
    this.setParams(shared.item || shared.params);
    return super.execAsync();
  }
}

class StatefulMemoryNode extends MemoryNode {
  async execAsync(prepRes, shared) {
    this.setParams(shared.item || shared.params);
    return super.execAsync();
  }
}

class StatefulSemanticMemoryNode extends SemanticMemoryNode {
  async execAsync(prepRes, shared) {
    this.setParams(shared.item || shared.params);
    this.params.embeddingModel = OLLAMA_EMBEDDING_MODEL;
    this.params.embeddingBaseUrl = OLLAMA_BASE_URL;
    return super.execAsync();
  }
}

// --- Complex Flows Definition ---

// Flow 1: Web Research and Summarization
// Takes a 'query' and returns a summary of the top search result.
const webResearchAndSummarizeFlow = new AsyncFlow();
const searchNode = new StatefulDuckDuckGoSearchNode();
const scrapeNode = new StatefulScrapeURLNode();
const summarizeNode = new StatefulSummarizeNode();

searchNode.postAsync = async (shared, prepRes, execRes) => {
  shared.searchResult = execRes[0]; // Take the first result
  return 'default';
};
scrapeNode.prepAsync = async (shared) => {
  if (!shared.searchResult || !shared.searchResult.link) {
    throw new Error("No search result link found to scrape.");
  }
  scrapeNode.setParams({ url: shared.searchResult.link });
};
summarizeNode.prepAsync = async (shared) => {
  if (!shared.webScrapedContent) {
    throw new Error("No content scraped to summarize.");
  }
  summarizeNode.setParams({ text: shared.webScrapedContent });
};

searchNode.next(scrapeNode);
scrapeNode.next(summarizeNode);
webResearchAndSummarizeFlow.start(searchNode);

// Flow 2: File Processing (Word Count)
// Takes 'inputFilePath' and 'outputFilePath', reads content, counts words, writes count.
const fileProcessingFlow = new AsyncFlow();
const readFileNode = new StatefulReadFileNode();
const wordCountTransformNode = new StatefulTransformNode();
const writeFileNode = new StatefulWriteFileNode();

readFileNode.postAsync = async (shared, prepRes, execRes) => {
  shared.fileContent = execRes;
  return 'default';
};
wordCountTransformNode.prepAsync = async (shared) => {
  if (!shared.fileContent) {
    throw new Error("No file content to process.");
  }
  wordCountTransformNode.setParams({
    input: shared.fileContent,
    transformFunction: '(data) => data.split(/\s+/).filter(word => word.length > 0).length'
  });
};
wordCountTransformNode.postAsync = async (shared, prepRes, execRes) => {
  shared.wordCount = execRes;
  return 'default';
};
writeFileNode.prepAsync = async (shared) => {
  if (shared.wordCount === undefined) {
    throw new Error("No word count to write.");
  }
  writeFileNode.setParams({
    filePath: shared.params.outputFilePath, // Get output path from initial flow params
    content: `Word count: ${shared.wordCount}`
  });
};

readFileNode.next(wordCountTransformNode);
wordCountTransformNode.next(writeFileNode);
fileProcessingFlow.start(readFileNode);

// Flow 3: Data Analysis with Code Interpreter
// Takes 'data' (JSON string) and 'script' (Python code) and executes analysis.
const dataAnalysisFlow = new AsyncFlow();
const codeInterpreterNode = new StatefulCodeInterpreterNode();

codeInterpreterNode.prepAsync = async (shared) => {
  if (!shared.params.data || !shared.params.script) {
    throw new Error("Data and Python script are required for data analysis flow.");
  }
  // Write data to a temp file for Python script
  const tempDir = os.tmpdir();
  const dataFileName = `data_${Date.now()}.json`;
  const dataFilePath = path.join(tempDir, dataFileName);
  await fs.writeFile(dataFilePath, shared.params.data, 'utf-8');

  codeInterpreterNode.setParams({
    code: shared.params.script,
    args: [dataFilePath], // Pass data file path as argument to script
    requireConfirmation: false, // Assume pre-vetted flows don't need confirmation
    interpreterPath: process.env.QFLOW_PYTHON_INTERPRETER || 'python'
  });
};

dataAnalysisFlow.start(codeInterpreterNode);

// Flow 4: Memory Storage Flow
// Takes 'content' and 'id' and stores it using MemoryNode
const memoryStorageFlow = new AsyncFlow();
const memoryNode = new StatefulMemoryNode();
memoryNode.prepAsync = async (shared) => {
  if (!shared.params.content) {
    throw new Error("Content is required for memory storage flow.");
  }
  memoryNode.setParams({
    action: 'store',
    content: shared.params.content,
    id: shared.params.id || `agent_mem_${Date.now()}`
  });
};
memoryStorageFlow.start(memoryNode);

// Flow 5: Semantic Memory Storage Flow
// Takes 'content', 'id', 'metadata' and stores it using SemanticMemoryNode
const semanticMemoryStorageFlow = new AsyncFlow();
const semanticMemoryNode = new StatefulSemanticMemoryNode();
semanticMemoryNode.prepAsync = async (shared) => {
  if (!shared.params.content) {
    throw new Error("Content is required for semantic memory storage flow.");
  }
  semanticMemoryNode.setParams({
    action: 'store',
    content: shared.params.content,
    id: shared.params.id || `agent_sem_mem_${Date.now()}`,
    metadata: shared.params.metadata || {}
  });
};
semanticMemoryStorageFlow.start(semanticMemoryNode);

// --- Flow Registry ---
const flowRegistry = {
  web_research_and_summarize: webResearchAndSummarizeFlow,
  file_processing: fileProcessingFlow,
  data_analysis: dataAnalysisFlow,
  memory_storage: memoryStorageFlow,
  semantic_memory_storage: semanticMemoryStorageFlow,
};

// --- Agent Setup ---
(async () => {
  if (!HF_TOKEN) {
    console.warn("WARNING: HF_TOKEN is not set. Please set it to run this example.");
    console.warn("You can get a token from https://huggingface.co/settings/tokens");
    return;
  }

  console.log('--- Running Flow Registry Agent Example ---');

  // 1. Node to get the goal from the user
  const getGoalNode = new UserInputNode();
  getGoalNode.setParams({ prompt: 'Please enter the agent\'s goal: ' });

  // 2. Instantiate the LLM for the agent\'s reasoning
  const agentLLM = new AgentHuggingFaceLLMNode();
  agentLLM.setParams({
    model: HF_AGENT_MODEL,
    hfToken: HF_TOKEN,
    temperature: 0.7,
    max_new_tokens: 4000, // Increased for potentially longer JSON outputs
    baseUrl: 'https://router.huggingface.co/v1', // Use OpenAI-compatible router
  });

  // 3. Instantiate the tools the agent can use
  const duckduckgoSearch = new StatefulDuckDuckGoSearchNode();
  const shellCommand = new ShellCommandNode();
  const readFile = new StatefulReadFileNode();
  const writeFile = new StatefulWriteFileNode();
  const httpRequest = new StatefulHttpRequestNode();
  const webScraper = new StatefulScrapeURLNode();
  const userInput = new UserInputNode();
  const semanticMemoryNode = new StatefulSemanticMemoryNode();
  const transformNode = new StatefulTransformNode();
  const codeInterpreter = new StatefulCodeInterpreterNode();
  const subFlow = new SubFlowNode();
  const iterator = new IteratorNode();
  const memoryNode = new StatefulMemoryNode();
  const summarizeNode = new StatefulSummarizeNode();

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
    code_interpreter: codeInterpreter,
    sub_flow: subFlow,
    iterator: iterator,
    memory_node: memoryNode,
    summarize_node: summarizeNode,
    // Add other tools as needed
  };

  // 4. Instantiate the AgentNode with the flow registry
  const agent = new AgentNode(agentLLM, availableTools, null, flowRegistry);
  agent.prepAsync = async (shared) => {
    agent.setParams({ goal: shared.userInput });
  };

  // 5. Chain the nodes: Get Goal -> Agent
  getGoalNode.next(agent);

  // 6. Create and run the flow
  const mainFlow = new AsyncFlow(getGoalNode);

  try {
    const finalResult = await mainFlow.runAsync({});
    console.log('\n--- Flow Registry Agent Example Finished ---');
    console.log('Final Agent Output:', finalResult);
  } catch (error) {
    console.error('\n--- Flow Registry Agent Example Failed ---', error);
  }
})();
