import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { getToolDefinitions } from '../src/agent/tools.js';
import {
  AgentNode,
  DuckDuckGoSearchNode,
  ScrapeURLNode,
  DeepSeekLLMNode,
  AgentDeepSeekLLMNode,
  MemoryNode,
  SystemNotificationNode
} from '@fractal-solutions/qflow/nodes';

// --- Robust Agent Node Definition (to handle potential non-JSON LLM output) ---
class RobustAgentNode extends AgentNode {
  parseLLMResponse(llmResponse) {
    // If it's a string, try to parse it as JSON. If not, treat as thought.
    if (typeof llmResponse === 'string') {
      try {
        const parsed = JSON.parse(llmResponse);
        if (parsed.thought !== undefined && Array.isArray(parsed.tool_calls)) {
          return {
            thought: parsed.thought,
            toolCalls: parsed.tool_calls,
            parallel: parsed.parallel || false,
          };
        }
      } catch (e) {
        // Not valid JSON, or not in expected format. Treat as plain text thought.
      }
      return { thought: llmResponse, toolCalls: [], parallel: false };
    }

    if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      } else {
        // If no braces found, it's definitely not JSON, treat as thought
        return { thought: llmResponse, toolCalls: [], parallel: false };
      }

      // Now, try to parse the extracted string as JSON
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.thought !== undefined && Array.isArray(parsed.tool_calls)) {
          return {
            thought: parsed.thought,
            toolCalls: parsed.tool_calls,
            parallel: parsed.parallel || false,
          };
        }
      } catch (e) {
        // JSON parsing failed, or not in expected format.
        // Fall through to treat the original llmResponse as a plain text thought.
      }
      // If parsing failed or not in expected format, treat the original string as a thought
      return { thought: llmResponse, toolCalls: [], parallel: false };
    }

    // If it's an object, assume it's an OpenAI-like response and process it.
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
      } else if (typeof message.content === 'string') {
        // Recursively call parseLLMResponse for the content string
        return this.parseLLMResponse(message.content);
      }
    }

    // Fallback for unexpected LLM response structures
    return { thought: JSON.stringify(llmResponse), toolCalls: [], parallel: false };
  }
}

// --- Web Research Agent Definition ---
class WebResearchAgentNode extends RobustAgentNode {  constructor(llmNode, availableTools, summarizeLLM, flowRegistry) {    super(llmNode, availableTools, summarizeLLM, flowRegistry);  }  getSystemPrompt() {    const toolDefinitions = getToolDefinitions();    const toolDescriptions = toolDefinitions.map(tool => {      const params = JSON.stringify(tool.parameters);      return `### ${tool.name}: ${tool.description}\nParameters: ${params}`;    }).join('\n');    return `You are a specialized Web Research Agent. Your primary goal is to accurately and comprehensively gather information from the web based on the user's query. You have access to web search and web scraping tools. Once you have gathered the necessary information, use the 'finish' tool to provide the summarized findings.\n\nAvailable Tools:\n${toolDescriptions}\n\nCRITICAL: Your response MUST be a single JSON object with 'thought' and 'tool_calls'. DO NOT generate code, prose, or any other text outside of the JSON structure. DO NOT use the 'llm_reasoning' tool. Use the 'finish' tool when you have the final answer.\n\nExample response:\n{\n  "thought": "I need to search for information.",\n  "tool_calls": [\n    {\n      "tool": "duckduckgo_search",\n      "parameters": {\n        "query": "latest AI research"\n      }\n    }\n  ]\n}\n\nWhen you have completed the research and summarized the findings, use the 'finish' tool.`;  }}// --- Conductor Agent Definition ---class ConductorAgentNode extends RobustAgentNode {  constructor(llmNode, availableTools, summarizeLLM, flowRegistry) {    super(llmNode, availableTools, summarizeLLM, flowRegistry);  }  getSystemPrompt() {    const toolDefinitions = getToolDefinitions();    const toolDescriptions = toolDefinitions.map(tool => {      const params = JSON.stringify(tool.parameters);      return `### ${tool.name}: ${tool.description}\nParameters: ${params}`;    }).join('\n');    const flowRegistryDescription = Object.keys(this.flowRegistry).length > 0 ? `\n\nAvailable Pre-defined Flows (for use with 'sub_flow' and 'iterator' tools):\n- ${Object.keys(this.flowRegistry).join('\n- ' )}` : "";    return `You are a Conductor Agent. Your role is to orchestrate other specialized agents to achieve complex goals. You can delegate tasks to sub-agents using the 'sub_flow' tool. Your primary goal is to break down the user's request, delegate parts to appropriate sub-agents, and then synthesize their findings into a final answer.\n\nAvailable Tools:\n${toolDescriptions}${flowRegistryDescription}\n\nCRITICAL: Your response MUST be a single JSON object with 'thought' and 'tool_calls'. DO NOT generate code, prose, or any other text outside of the JSON structure. DO NOT use the 'llm_reasoning' tool. Use the 'finish' tool when you have the final answer.\n\nExample response:\n{\n  "thought": "I need to delegate a task.",\n  "tool_calls": [\n    {\n      "tool": "sub_flow",\n      "parameters": {\n        "flow": "WebResearchAgentFlow",\n        "shared": { "query": "latest AI trends" }\n      }\n    }\n  ]\n}\n\nWhen you have achieved the overall goal, use the 'finish' tool.`;  }}// --- Main Execution Flow ---(async () => {  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;  if (!DEEPSEEK_API_KEY) {    console.warn("WARNING: DEEPSEEK_API_KEY is not set. Please set it to run this example.");    return;  }  console.log('--- Starting Multi-Agent DeepSeek Example ---');  // 1. Instantiate LLM for both agents (using DeepSeek)  const deepSeekLLM = new AgentDeepSeekLLMNode();  deepSeekLLM.setParams({    apiKey: DEEPSEEK_API_KEY,  });  // 2. Define tools available to the Web Research Agent  const webResearchTools = {    duckduckgo_search: new DuckDuckGoSearchNode(),    web_scraper: new ScrapeURLNode(),        system_notification: new SystemNotificationNode(),    memory_node: new MemoryNode(),  };  // 3. Create the Web Research Agent instance  const webResearchAgent = new WebResearchAgentNode(deepSeekLLM, webResearchTools, deepSeekLLM); // Use same LLM for summarization  // 4. Wrap the Web Research Agent in an AsyncFlow to make it a sub-flow  const webResearchAgentFlow = new AsyncFlow(webResearchAgent);  // The prepAsync of the flow will pass the query from the conductor's shared state to the agent's goal  webResearchAgentFlow.prepAsync = async (shared) => {    if (shared.query) {      webResearchAgent.setParams({ goal: shared.query });    }  };  // 5. Define tools available to the Conductor Agent  const conductorTools = {    sub_flow: new AsyncNode(), // Placeholder, actual sub_flow logic is handled by AgentNode's execAsync        system_notification: new SystemNotificationNode(),    memory_node: new MemoryNode(),  };  // 6. Create a flow registry for the Conductor Agent  const flowRegistry = {    WebResearchAgentFlow: webResearchAgentFlow,  };  // 7. Create the Conductor Agent instance  const conductorAgent = new ConductorAgentNode(deepSeekLLM, conductorTools, deepSeekLLM, flowRegistry);  // 8. Set the initial goal for the Conductor Agent  conductorAgent.setParams({    goal: "Research the latest advancements in renewable energy and provide a brief summary."  });  // 9. Create and run the main flow with the Conductor Agent  const mainFlow = new AsyncFlow(conductorAgent);  try {    const finalResult = await mainFlow.runAsync({});    console.log('\n--- Multi-Agent DeepSeek Example Finished ---');    console.log('Final Result from Conductor Agent:', finalResult);  } catch (error) {    console.error('\n--- Multi-Agent DeepSeek Example Failed ---', error);  }}})();