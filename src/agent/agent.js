import { AsyncNode, AsyncFlow, Flow } from '../qflow.js';
import { getToolDefinitions } from './tools.js';
import { SummarizeNode } from '../nodes/summarize.js';
import { logger } from './logger.js';

export class AgentNode extends AsyncNode {
  constructor(llmNode, availableTools, summarizeLLM) {
    super();
    if (!llmNode) {
      throw new Error("AgentNode requires an LLMNode instance for reasoning.");
    }
    this.llmNode = llmNode;
    this.availableTools = availableTools;
    this.summarizeLLM = summarizeLLM;
    this.conversationHistory = [];
    this.maxSteps = 20;
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
      logger.info(`Agent Step ${step}`);

      let llmResponse;
      try {
        llmResponse = await this.getLLMAction();
      } catch (e) {
        logger.error(`Error getting LLM action: ${e.message}`);
        this.conversationHistory.push({ role: "user", content: `Error: Failed to get LLM response: ${e.message}` });
        continue;
      }

      let thought, toolCall;
      try {
        const parsedResponse = this.parseLLMResponse(llmResponse);
        thought = parsedResponse.thought;
        toolCall = parsedResponse.tool;
        logger.thought(thought);
      } catch (e) {
        logger.error(`Error parsing LLM response: ${e.message}`);
        this.conversationHistory.push({ role: "user", content: `Error: Your response was not valid JSON or did not follow the expected format. Please respond with a 'thought' and 'tool' object. Error: ${e.message}. Your last response was: ${llmResponse}` });
        continue;
      }

      this.conversationHistory.push({ role: "assistant", content: JSON.stringify({ thought, tool: toolCall }) });

      if (toolCall.tool === "finish") {
        finalOutput = toolCall.parameters.output;
        logger.final(finalOutput);
        break;
      }

      const toolInstance = this.availableTools[toolCall.tool];
      if (!toolInstance) {
        const errorMessage = `Tool '${toolCall.tool}' not found. Available tools: ${Object.keys(this.availableTools).join(', ')}.`;
        logger.error(errorMessage);
        this.conversationHistory.push({ role: "user", content: errorMessage });
        continue;
      }

      let toolOutput;
      try {
        logger.toolCall(toolCall.tool, toolCall.parameters);
        toolInstance.setParams(toolCall.parameters);
        const ToolFlowClass = toolInstance instanceof AsyncNode ? AsyncFlow : Flow;
        const toolFlow = new ToolFlowClass(toolInstance);
        
        if (toolInstance instanceof AsyncNode) {
          toolOutput = await toolFlow.runAsync({});
        } else {
          toolOutput = toolFlow.run({});
        }
        logger.toolResult(toolCall.tool, toolOutput);

        if (this.summarizeLLM && typeof toolOutput === 'string' && toolOutput.length > 1000) {
          logger.info(`Summarizing large tool output (${toolOutput.length} chars)...`);
          const summarizeNode = new SummarizeNode();
          summarizeNode.setParams({ text: toolOutput, llmNode: this.summarizeLLM });
          const summarizeFlow = new AsyncFlow(summarizeNode);
          toolOutput = await summarizeFlow.runAsync({});
          logger.info(`Summarized to ${toolOutput.length} chars.`);
        }

      } catch (e) {
        toolOutput = `Error executing tool '${toolCall.tool}': ${e.message}`;
        logger.error(toolOutput);
      }

      this.conversationHistory.push({ role: "user", content: `Observation: ${JSON.stringify(toolOutput)}` });
    }

    if (step >= this.maxSteps && finalOutput === null) {
      const message = "Agent reached max steps without finishing. Last observation: " + JSON.stringify(this.conversationHistory[this.conversationHistory.length - 1]);
      logger.error(message);
      finalOutput = message;
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
    this.llmNode.setParams({ prompt: JSON.stringify(this.conversationHistory) });
    const llmResult = await this.llmNode.runAsync({});
    return llmResult;
  }

  parseLLMResponse(llmResponse) {
    let parsed;
    let thought = '';
    let toolCall = {};

    let rawData = llmResponse;
    if (typeof llmResponse === 'string') {
      try {
        rawData = JSON.parse(llmResponse);
      } catch (e) {
        return { thought: "Direct LLM response", tool: { tool: "finish", parameters: { output: llmResponse } } };
      }
    }

    if (rawData.choices && rawData.choices.length > 0 && rawData.choices[0].message) {
      const message = rawData.choices[0].message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        const firstToolCall = message.tool_calls[0];
        toolCall = {
          tool: firstToolCall.function.name,
          parameters: JSON.parse(firstToolCall.function.arguments)
        };
        thought = message.reasoning_content || `Calling tool: ${toolCall.tool}`;
        return { thought, tool: toolCall };
      } else if (typeof message.content === 'string' && message.content.trim().startsWith('{')) {
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