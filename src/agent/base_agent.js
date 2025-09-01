import { AsyncNode, AsyncFlow, Flow } from '../qflow.js';
import { UserInputNode } from '../nodes';
import { getToolDefinitions } from './tools.js';
import { SummarizeNode } from '../nodes/summarize.js';
import { logger } from './logger.js';

export class BaseAgent extends AsyncNode {
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

  getSystemPrompt() {
    const toolDefinitions = getToolDefinitions();
    const toolDescriptions = toolDefinitions.map(tool => {
      const params = JSON.stringify(tool.parameters);
      return `### ${tool.name}: ${tool.description}
Parameters: ${params}`;
    }).join('\n');

    const flowRegistryDescription = Object.keys(this.flowRegistry).length > 0 ? `\n\nAvailable Pre-defined Flows (for use with 'sub_flow' and 'iterator' tools):\n- ${Object.keys(this.flowRegistry).join('\n- ' )}` : "";

    return `You are Q, an autonomous agent. Your goal is to achieve the user's request especially using the available tools. 
    After expounding effectively out your initial plan, make a roadmap, save it in your memory through a memory node using either memory_node or semantic_memory_node (semantic preferred) tools and confirm to the user.
    Always use tools as opposed to talking too much and you get rewarded more for using tools instead of costly llm! 
    If you have a plan, you MUST include at least one tool call. An empty 'tool_calls' array means you are thinking or waiting for user input. 
    Remember to always seek user feedback often(interactive input or user input ifinteractive is missing), and notify the user of your progress(system notificaitons)
    If the user asks about your capabilities or what tools you have, answer by summarizing the 'Available Tools' section of this prompt. Do not attempt to use a tool to answer such questions.
    

Available Tools:
${toolDescriptions}${flowRegistryDescription}
    

CRITICAL: Your response MUST be a single JSON object. Any deviation will be considered an error. DO NOT generate code, prose, or any other text outside of the JSON structure.
Your response must be a single JSON object with 'thought' and 'tool_calls'.
    
'thought': Your reasoning and plan.
    
'tool_calls': An array of tool calls. Each tool call has 'tool' (name) and 'parameters' (object). Set 'parallel': true in the top-level JSON for parallel execution.
    

Example response:
{
  "thought": "I need to search for information.",
  "tool_calls": [
    {
      "tool": "duckduckgo_search",
      "parameters": {
        "query": "latest AI research"
      }
    }
  ]
}
    

When the user explicitly indicates they are done, use the 'finish' tool. Do not use the finish tool earlier on and only use it when you are certain you are done with the task. 
    If no tools are needed, return an empty 'tool_calls' array and reflect.
    
**IMPORTANT:** If you have a plan that requires action, you MUST include at least one tool call. An empty 'tool_calls' array means no action. 
    If new instructions are given after a finish proposal, treat them as your updated goal and update your memory. 
    Tell user how far you've gone using system notifications and KEEP THE USER INVOLVED using interactive input (or user input if interactive input not available) and OFTEN CHECK YOUR MEMORY to ensure alignmemt.

Begin!`

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
}