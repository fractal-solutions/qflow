
# Agents

`qflow` provides a flexible architecture for creating and running autonomous agents. The library includes a `BaseAgent` class with common functionalities and several implemented agent patterns.

## Agent Patterns

`qflow` implements the following agent patterns:

- **RAOR (Reason -> Act -> Observe -> Reflect):** A reasoning-driven loop that’s great for tasks where thinking steps need to be explicit and transparent.
- **OODA (Observe -> Orient -> Decide -> Act):** A rapid decision-making loop optimized for adapting to changing conditions.
- **LPAVRL (Listen -> Plan -> Act -> Visualize -> Reflect -> Learn):** Designed for agents that must communicate with humans and provide understandable outputs.
- **PEMA (Plan -> Execute -> Monitor -> Adjust):** Best for long-running, multi-step goals that need checkpoints.

## `AgentNode`

The `AgentNode` is a generic agent runner that takes an agent instance as a parameter and runs it. This allows you to easily switch between different agent patterns by simply passing a different agent instance to the `AgentNode`.

## Example

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { AgentNode, UserInputNode } from '@fractal-solutions/qflow/nodes';
import { RAORAgent } from '@fractal-solutions/qflow/agent';
import { AgentDeepSeekLLMNode } from '@fractal-solutions/qflow/nodes/agent_llm.js';

// Ensure your DeepSeek API Key is set as an environment variable
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

(async () => {
  if (!DEEPSEEK_API_KEY) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run the Interactive Agent example.");
    return;
  }

  console.log('--- Running Interactive RAOR Agent Test Workflow ---');

  // 1. Node to get the goal from the user
  const getGoalNode = new UserInputNode();
  getGoalNode.setParams({ prompt: 'Please enter the agent\'s goal: ' });

  // 2. Instantiate the LLM for the agent's reasoning
  const agentLLM = new AgentDeepSeekLLMNode();
  agentLLM.setParams({ apiKey: DEEPSEEK_API_KEY });

  // 3. Instantiate the agent
  const agent = new RAORAgent(agentLLM, {});

  // 4. Instantiate the AgentNode
  const agentNode = new AgentNode(agent);

  // 5. Chain the nodes: Get Goal -> Agent
  getGoalNode.next(agentNode);

  // 6. Create and run the flow
  const interactiveAgentFlow = new AsyncFlow(getGoalNode);

  try {
    const finalResult = await interactiveAgentFlow.runAsync({});
    console.log('\n--- Interactive RAOR Agent Test Workflow Finished ---');
    console.log('Final Agent Output:', finalResult);
  } catch (error) {
    console.error('\n--- Interactive RAOR Agent Test Workflow Failed ---', error);
  }
})();
```
```
