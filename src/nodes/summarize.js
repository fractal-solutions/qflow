import { AsyncNode } from '../qflow.js';
import { DeepSeekLLMNode } from './llm.js'; // Assuming DeepSeekLLMNode for summarization
import { log } from '../logger.js';

/**
 * Summarizes a given text using an LLM.
 * @param {object} params - The parameters for the node.
 * @param {string} params.text - The text content to summarize.
 * @param {DeepSeekLLMNode} params.llmNode - An instance of an LLM node to perform the summarization.
 * @returns {Promise<string>} A promise that resolves to the summarized text.
 */
export class SummarizeNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "summarize_text",
      description: "Summarizes a given text using an LLM.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text content to summarize."
          },
          // Note: llmNode itself cannot be directly passed as a tool parameter in JSON schema.
          // The agent would need to be configured with a default summarization LLM,
          // or the tool definition would need to specify parameters for an LLM to be instantiated.
          // For now, we'll omit llmNode from the tool definition, assuming it's handled internally by the agent.
        },
        required: ["text"]
      }
    };
  }

  async execAsync() {
    const { text, llmNode } = this.params;

    if (!text) {
      throw new Error('SummarizeNode requires a `text` parameter.');
    }
    if (!llmNode) {
      throw new Error('SummarizeNode requires an `llmNode` instance for summarization.');
    }

    log(`[Summarize] Summarizing text (length: ${text.length})...`, this.params.logging);

    const prompt = `Please summarize the following text concisely, focusing on key information relevant to an agent's task. Keep the summary under 500 words:\n\n${text}`;

    llmNode.setParams({ prompt: prompt, keyword: 'summarization' });
    const summary = await llmNode.runAsync({});

    log(`[Summarize] Summary generated (length: ${summary.length}).`, this.params.logging);
    return summary;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.summary = execRes;
    return 'default';
  }
}
