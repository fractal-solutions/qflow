import { AsyncFlow } from '../src/qflow.js';
import {
  AgentDeepSeekLLMNode,
  DuckDuckGoSearchNode,
  ShellCommandNode,
  ReadFileNode,
  WriteFileNode,
  HttpRequestNode,
  ScrapeURLNode,
  UserInputNode,
  AgentNode,
  SummarizeNode,
  CodeInterpreterNode
} from '../src/nodes';

// You have the option of AgentOpenAILLMNode that can be used instead of Deepseek
// Ensure your DeepSeek API Key is set as an environment variable
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the Interactive Agent example.");
    return;
  }

  console.log('--- Running Interactive Agent Test Workflow ---');

  // 1. Node to get the goal from the user
  const getGoalNode = new UserInputNode();
  getGoalNode.setParams({ prompt: 'Please enter the agent\'s goal: ' });

  // 2. Instantiate the LLM for the agent\'s reasoning
  const agentLLM = new AgentDeepSeekLLMNode();
  agentLLM.setParams({ apiKey: DEEPSEEK_API_KEY });

  // 2.1 Instantiate an LLM for summarization (can be the same as agentLLM or different)
  const summarizeLLM = new SummarizeNode();
  summarizeLLM.setParams({ apiKey: DEEPSEEK_API_KEY });

  // 3. Instantiate the tools the agent can use
  const duckduckgoSearch = new DuckDuckGoSearchNode();
  const shellCommand = new ShellCommandNode();
  const readFile = new ReadFileNode();
  const writeFile = new WriteFileNode();
  const httpRequest = new HttpRequestNode();
  const webScraper = new ScrapeURLNode();
  const userInput = new UserInputNode(); // Agent can also ask for user input
  const codeInterpreter = new CodeInterpreterNode(); // Agent can execute code

  // Map tool names to their instances
  const availableTools = {
    duckduckgo_search: duckduckgoSearch,
    shell_command: shellCommand,
    read_file: readFile,
    write_file: writeFile,
    http_request: httpRequest,
    web_scraper: webScraper,
    user_input: userInput,
    code_interpreter: codeInterpreter,
    // Add other tools as needed
  };

  // 4. Instantiate the AgentNode, passing the summarizeLLM
  const agent = new AgentNode(agentLLM, availableTools, summarizeLLM);
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
