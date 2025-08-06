import { AsyncNode } from '../qflow.js';
import { DeepSeekLLMNode } from './llm.js'; // Assuming DeepSeekLLMNode for summarization

/**
 * Summarizes a given text using an LLM.
 * @param {object} params - The parameters for the node.
 * @param {string} params.text - The text content to summarize.
 * @param {DeepSeekLLMNode} params.llmNode - An instance of an LLM node to perform the summarization.
 * @returns {Promise<string>} A promise that resolves to the summarized text.
 */
export class SummarizeNode extends AsyncNode {
  async execAsync() {
    const { text, llmNode } = this.params;

    if (!text) {
      throw new Error('SummarizeNode requires a `text` parameter.');
    }
    if (!llmNode) {
      throw new Error('SummarizeNode requires an `llmNode` instance for summarization.');
    }

    console.log(`[Summarize] Summarizing text (length: ${text.length})...`);

    const prompt = `Please summarize the following text concisely, focusing on key information relevant to an agent's task. Keep the summary under 500 words:\n\n${text}`;

    llmNode.setParams({ prompt: prompt, keyword: 'summarization' });
    const summary = await llmNode.runAsync({});

    console.log(`[Summarize] Summary generated (length: ${summary.length}).`);
    return summary;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.summary = execRes;
    return 'default';
  }
}
