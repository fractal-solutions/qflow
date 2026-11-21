import { AsyncNode, AsyncFlow, Flow } from '../qflow.js';
import { UserInputNode } from '../nodes/user.js';
import { SummarizeNode } from '../nodes/summarize.js';
import { getToolDefinitions } from './tools.js';
import { logger } from './logger.js';
import { getStrategy } from './strategies.js';

const FLOW_TOOLS = new Set(['sub_flow', 'iterator', 'scheduler']);

/**
 * The single agent execution engine. Reasoning patterns are supplied as
 * declarative strategies (see ./strategies.js) rather than duplicated loops.
 *
 * Supports both the legacy positional constructor and an options object:
 *   new AgentNode(llmNode, tools, summarizeLLM, flowRegistry, confirm, maxTokens)
 *   new AgentNode({ llmNode, availableTools, strategy: 'raor', ... })
 */
export class AgentEngine extends AsyncNode {
  constructor(optionsOrLlmNode, availableTools, summarizeLLM, flowRegistry = {}, requireFinishConfirmation = true, maxConversationHistoryTokens = 100000) {
    super();

    const options = optionsOrLlmNode && typeof optionsOrLlmNode === 'object' && 'llmNode' in optionsOrLlmNode
      ? optionsOrLlmNode
      : {
          llmNode: optionsOrLlmNode,
          availableTools,
          summarizeLLM,
          flowRegistry,
          requireFinishConfirmation,
          maxConversationHistoryTokens,
        };

    const {
      llmNode,
      availableTools: tools = {},
      summarizeLLM: summarizer,
      flowRegistry: registry = {},
      requireFinishConfirmation: confirm = true,
      maxConversationHistoryTokens: maxTokens = 100000,
      maxSteps = 70,
      strategy,
    } = options;

    if (!llmNode) {
      throw new Error(`${this.constructor.name} requires an LLMNode instance for reasoning.`);
    }

    this.llmNode = llmNode;
    this.availableTools = tools;
    this.summarizeLLM = summarizer;
    this.flowRegistry = registry;
    this.conversationHistory = [];
    this.maxSteps = maxSteps;
    this.requireFinishConfirmation = confirm;
    this.maxConversationHistoryTokens = maxTokens;
    this.strategy = getStrategy(strategy ?? new.target.strategyId ?? 'default');
  }

  getSystemPrompt() {
    const toolDescriptions = getToolDefinitions().map(tool =>
      `### ${tool.name}: ${tool.description}\nParameters: ${JSON.stringify(tool.parameters)}`
    ).join('\n');

    const flowRegistryDescription = Object.keys(this.flowRegistry).length > 0
      ? `\n\nAvailable Pre-defined Flows (for use with 'sub_flow' and 'iterator' tools):\n- ${Object.keys(this.flowRegistry).join('\n- ')}`
      : '';

    return `You are Q, an autonomous agent. Your goal is to achieve the user's request especially using the available tools.
    Always prefer tools over long explanations. If you have a plan, you MUST include at least one tool call.
    If the user asks about your capabilities, summarize the 'Available Tools' section of this prompt instead of calling a tool.

 Reasoning strategy: ${this.strategy.label}

 Available Tools:
${toolDescriptions}${flowRegistryDescription}

 CRITICAL: Your response MUST be a single JSON object with 'thought' and 'tool_calls'.
 'thought' is your reasoning; 'tool_calls' is an array of { tool, parameters } objects.
 Set "parallel": true at the top level to execute tool calls concurrently.
 Use the 'finish' tool only when you are certain the task is complete.

 Example response:
 {
   "thought": "I need to search for information.",
   "tool_calls": [{ "tool": "duckduckgo_search", "parameters": { "query": "latest AI research" } }]
 }

 Begin!`;
  }

  async getLLMAction(observer = {}) {
    await this.manageConversationHistory();
    this.llmNode.setParams({ prompt: JSON.stringify(this.conversationHistory) });
    return await this.llmNode.runAsync({}, observer);
  }

  async manageConversationHistory() {
    if (!this.summarizeLLM) return;

    const minHistoryLength = 2;
    let currentSize = JSON.stringify(this.conversationHistory).length;

    while (currentSize > this.maxConversationHistoryTokens && this.conversationHistory.length > minHistoryLength) {
      const oldestEntry = this.conversationHistory[minHistoryLength];

      if (oldestEntry?.role === 'user' && oldestEntry.content.startsWith('Observation:')) {
        const observation = oldestEntry.content.slice('Observation:'.length).trim();
        try {
          const summarizeNode = new SummarizeNode();
          summarizeNode.setParams({ text: observation, llmNode: this.summarizeLLM });
          const summarized = await new AsyncFlow(summarizeNode).runAsync({});
          this.conversationHistory[minHistoryLength].content = `Summarized Observation: ${summarized}`;
        } catch (error) {
          logger.error(`Failed to summarize observation: ${error.message}. Removing oldest entry.`);
          this.conversationHistory.splice(minHistoryLength, 1);
        }
      } else {
        this.conversationHistory.splice(minHistoryLength, 1);
      }

      currentSize = JSON.stringify(this.conversationHistory).length;
    }
  }

  parseLLMResponse(llmResponse, { strict = this.strategy.strictParsing } = {}) {
    if (typeof llmResponse === 'string') {
      const firstBrace = llmResponse.indexOf('{');
      const lastBrace = llmResponse.lastIndexOf('}');
      const jsonString = firstBrace !== -1 && lastBrace > firstBrace
        ? llmResponse.slice(firstBrace, lastBrace + 1)
        : llmResponse;

      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.thought && Array.isArray(parsed.tool_calls)) {
          return {
            thought: parsed.thought,
            toolCalls: parsed.tool_calls,
            parallel: parsed.parallel || false,
          };
        }
        if (strict) throw new Error("JSON is missing 'thought' or 'tool_calls' array.");
        return { thought: parsed.thought ?? llmResponse, toolCalls: [], parallel: false };
      } catch (error) {
        if (strict) throw new Error(`Invalid JSON format: ${error.message}. Content: ${jsonString}`);
        return { thought: llmResponse, toolCalls: [], parallel: false };
      }
    }

    const message = llmResponse?.choices?.[0]?.message;
    if (message) {
      if (message.tool_calls?.length) {
        return {
          thought: message.reasoning_content || `Calling tool(s): ${message.tool_calls.map(tc => tc.function.name).join(', ')}`,
          toolCalls: message.tool_calls.map(tc => ({
            tool: tc.function.name,
            parameters: JSON.parse(tc.function.arguments),
          })),
          parallel: false,
        };
      }
      if (typeof message.content === 'string') {
        return this.parseLLMResponse(message.content, { strict });
      }
    }

    if (strict) throw new Error(`Invalid LLM response structure. Raw Data: ${JSON.stringify(llmResponse)}`);
    return { thought: String(llmResponse), toolCalls: [], parallel: false };
  }

  validateToolParameters(toolCall) {
    const toolSchema = getToolDefinitions().find(def => def.name === toolCall.tool) ??
      (this.availableTools[toolCall.tool] ? { parameters: { required: [] } } : null);
    if (!toolSchema) return `Tool '${toolCall.tool}' is not a recognized tool.`;

    if (toolCall.tool === 'finish') {
      return toolCall.parameters?.output === undefined ? "Missing required parameter: 'output' for tool 'finish'." : null;
    }

    if (FLOW_TOOLS.has(toolCall.tool)) {
      if (toolCall.parameters?.flow === undefined) {
        return `Missing required parameter: 'flow' for tool '${toolCall.tool}'.`;
      }
      return this.flowRegistry[toolCall.parameters.flow] ? null : `Flow '${toolCall.parameters.flow}' not found in registry.`;
    }

    const required = toolSchema.parameters?.required ?? [];
    for (const param of required) {
      if (toolCall.parameters?.[param] === undefined) {
        return `Missing required parameter: '${param}' for tool '${toolCall.tool}'.`;
      }
    }
    return null;
  }

  async executeToolCalls(toolCalls, parallel) {
    const executeTool = async toolCall => {
      const toolInstance = this.availableTools[toolCall.tool];
      if (!toolInstance) {
        return { success: false, error: `Tool '${toolCall.tool}' not found. Available tools: ${Object.keys(this.availableTools).join(', ')}.` };
      }

      try {
        logger.toolCall(toolCall.tool, toolCall.parameters);

        if (FLOW_TOOLS.has(toolCall.tool)) {
          const flowName = toolCall.parameters.flow;
          if (!this.flowRegistry[flowName]) throw new Error(`Flow '${flowName}' not found in registry.`);
          toolCall.parameters.flow = this.flowRegistry[flowName];
        }

        toolInstance.setParams(toolCall.parameters ?? {});
        const ToolFlowClass = toolInstance instanceof AsyncNode ? AsyncFlow : Flow;
        const toolFlow = new ToolFlowClass(toolInstance);
        let output = toolInstance instanceof AsyncNode
          ? await toolFlow.runAsync({})
          : toolFlow.run({});

        logger.toolResult(toolCall.tool, output);

        if (this.summarizeLLM && typeof output === 'string' && output.length > 1000) {
          const summarizeNode = new SummarizeNode();
          summarizeNode.setParams({ text: output, llmNode: this.summarizeLLM });
          output = await new AsyncFlow(summarizeNode).runAsync({});
        }
        return { success: true, output };
      } catch (error) {
        return { success: false, error: `Error executing tool '${toolCall.tool}': ${error.message}` };
      }
    };

    const results = [];
    if (parallel) {
      results.push(...await Promise.all(toolCalls.map(executeTool)));
    } else {
      for (const toolCall of toolCalls) results.push(await executeTool(toolCall));
    }

    return results.map((result, index) => ({
      tool: toolCalls[index].tool,
      parameters: toolCalls[index].parameters,
      ...result,
    }));
  }

  async confirmFinish(output) {
    const confirmNode = new UserInputNode();
    confirmNode.setParams({ prompt: `Agent proposes to finish with output: "${output}". Do you approve? (yes/no): ` });
    const confirmation = await new AsyncFlow(confirmNode).runAsync({});

    if (String(confirmation).toLowerCase() !== 'yes') {
      logger.info('Agent finish denied by user. User input will be the next prompt.');
      this.conversationHistory.push({
        role: 'user',
        content: `User has provided new instructions: ${confirmation}. Please adjust your plan and continue working.`,
      });
      return false;
    }
    return true;
  }

  async runPhase(phase, observer = {}) {
    if (phase.prompt) {
      this.conversationHistory.push({ role: 'user', content: phase.prompt });
    }

    const response = await this.getLLMAction(observer);
    let parsed;
    try {
      parsed = this.parseLLMResponse(response);
    } catch (error) {
      const raw = typeof response === 'string' ? response : JSON.stringify(response);
      logger.error(`Error parsing LLM response in ${phase.name ?? 'action'} phase: ${error.message}`);
      this.conversationHistory.push({
        role: 'user',
        content: `CRITICAL ERROR: Your last response was NOT valid JSON or did not follow the expected format.
Error details: ${error.message}
Your invalid response was:
\`\`\`
${raw}
\`\`\`
You MUST respond with a single JSON object containing 'thought' and 'tool_calls'. Do NOT generate any other text or code outside of this JSON structure. Re-evaluate your plan and provide a valid JSON response.`,
      });
      return { invalid: true };
    }

    logger.thought(parsed.thought);
    this.conversationHistory.push({
      role: 'assistant',
      content: JSON.stringify(parsed.toolCalls?.length
        ? { thought: parsed.thought, tool_calls: parsed.toolCalls, parallel: parsed.parallel }
        : { thought: parsed.thought }),
    });
    return parsed;
  }

  async execAsync(prepRes, shared, observer = {}) {
    const { goal } = this.params;
    if (!goal) throw new Error(`${this.constructor.name} requires a 'goal' parameter.`);

    this.llmNode.setParams({ goal });
    this.conversationHistory = [
      { role: 'system', content: this.getSystemPrompt() },
      { role: 'user', content: `Goal: ${goal}` },
      ...(this.strategy.initialMessages ?? []),
    ];

    const actionPhase = this.strategy.phases.find(phase => phase.kind === 'action');
    let step = 0;
    let finalOutput = null;

    while (step < this.maxSteps) {
      step++;
      logger.info(`Agent Step ${step}`);

      let action = null;
      let invalid = false;

      for (const phase of this.strategy.phases) {
        let parsed;
        try {
          parsed = await this.runPhase(phase, observer);
        } catch (error) {
          logger.error(`Failed to get LLM response: ${error.message}`);
          this.conversationHistory.push({ role: 'user', content: `Error: Failed to get LLM response: ${error.message}` });
          invalid = true;
          break;
        }
        if (parsed.invalid) {
          invalid = true;
          break;
        }
        if (phase.kind === 'action') action = parsed;
      }
      if (invalid) continue;

      const validationErrors = action.toolCalls.map(tc => this.validateToolParameters(tc)).filter(Boolean);
      if (validationErrors.length) {
        const message = `Tool parameter validation failed for one or more tools: ${validationErrors.join('; ')}. Please correct the parameters.`;
        logger.error(message);
        this.conversationHistory.push({ role: 'user', content: `Error: ${message}` });
        continue;
      }

      const finishToolCall = action.toolCalls.find(tc => tc.tool === 'finish');
      if (finishToolCall) {
        finalOutput = finishToolCall.parameters.output;
        if (this.requireFinishConfirmation && !(await this.confirmFinish(finalOutput))) continue;
        logger.final(finalOutput);
        break;
      }

      if (action.toolCalls.length === 0) {
        const prompt = this.strategy.noToolCallsPrompt(actionPhase);
        if (prompt) this.conversationHistory.push({ role: 'user', content: prompt });
        continue;
      }

      const observations = await this.executeToolCalls(action.toolCalls, action.parallel);
      this.conversationHistory.push({ role: 'user', content: `Observation: ${JSON.stringify(observations)}` });

      const toolErrors = observations.filter(obs => obs.success === false);
      if (this.strategy.afterTools) {
        this.conversationHistory.push({ role: 'system', content: this.strategy.afterTools });
      }
      if (toolErrors.length) {
        const errors = toolErrors.map(err => `Tool: ${err.tool}, Parameters: ${JSON.stringify(err.parameters)}, Error: ${err.error}`).join('\n');
        this.conversationHistory.push({ role: 'system', content: this.strategy.onToolError(errors) });
      }

      for (const phase of this.strategy.postPhases) {
        if (phase.when === 'success' && toolErrors.length) continue;
        if (phase.prompt && !(phase.promptOnlyOnSuccess && toolErrors.length)) {
          this.conversationHistory.push({ role: 'user', content: phase.prompt });
        }
        let parsed;
        try {
          parsed = await this.runPhase({ ...phase, prompt: null }, observer);
        } catch (error) {
          logger.error(`Failed to get LLM response in ${phase.name} phase: ${error.message}`);
          break;
        }
        if (parsed.invalid) break;
      }
    }

    if (step >= this.maxSteps && finalOutput === null) {
      finalOutput = 'Agent reached max steps without finishing. Last observation: ' +
        JSON.stringify(this.conversationHistory[this.conversationHistory.length - 1]);
      logger.error(finalOutput);
    }

    return finalOutput;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.agentOutput = execRes;
    return 'default';
  }
}
