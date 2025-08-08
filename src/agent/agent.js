import { AsyncNode, AsyncFlow, Flow } from '../qflow.js';
import { getToolDefinitions } from './tools.js';
import { SummarizeNode } from '../nodes/summarize.js'; // Import SummarizeNode

export class AgentNode extends AsyncNode {
  constructor(llmNode, availableTools, summarizeLLM) {
    super();
    if (!llmNode) {
      throw new Error("AgentNode requires an LLMNode instance for reasoning.");
    }
    this.llmNode = llmNode;
    this.availableTools = availableTools; // Map of tool_name -> qflow_node_instance
    this.summarizeLLM = summarizeLLM; // LLM for summarization
    this.conversationHistory = [];
    this.maxSteps = 20; // Limit to prevent infinite loops
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
        //console.log(`LLM Raw Response (before parsing):`, llmResponse); // Added logging
        //console.log(`LLM Raw Response Type (before parsing):`, typeof llmResponse); // Added logging
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
        const ToolFlowClass = toolInstance instanceof AsyncNode ? AsyncFlow : Flow;
        const toolFlow = new ToolFlowClass(toolInstance);
        
        if (toolInstance instanceof AsyncNode) {
          toolOutput = await toolFlow.runAsync({});
        } else {
          toolOutput = toolFlow.run({});
        }
        console.log(`Tool '${toolCall.tool}' executed successfully.`);

        // Summarize large outputs before adding to history
        if (this.summarizeLLM && typeof toolOutput === 'string' && toolOutput.length > 1000) { // Summarize if output is string and > 1000 chars
          console.log(`Summarizing large tool output (${toolOutput.length} chars)...`);
          const summarizeNode = new SummarizeNode();
          summarizeNode.setParams({ text: toolOutput, llmNode: this.summarizeLLM });
          const summarizeFlow = new AsyncFlow(summarizeNode);
          toolOutput = await summarizeFlow.runAsync({});
          console.log(`Summarized to ${toolOutput.length} chars.`);
        }

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

    return `You are an autonomous agent designed to achieve a goal by selecting and using tools. Your responses must be in a specific JSON format.\n\nAvailable Tools:\n${toolDescriptions}\n\nYour response must be a single JSON object with two keys: 'thought' and 'tool'.\n'thought': A string explaining your reasoning process and plan.\n'tool': An object with two keys: 'tool' (the name of the tool to call) and 'parameters' (an object containing the parameters for that tool).\n\nExample response:\n{\n  "thought": "I need to find information about X, so I will use the duckduckgo_search tool.",\n  "tool": {\n    "tool": "duckduckgo_search",\n    "parameters": {\n      "query": "X information"\n    }\n  }\n}\n\nWhen you have achieved the goal or cannot proceed, use the 'finish' tool.\nExample finish response:\n{\n  "thought": "I have successfully achieved the goal.",\n  "tool": {\n    "tool": "finish",\n    "parameters": {\n      "output": "The final result of the goal."\n    }\n}\n\nBegin!`;
  }

  async getLLMAction() {
    // The LLM expects a stringified array of messages
    this.llmNode.setParams({ prompt: JSON.stringify(this.conversationHistory) });
    const llmResult = await this.llmNode.runAsync({});
    return llmResult;
  }

  parseLLMResponse(llmResponse) {
    let parsed;
    let thought = '';
    let toolCall = {};

    // Check if llmResponse is already a parsed object (e.g., from AgentHuggingFaceLLMNode's raw data)
    // This is a temporary measure for debugging, ideally llmResponse should always be a string
    let rawData = llmResponse;
    if (typeof llmResponse === 'string') {
      try {
        rawData = JSON.parse(llmResponse);
      } catch (e) {
        // If it's not JSON, assume it's a direct text response from LLM
        // This path should ideally not be taken if LLM is tool-calling capable
        return { thought: "Direct LLM response", tool: { tool: "finish", parameters: { output: llmResponse } } };
      }
    }

    // Prioritize tool_calls if present (OpenAI function calling format)
    if (rawData.choices && rawData.choices.length > 0 && rawData.choices[0].message) {
      const message = rawData.choices[0].message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        const firstToolCall = message.tool_calls[0];
        toolCall = {
          tool: firstToolCall.function.name,
          parameters: JSON.parse(firstToolCall.function.arguments)
        };
        thought = message.reasoning_content || `Calling tool: ${toolCall.tool}`; // Use reasoning_content if available
        return { thought, tool: toolCall };
      } else if (typeof message.content === 'string' && message.content.trim().startsWith('{')) {
        // If no tool_calls, but content is JSON (for thought/tool/finish)
        try {
          parsed = JSON.parse(message.content);
          if (parsed.thought && parsed.tool && parsed.tool.tool && parsed.tool.parameters !== undefined) {
            return parsed;
          }
          throw new Error("Missing required keys in LLM response (thought, tool.tool, tool.parameters).");
        } catch (e) {
          throw new Error(`Invalid JSON or unexpected format in message.content: ${e.message}. Content: ${message.content}`);
        }
      } else if (typeof message.content === 'string') {
        // If content is plain text, assume it's a direct answer
        return { thought: "Direct LLM response", tool: { tool: "finish", parameters: { output: message.content } } };
      }
    }

    throw new Error(`Invalid LLM response structure. Raw Data: ${JSON.stringify(rawData)}`);
  }

  async postAsync(shared, prepRes, execRes) {
    shared.agentOutput = execRes;
    return 'default';
  }
}