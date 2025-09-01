
import { AsyncFlow } from '../src/qflow.js';
import { AgentNode, UserInputNode } from '../src/nodes/index.js';
import { AgentDeepSeekLLMNode } from '../src/nodes/agent_llm.js';
import { DatabaseNode } from '../src/nodes/database.js';

// Ensure your DeepSeek API Key is set as an environment variable
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the Interactive Agent example.");
    return;
  }

  console.log('--- Running Interactive Agent with Database Test Workflow ---');

  // 1. Node to get the goal from the user
  const getGoalNode = new UserInputNode();
  getGoalNode.setParams({ prompt: 'Please enter the agent\'s goal: ' });

  // 2. Instantiate the LLM for the agent\'s reasoning
  const agentLLM = new AgentDeepSeekLLMNode();
  agentLLM.setParams({ apiKey: DEEPSEEK_API_KEY });

  // 3. Instantiate the tools the agent can use
  const database = new DatabaseNode();

  // Map tool names to their instances
  const availableTools = {
    database: database,
  };

  // 4. Instantiate the AgentNode
  const agent = new AgentNode(agentLLM, availableTools);
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
    console.log('\n--- Interactive Agent with Database Test Workflow Finished ---');
    console.log('Final Agent Output:', finalResult);
  } catch (error) {
    console.error('\n--- Interactive Agent with Database Test Workflow Failed ---', error);
  }
})();
