import { AsyncNode } from '@/qflow.js';
import { log } from '@/logger.js';

export class OpenRouterLLMNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "openrouter_llm_reasoning",
      description: "Generates human-like text, reasons, and plans via OpenRouter. Not for external actions.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The prompt or question to send to the language model."
          },
          model: {
            type: "string",
            description: "The OpenRouter model ID (e.g., 'openai/gpt-4o', 'mistralai/mistral-7b-instruct')."
          },
          apiKey: {
            type: "string",
            description: "Your OpenRouter API key."
          },
          siteUrl: {
            type: "string",
            description: "Optional. Site URL for rankings on openrouter.ai."
          },
          siteTitle: {
            type: "string",
            description: "Optional. Site title for rankings on openrouter.ai."
          }
        },
        required: ["prompt", "model", "apiKey"]
      }
    };
  }

  constructor(maxRetries = 3, wait = 2) {
    super(maxRetries, wait);
  }

  async execAsync() {
    const { prompt, apiKey, model, siteUrl, siteTitle } = this.params;

    if (!prompt) {
      throw new Error('OpenRouterLLMNode requires a `prompt`.');
    }
    if (!apiKey) {
      throw new Error('OpenRouterLLMNode requires an `apiKey`.');
    }
    if (!model) {
      throw new Error('OpenRouterLLMNode requires a `model`.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    if (siteUrl) {
      headers['HTTP-Referer'] = siteUrl;
    }
    if (siteTitle) {
      headers['X-Title'] = siteTitle;
    }

    log(`[OpenRouter] Sending prompt to ${model}...`, this.params.logging);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      if (!data.choices || data.choices.length === 0 || !data.choices[0].message || typeof data.choices[0].message.content !== 'string') {
        throw new Error('Invalid response structure from OpenRouter API.');
      }

      const llmResponse = data.choices[0].message.content.trim();
      log(`[OpenRouter] Received response from ${model}.`, this.params.logging);
      return llmResponse;
    } catch (error) {
      log('OpenRouterLLMNode: Error during API call:', this.params.logging, { type: 'error' });
      throw error;
    }
  }
}

export class AgentOpenRouterLLMNode extends OpenRouterLLMNode {
  async execAsync() {
    const { prompt, apiKey, model, siteUrl, siteTitle } = this.params; // prompt here is the stringified conversation history

    if (!prompt) {
      throw new Error("AgentOpenRouterLLMNode: Prompt (conversation history) is missing from params.");
    }
    if (!apiKey) {
      throw new Error("OpenRouter API Key is not configured for AgentOpenRouterLLMNode.");
    }
    if (!model) {
      throw new Error("AgentOpenRouterLLMNode requires a `model`.");
    }

    let messages;
    try {
      messages = JSON.parse(prompt);
      // Ensure messages array contains objects with role and content
      if (!Array.isArray(messages) || !messages.every(msg => msg.role && msg.content !== undefined)) {
        throw new Error("Parsed prompt is not a valid messages array.");
      }
    } catch (e) {
      throw new Error(`AgentOpenRouterLLMNode: Invalid prompt format. Expected stringified JSON array of messages. Error: ${e.message}`);
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    if (siteUrl) {
      headers['HTTP-Referer'] = siteUrl;
    }
    if (siteTitle) {
      headers['X-Title'] = siteTitle;
    }

    log(`[AgentOpenRouter] Sending prompt to ${model}...`, this.params.logging);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: messages, // Use the parsed messages array directly
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      if (!data.choices || data.choices.length === 0 || !data.choices[0].message || typeof data.choices[0].message.content !== 'string') {
        throw new Error('Invalid response structure from OpenRouter API or missing content.');
      }

      const llmResponse = data.choices[0].message.content.trim();
      log(`[AgentOpenRouter] Received response from ${model}.`, this.params.logging);
      return llmResponse; // Return the actual content
    } catch (error) {
      log('AgentOpenRouterLLMNode: Error during API call:', this.params.logging, { type: 'error' });
      throw error;
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.llmResponse = execRes; // Store the full LLM response object
    return execRes; // Return the full LLM response object
  }

  // preparePrompt is no longer needed as execAsync handles the prompt directly
  preparePrompt(shared) {
    throw new Error("preparePrompt should not be called on AgentOpenRouterLLMNode. Prompt is handled in execAsync.");
  }
}
