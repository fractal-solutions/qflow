import { AsyncFlow } from '../src/qflow.js';
import {
  DuckDuckGoSearchNode,
  ShellCommandNode,
  ReadFileNode,
  WriteFileNode,
  HttpRequestNode,
  ScrapeURLNode,
  UserInputNode,
  AgentNode,
  AgentDeepSeekLLMNode // Import the new specialized LLM node
} from '../src/nodes';

// Ensure your DeepSeek API Key is set as an environment variable
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the AgentNode example.");
    return;
  }

  console.log('--- Running AgentNode Test Workflow ---');

  // 1. Instantiate the LLM for the agent's reasoning
  const agentLLM = new AgentDeepSeekLLMNode();
  agentLLM.setParams({ apiKey: DEEPSEEK_API_KEY });

  // 2. Instantiate the tools the agent can use
  const duckduckgoSearch = new DuckDuckGoSearchNode();
  const shellCommand = new ShellCommandNode();
  const readFile = new ReadFileNode();
  const writeFile = new WriteFileNode();
  const httpRequest = new HttpRequestNode();
  const webScraper = new ScrapeURLNode();
  const userInput = new UserInputNode();

  // Map tool names to their instances
  const availableTools = {
    duckduckgo_search: duckduckgoSearch,
    shell_command: shellCommand,
    read_file: readFile,
    write_file: writeFile,
    http_request: httpRequest,
    web_scraper: webScraper,
    user_input: userInput,
    // Add other tools as needed
  };

  // 3. Instantiate the AgentNode
  const agent = new AgentNode(agentLLM, availableTools);
  agent.setParams({
    goal: "Find out what the current working directory is, then create a file named 'agent_output.txt' in it with the content 'Hello from the agent!'. Finally, confirm the file exists by listing the directory contents."
  });

  // 4. Create and run the flow with the AgentNode as the start
  const agentFlow = new AsyncFlow(agent);

  try {
    const finalResult = await agentFlow.runAsync({});
    console.log('\n--- AgentNode Test Workflow Finished ---');
    console.log('Final Agent Output:', finalResult);
  } catch (error) {
    console.error('\n--- AgentNode Test Workflow Failed ---', error);
  }
})();