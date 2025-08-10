import { AsyncNode, AsyncFlow, Flow } from '../qflow.js';
import { UserInputNode } from '../nodes';
import { getToolDefinitions } from './tools.js';
import { SummarizeNode } from '../nodes/summarize.js';
import { logger } from './logger.js';

export class AgentNode extends AsyncNode {
  constructor(llmNode, availableTools, summarizeLLM, flowRegistry = {}, requireFinishConfirmation = true, maxConversationHistoryTokens = 100000) {
    super();
    if (!llmNode) {
      throw new Error("AgentNode requires an LLMNode instance for reasoning.");
    }
    this.llmNode = llmNode;
    this.availableTools = availableTools;
    this.summarizeLLM = summarizeLLM;
    this.flowRegistry = flowRegistry;
    this.conversationHistory = [];
    this.maxSteps = 70;
    this.requireFinishConfirmation = requireFinishConfirmation;
    this.maxConversationHistoryTokens = maxConversationHistoryTokens;
  }

  async execAsync() {
    const { goal } = this.params;
    if (!goal) {
      throw new Error("AgentNode requires a 'goal' parameter.");
    }

    this.conversationHistory = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: `Goal: ${goal}` },
      { role: "system", content: "Begin by outlining a plan to achieve the goal. Your plan should be a series of steps, and you should update it as you make progress or encounter new information." }
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

      let thought, toolCalls, parallel;
      try {
        const parsedResponse = this.parseLLMResponse(llmResponse);
        thought = parsedResponse.thought;
        toolCalls = parsedResponse.toolCalls;
        parallel = parsedResponse.parallel;
        logger.thought(thought);
      } catch (e) {
        logger.error(`Error parsing LLM response: ${e.message}`);
        this.conversationHistory.push({ role: "user", content: `Error: Your response was not valid JSON or did not follow the expected format. Please respond with a 'thought' and 'tool_calls' array. Error: ${e.message}. Your last response was: ${llmResponse}` });
        continue;
      }

      // Validate tool parameters for all tool calls
      const validationErrors = toolCalls.map(tc => this.validateToolParameters(tc)).filter(Boolean);
      if (validationErrors.length > 0) {
        const errorMessage = `Tool parameter validation failed for one or more tools: ${validationErrors.join('; ')}. Please correct the parameters.`;
        logger.error(errorMessage);
        this.conversationHistory.push({ role: "user", content: `Error: ${errorMessage}` });
        continue;
      }

      this.conversationHistory.push({ role: "assistant", content: JSON.stringify({ thought, tool_calls: toolCalls, parallel }) });

      // If no tool calls, continue the loop to allow the LLM to re-evaluate
      if (toolCalls.length === 0) {
        this.conversationHistory.push({ role: "system", content: "No tools were called. Reflect on your plan and provide the next step." });
        continue;
      }

      // Handle finish tool
      const finishToolCall = toolCalls.find(tc => tc.tool === "finish");
      if (finishToolCall) {
        finalOutput = finishToolCall.parameters.output;

        if (this.requireFinishConfirmation) {
          const confirmNode = new UserInputNode();
          confirmNode.setParams({
            prompt: `Agent proposes to finish with output: "${finalOutput}". Do you approve? (yes/no): `
          });
          const confirmFlow = new AsyncFlow(confirmNode);
          const confirmation = await confirmFlow.runAsync({});

          if (confirmation.toLowerCase() !== 'yes') {
            logger.info("Agent finish denied by user. User input will be the next prompt.");
            // Treat the user's new input as a new instruction/goal
            this.conversationHistory.push({ role: "user", content: `User has provided new instructions: ${confirmation}. Please adjust your plan and continue working.` });
            // Optionally, you might want to clear some of the previous conversation history
            // to give more weight to the new instruction, but be careful not to lose context.
            // For now, we'll just add the new instruction.
            continue; // Continue the loop
          }
        }

        logger.final(finalOutput);
        break;
      }

      try {
        const executeTool = async (toolCall) => {
          const toolInstance = this.availableTools[toolCall.tool];
          if (!toolInstance) {
            return `Error: Tool '${toolCall.tool}' not found. Available tools: ${Object.keys(this.availableTools).join(', ')}.`;
          }

          let toolOutput;
          try {
            logger.toolCall(toolCall.tool, toolCall.parameters);

            // If the tool is a sub-flow, iterator or scheduler, look up the flow in the registry
            if (toolCall.tool === 'sub_flow' || toolCall.tool === 'iterator' || toolCall.tool === 'scheduler') {
              const flowName = toolCall.parameters.flow;
              if (!this.flowRegistry[flowName]) {
                throw new Error(`Flow '${flowName}' not found in registry.`);
              }
              toolCall.parameters.flow = this.flowRegistry[flowName];
            }

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
            return toolOutput;
          } catch (e) {
            return `Error executing tool '${toolCall.tool}': ${e.message}`;
          }
        };

        let observations = [];
        if (parallel) {
          const results = await Promise.all(toolCalls.map(executeTool));
          observations = results.map((result, index) => ({
            tool: toolCalls[index].tool,
            parameters: toolCalls[index].parameters,
            output: result
          }));
        } else {
          for (const toolCall of toolCalls) {
            const result = await executeTool(toolCall);
            observations.push({
              tool: toolCall.tool,
              parameters: toolCall.parameters,
              output: result
            });
          }
        }

        this.conversationHistory.push({ role: "user", content: `Observation: ${JSON.stringify(observations)}` });
      } catch (e) {
        logger.error(`Error during tool execution: ${e.message}`);
        this.conversationHistory.push({ role: "user", content: `Error: Tool execution failed with message: ${e.message}. You should try a different approach.` });
      }
      this.conversationHistory.push({ role: "system", content: "Reflect on the last observation(s) and update your plan if necessary. What is your next step?" });
    }

    if (step >= this.maxSteps && finalOutput === null) {
      const message = "Agent reached max steps without finishing. Last observation: " + JSON.stringify(this.conversationHistory[this.conversationHistory.length - 1]);
      logger.error(message);
      finalOutput = message;
    }

    return finalOutput;
  }

  validateToolParameters(toolCall) {
    const toolDefinitions = getToolDefinitions();
    const toolSchema = toolDefinitions.find(def => def.name === toolCall.tool);

    if (!toolSchema) {
      return `Tool '${toolCall.tool}' is not a recognized tool.`;
    }

    // If the tool is 'finish', 'sub_flow', or 'iterator', special handling for parameters
    if (toolCall.tool === "finish") {
      if (toolCall.parameters.output === undefined) {
        return "Missing required parameter: 'output' for tool 'finish'.";
      }
      return null;
    } else if (toolCall.tool === "sub_flow" || toolCall.tool === "iterator") {
      if (toolCall.parameters.flow === undefined) {
        return `Missing required parameter: 'flow' for tool '${toolCall.tool}'.`;
      }
      if (!this.flowRegistry[toolCall.parameters.flow]) {
        return `Flow '${toolCall.parameters.flow}' not found in registry for tool '${toolCall.tool}'.`;
      }
      return null;
    }

    const requiredParams = toolSchema.parameters.required || [];
    for (const param of requiredParams) {
      if (toolCall.parameters[param] === undefined) {
        return `Missing required parameter: '${param}' for tool '${toolCall.tool}'.`;
      }
    }
    return null; // No validation errors
  }

  getSystemPrompt() {
    const toolDefinitions = getToolDefinitions();
    const toolDescriptions = toolDefinitions.map(tool => {
      const params = JSON.stringify(tool.parameters);
      return `### ${tool.name}: ${tool.description}
Parameters: ${params}`;
    }).join('\n');

    const flowRegistryDescription = Object.keys(this.flowRegistry).length > 0 ? `\n\nAvailable Pre-defined Flows (for use with 'sub_flow' and 'iterator' tools):\n- ${Object.keys(this.flowRegistry).join('\n- ' )}` : "";

    return `You are an autonomous agent. Your goal is to achieve the user's request using the available tools. Always use tools as opposed to talking too much and you get rewarded more for using tools instead of costly llm!\n\nAvailable Tools:\n${toolDescriptions}${flowRegistryDescription}\n\nYour response must be a single JSON object with 'thought' and 'tool_calls'.\n'thought': Your reasoning and plan.\n'tool_calls': An array of tool calls. Each tool call has 'tool' (name) and 'parameters' (object). Set 'parallel': true in the top-level JSON for parallel execution.\n\nExample response:\n{\n  "thought": "I need to search for information.",\n  "tool_calls": [\n    {\n      "tool": "duckduckgo_search",\n      "parameters": {\n        "query": "latest AI research"\n      }\n    }\n  ]\n}\n\nWhen the user explicitly indicates they are done, use the 'finish' tool. Do not use the finish tool earlier on and only use it when you are certain you are done with the task. If no tools are needed, return an empty 'tool_calls' array and reflect.\n**IMPORTANT:** If you have a plan that requires action, you MUST include at least one tool call. An empty 'tool_calls' array means no action. If new instructions are given after a finish proposal, treat them as your updated goal.\n\nBegin!`

  }

  async getLLMAction() {
    await this.manageConversationHistory();
    this.llmNode.setParams({ prompt: JSON.stringify(this.conversationHistory) });
    const llmResult = await this.llmNode.runAsync({});
    return llmResult;
  }

  async manageConversationHistory() {
    if (!this.summarizeLLM) {
      logger.warn("No summarizeLLM provided to AgentNode. Conversation history will not be managed.");
      return;
    }

    let currentTokenCount = JSON.stringify(this.conversationHistory).length; // Rough token count

    // Keep at least the system prompt and the initial goal
    const minHistoryLength = 2;

    while (currentTokenCount > this.maxConversationHistoryTokens && this.conversationHistory.length > minHistoryLength) {
      logger.info(`Current history size: ${currentTokenCount} tokens. Max allowed: ${this.maxConversationHistoryTokens} tokens. Trimming...`);
      // Summarize the oldest observation entry
      const oldestEntry = this.conversationHistory[minHistoryLength]; // Skip system and initial goal

      if (oldestEntry && oldestEntry.role === "user" && oldestEntry.content.startsWith("Observation:")) {
        const observationContent = oldestEntry.content.substring("Observation:".length).trim();
        logger.info(`Attempting to summarize old observation (${observationContent.length} chars) from role: ${oldestEntry.role}, content: ${oldestEntry.content.substring(0, 50)}...`);

        try {
          const summarizeNode = new SummarizeNode();
          summarizeNode.setParams({ text: observationContent, llmNode: this.summarizeLLM });
          const summarizeFlow = new AsyncFlow(summarizeNode);
          const summarizedContent = await summarizeFlow.runAsync({});

          // Replace the original observation with the summarized version
          this.conversationHistory[minHistoryLength].content = `Summarized Observation: ${summarizedContent}`;
          logger.info(`Observation summarized to ${summarizedContent.length} chars. New entry: ${this.conversationHistory[minHistoryLength].content.substring(0, 50)}...`);
        } catch (e) {
          logger.error(`Failed to summarize observation: ${e.message}. Removing oldest entry.`);
          // If summarization fails, remove the oldest entry to prevent context overflow
          this.conversationHistory.splice(minHistoryLength, 1);
        }
      } else {
        logger.info(`Removing oldest non-summarizable history entry (role: ${oldestEntry.role}, content: ${oldestEntry.content.substring(0, 50)}...).`);
        // If it's not an observation or we can't summarize, just remove the oldest entry
        this.conversationHistory.splice(minHistoryLength, 1);
      }

      // Recalculate token count after modification
      currentTokenCount = JSON.stringify(this.conversationHistory).length;
    }
  }

  parseLLMResponse(llmResponse) {
    if (typeof llmResponse === 'string') {
      let jsonString = llmResponse;

      // Find the first '{' and the last '}' to isolate the JSON object
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      }

      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.thought && Array.isArray(parsed.tool_calls)) {
          return {
            thought: parsed.thought,
            toolCalls: parsed.tool_calls,
            parallel: parsed.parallel || false,
          };
        }
      } catch (e) {
        // Parsing failed, fall through to treat the original string as a thought.
      }

      // Fallback for plain text responses or malformed JSON.
      return { thought: llmResponse, toolCalls: [], parallel: false };
    }

    // This part of the function handles the case where llmResponse is an OBJECT,
    // typically from OpenAI's function calling API.
    const rawData = llmResponse;
    if (rawData.choices && rawData.choices.length > 0 && rawData.choices[0] && rawData.choices[0].message) {
      const message = rawData.choices[0].message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCalls = message.tool_calls.map(tc => ({
          tool: tc.function.name,
          parameters: JSON.parse(tc.function.arguments)
        }));
        const thought = message.reasoning_content || `Calling tool(s): ${toolCalls.map(tc => tc.tool).join(', ')}`;
        return { thought, toolCalls, parallel: false };
      } else if (typeof message.content === 'string' && message.content.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(message.content);
          if (parsed.thought && Array.isArray(parsed.tool_calls)) {
            return {
              thought: parsed.thought,
              toolCalls: parsed.tool_calls,
              parallel: parsed.parallel || false,
            };
          }
        } catch (e) {
          throw new Error(`Invalid JSON or unexpected format in message.content: ${e.message}. Content: ${message.content}`);
        }
      } else if (typeof message.content === 'string') {
        return { thought: message.content, toolCalls: [], parallel: false };
      }
    }

    throw new Error(`Invalid LLM response structure. Raw Data: ${JSON.stringify(rawData)}`);
  }

  async postAsync(shared, prepRes, execRes) {
    shared.agentOutput = execRes;
    return 'default';
  }
}