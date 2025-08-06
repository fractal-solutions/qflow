import { AsyncFlow } from '../src/qflow.js';
import {
  AgentOllamaLLMNode,
  DuckDuckGoSearchNode,
  ShellCommandNode,
  ReadFileNode,
  WriteFileNode,
  HttpRequestNode,
  ScrapeURLNode,
  UserInputNode,
  AgentNode
} from '../src/nodes';

// Configuration for Ollama
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:1b'; 

(async () => {
  console.log('--- Running AgentNode with AgentOllamaLLMNode Test Workflow ---');

  // 1. Node to get the goal from the user
  const getGoalNode = new UserInputNode();
  getGoalNode.setParams({ prompt: 'Please enter the agent\'s goal (e.g., \'What is the capital of France?\' or \'List files in current directory\'): ' });

  // 2. Instantiate the LLM for the agent\'s reasoning
  const agentOllamaLLM = new AgentOllamaLLMNode();
  agentOllamaLLM.setParams({
    model: OLLAMA_MODEL,
    baseUrl: OLLAMA_BASE_URL
  });

  // 3. Instantiate the tools the agent can use
  const duckduckgoSearch = new DuckDuckGoSearchNode();
  const shellCommand = new ShellCommandNode();
  const readFile = new ReadFileNode();
  const writeFile = new WriteFileNode();
  const httpRequest = new HttpRequestNode();
  const webScraper = new ScrapeURLNode();
  const userInput = new UserInputNode(); // Agent can also ask for user input

  // Map tool names to their instances
  const availableTools = {
    duckduckgo_search: duckduckgoSearch,
    shell_command: shellCommand,
    read_file: readFile,
    write_file: writeFile,
    http_request: httpRequest,
    web_scraper: webScraper,
    user_input: userInput,
    // The agent will use 'ollama_llm_reasoning' internally, which maps to agentOllamaLLM
  };

  // 4. Instantiate the AgentNode
  const agent = new AgentNode(agentOllamaLLM, availableTools);
  // The goal will be set dynamically from the UserInputNode\'s output
  agent.prepAsync = async (shared) => {
    agent.setParams({ goal: shared.userInput });
  };

  // 5. Chain the nodes: Get Goal -> Agent
  getGoalNode.next(agent);

  // 6. Create and run the flow
  const interactiveAgentFlow = new AsyncFlow(getGoalNode);

  try {
    const finalResult = await interactiveAgentFlow.runAsync({});
    console.log('\n--- Interactive Agent Test Workflow Finished ---');
    console.log('Final Agent Output:', finalResult);
  } catch (error) {
    console.error('\n--- Interactive Agent Test Workflow Failed ---', error);
  }
})();