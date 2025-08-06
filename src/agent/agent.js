import { AsyncNode, AsyncFlow, Flow } from '../qflow.js';
import { getToolDefinitions } from './tools.js';

export class AgentNode extends AsyncNode {
  constructor(llmNode, availableTools) {
    super();
    if (!llmNode) {
      throw new Error("AgentNode requires an LLMNode instance for reasoning.");
    }
    this.llmNode = llmNode;
    this.availableTools = availableTools; // Map of tool_name -> qflow_node_instance
    this.conversationHistory = [];
    this.maxSteps = 10; // Limit to prevent infinite loops
  }

  async execAsync() {
    const { goal } = this.params;
    if (!goal) {
      throw new Error("AgentNode requires a 'goal' parameter.");
    }

    this.conversationHistory = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: `Goal: ${goal}` }
    ];

    let step = 0;
    let finalOutput = null;

    while (step < this.maxSteps) {
      step++;
      console.log(`\n--- Agent Step ${step} ---`);

      // 1. Reason: Get LLM's next action
      let llmResponse;
      try {
        llmResponse = await this.getLLMAction();
        console.log(`LLM Raw Response: ${llmResponse}`);
      } catch (e) {
        console.error("Error getting LLM action:", e.message);
        this.conversationHistory.push({ role: "user", content: `Error: Failed to get LLM response: ${e.message}` });
        continue;
      }

      let thought, toolCall;
      try {
        const parsedResponse = this.parseLLMResponse(llmResponse);
        thought = parsedResponse.thought;
        toolCall = parsedResponse.tool;
      } catch (e) {
        console.error("Error parsing LLM response:", e.message);
        this.conversationHistory.push({ role: "user", content: `Error: Your response was not valid JSON or did not follow the expected format. Please respond with a 'thought' and 'tool' object. Error: ${e.message}. Your last response was: ${llmResponse}` });
        continue; // Ask LLM to try again
      }

      this.conversationHistory.push({ role: "assistant", content: JSON.stringify({ thought, tool: toolCall }) });

      if (toolCall.tool === "finish") {
        finalOutput = toolCall.parameters.output;
        console.log(`Agent finished. Output: ${finalOutput}`);
        break;
      }

      // 2. Act: Execute the tool
      const toolInstance = this.availableTools[toolCall.tool];
      if (!toolInstance) {
        const errorMessage = `Error: Tool '${toolCall.tool}' not found. Available tools: ${Object.keys(this.availableTools).join(', ')}.`;
        console.error(errorMessage);
        this.conversationHistory.push({ role: "user", content: errorMessage });
        continue; // Ask LLM to try again
      }

      let toolOutput;
      try {
        toolInstance.setParams(toolCall.parameters);
        // Run the tool as a sub-flow to ensure its postAsync is called
        // Check if the toolInstance is an AsyncNode to determine which Flow type to use
        const ToolFlowClass = toolInstance instanceof AsyncNode ? AsyncFlow : Flow;
        const toolFlow = new ToolFlowClass(toolInstance);
        
        // If the tool is an AsyncNode, call runAsync; otherwise, call run
        if (toolInstance instanceof AsyncNode) {
          toolOutput = await toolFlow.runAsync({});
        } else {
          toolOutput = toolFlow.run({});
        }
        console.log(`Tool '${toolCall.tool}' executed successfully.`);
      } catch (e) {
        toolOutput = `Error executing tool '${toolCall.tool}': ${e.message}`;
        console.error(toolOutput);
      }

      // 3. Observe: Add tool output to history
      this.conversationHistory.push({ role: "user", content: `Observation: ${JSON.stringify(toolOutput)}` });
    }

    if (step >= this.maxSteps && finalOutput === null) {
      console.warn("Agent reached max steps without finishing.");
      finalOutput = "Agent reached max steps without finishing. Last observation: " + JSON.stringify(this.conversationHistory[this.conversationHistory.length - 1]);
    }

    return finalOutput;
  }

  getSystemPrompt() {
    const toolDefinitions = getToolDefinitions();
    const toolDescriptions = toolDefinitions.map(tool => {
      const params = JSON.stringify(tool.parameters);
      return `### Tool: ${tool.name}\nDescription: ${tool.description}\nParameters: ${params}`; 
    }).join('\n\n');

    return `You are an autonomous agent designed to achieve a goal by selecting and using tools. Your responses must be in a specific JSON format.\n\nAvailable Tools:\n${toolDescriptions}\n\nYour response must be a single JSON object with two keys: 'thought' and 'tool'.\n'thought': A string explaining your reasoning process and plan.\n'tool': An object with two keys: 'tool' (the name of the tool to call) and 'parameters' (an object containing the parameters for that tool).\n\nExample response:\n{\n  "thought": "I need to find information about X, so I will use the duckduckgo_search tool.",\n  "tool": {\n    "tool": "duckduckgo_search",\n    "parameters": {\n      "query": "X information"
    }\n  }\n}\n\nWhen you have achieved the goal or cannot proceed, use the 'finish' tool.\nExample finish response:\n{\n  "thought": "I have successfully achieved the goal.",\n  "tool": {\n    "tool": "finish",\n    "parameters": {\n      "output": "The final result of the goal."
    }\n}\n\nBegin!`;
  }

  async getLLMAction() {
    // The LLM expects a stringified array of messages
    this.llmNode.setParams({ prompt: JSON.stringify(this.conversationHistory) });
    const llmResult = await this.llmNode.runAsync({});
    return llmResult;
  }

  parseLLMResponse(llmResponse) {
    // Remove markdown code block wrapper if present
    const cleanedResponse = llmResponse.replace(/^```json\n|\n```$/g, '').trim();
    try {
      const parsed = JSON.parse(cleanedResponse);
      if (parsed.thought && parsed.tool && parsed.tool.tool && parsed.tool.parameters !== undefined) {
        return parsed;
      }
      throw new Error("Missing required keys in LLM response (thought, tool.tool, tool.parameters).");
    } catch (e) {
      throw new Error(`Invalid JSON or unexpected format: ${e.message}. Cleaned Response: ${cleanedResponse}`);
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.agentOutput = execRes;
    return 'default';
  }
}