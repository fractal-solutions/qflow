
import { BaseAgent } from './base_agent.js';
import { logger } from './logger.js';
import { AsyncNode, AsyncFlow, Flow } from '../qflow.js';
import { UserInputNode } from '../nodes/index.js';

export class OODAAgent extends BaseAgent {
    async execAsync() {
        const { goal } = this.params;
        if (!goal) {
            throw new Error("OODAAgent requires a 'goal' parameter.");
        }

        this.conversationHistory = [
            { role: "system", content: this.getSystemPrompt() },
            { role: "user", content: `Goal: ${goal}` },
        ];

        let step = 0;
        let finalOutput = null;

        while (step < this.maxSteps) {
            step++;
            logger.info(`Agent Step ${step}`);

            // Observe
            this.conversationHistory.push({ role: "user", content: "Current Phase: OBSERVE. Summarize the latest data from the environment." });
            const observeResponse = await this.getLLMAction();
            const { thought: observeThought } = this.parseLLMResponse(observeResponse);
            logger.thought(observeThought);
            this.conversationHistory.push({ role: "assistant", content: JSON.stringify({ thought: observeThought }) });

            // Orient
            this.conversationHistory.push({ role: "user", content: "Current Phase: ORIENT. Interpret data in context of history and goal." });
            const orientResponse = await this.getLLMAction();
            const { thought: orientThought } = this.parseLLMResponse(orientResponse);
            logger.thought(orientThought);
            this.conversationHistory.push({ role: "assistant", content: JSON.stringify({ thought: orientThought }) });

            // Decide
            this.conversationHistory.push({ role: "user", content: "Current Phase: DECIDE. Select the best action now." });
            const decideResponse = await this.getLLMAction();
            let parsedDecideResponse;
            try {
                parsedDecideResponse = this.parseLLMResponse(decideResponse);
            } catch (e) {
                logger.error(`Error parsing LLM response in Decide phase: ${e.message}`);
                this.conversationHistory.push({ role: "user", content: `
CRITICAL ERROR: Your last response was NOT valid JSON or did not follow the expected format.\nError details: ${e.message}\nYour invalid response was: \n\`\`\`\n${decideResponse}\n\`\`\`\nYou MUST respond with a single JSON object containing \'thought\' and \'tool_calls\'. Do NOT generate any other text or code outside of this JSON structure. Re-evaluate your plan and provide a valid JSON response.\n` });
                continue; // Re-run the loop to allow the LLM to correct itself
            }
            const { thought: decideThought, toolCalls, parallel } = parsedDecideResponse;
            logger.thought(decideThought);
            this.conversationHistory.push({ role: "assistant", content: JSON.stringify({ thought: decideThought, tool_calls: toolCalls, parallel }) });

            // Validate tool parameters for all tool calls
            const validationErrors = toolCalls.map(tc => this.validateToolParameters(tc)).filter(Boolean);
            if (validationErrors.length > 0) {
                const errorMessage = `Tool parameter validation failed for one or more tools: ${validationErrors.join('; ')}. Please correct the parameters.`;
                logger.error(errorMessage);
                this.conversationHistory.push({ role: "user", content: `Error: ${errorMessage}` });
                continue; // Re-run the loop to allow the LLM to correct itself
            }

            // Handle finish tool (check here before acting)
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
                        this.conversationHistory.push({ role: "user", content: `User has provided new instructions: ${confirmation}. Please adjust your plan and continue working.` });
                        continue; // Continue the loop
                    }
                }

                logger.final(finalOutput);
                break; // Exit the main loop as agent is finished
            }

            // If no tool calls and not trying to finish, prompt LLM to generate tool calls
            if (toolCalls.length === 0) {
                this.conversationHistory.push({ role: "user", content: "Current Phase: DECIDE. Your previous response did not include any tool calls. If you intend to take action, you MUST include at least one tool call in your JSON response. Re-evaluate your plan and provide tool calls." });
                continue; // Re-run the loop to force tool call generation
            }

            // Act
            const observations = await this.executeToolCalls(toolCalls, parallel);
            this.conversationHistory.push({ role: "user", content: `Observation: ${JSON.stringify(observations)}` });

            // Check for tool errors and add specific instructions for reflection
            const toolErrors = observations.filter(obs => obs.success === false);
            if (toolErrors.length > 0) {
                const errorMessages = toolErrors.map(err => `Tool: ${err.tool}, Parameters: ${JSON.stringify(err.parameters)}, Error: ${err.error}`).join('\n');
                this.conversationHistory.push({ role: "system", content: `
IMPORTANT: One or more tool calls failed. Analyze the following errors carefully:
${errorMessages}

Explain *why* these tools failed. Propose an alternative tool or a revised plan to achieve the goal without these tools, or suggest how to fix the underlying issue. Do NOT generate irrelevant code, random thoughts, or go off-topic. Focus solely on addressing these errors and getting back on track to achieve the user's goal.
` });
            } else {
                // No specific reflect phase for OODA after act, it loops back to observe
            }
        }

        if (step >= this.maxSteps && finalOutput === null) {
            const message = "Agent reached max steps without finishing. Last observation: " + JSON.stringify(this.conversationHistory[this.conversationHistory.length - 1]);
            logger.error(message);
            finalOutput = message;
        }

        return finalOutput;
    }

    async executeToolCalls(toolCalls, parallel) {
        const executeTool = async (toolCall) => {
            const toolInstance = this.availableTools[toolCall.tool];
            if (!toolInstance) {
                return `Error: Tool '${toolCall.tool}' not found. Available tools: ${Object.keys(this.availableTools).join(', ')}.`;
            }

            let toolOutput;
            try {
                logger.toolCall(toolCall.tool, toolCall.parameters);

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
                return { success: true, output: toolOutput };
            } catch (e) {
                return { success: false, error: `Error executing tool '${toolCall.tool}': ${e.message}` };
            }
        };

        let observations = [];
        if (parallel) {
            const results = await Promise.all(toolCalls.map(executeTool));
            observations = results.map((result, index) => ({
                tool: toolCalls[index].tool,
                parameters: toolCalls[index].parameters,
                ...result // Spread success/error and output/error
            }));
        } else {
            for (const toolCall of toolCalls) {
                const result = await executeTool(toolCall);
                observations.push({
                    tool: toolCall.tool,
                    parameters: toolCall.parameters,
                    ...result // Spread success/error and output/error
                });
            }
        }
        return observations;
    }
}
