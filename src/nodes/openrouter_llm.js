import { AsyncNode } from '../qflow.js';

export class OpenRouterLLMNode extends AsyncNode {
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

    console.log(`[OpenRouter] Sending prompt to ${model}...`);

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
      console.log(`[OpenRouter] Received response from ${model}.`);
      return llmResponse;
    } catch (error) {
      console.error('OpenRouterLLMNode: Error during API call:', error);
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

    console.log(`[AgentOpenRouter] Sending prompt to ${model}...`);

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
      console.log(`[AgentOpenRouter] Received response from ${model}.`);
      return llmResponse; // Return the actual content
    } catch (error) {
      console.error('AgentOpenRouterLLMNode: Error during API call:', error);
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
