import { DeepSeekLLMNode, OpenAILLMNode } from './llm.js';

/**
 * A specialized DeepSeekLLMNode for use within the AgentNode.
 * It expects the full prompt (conversation history) to be provided directly via setParams.
 */
export class AgentDeepSeekLLMNode extends DeepSeekLLMNode {
  // Override execAsync to handle the conversation history format
  async execAsync() {
    const { prompt, apiKey, keyword } = this.params; // prompt here is the stringified conversation history

    if (!prompt) {
      throw new Error("AgentDeepSeekLLMNode: Prompt (conversation history) is missing from params.");
    }
    if (!apiKey) {
      throw new Error("DeepSeek API Key is not configured for AgentDeepSeekLLMNode.");
    }

    let messages;
    try {
      messages = JSON.parse(prompt);
      // Ensure messages array contains objects with role and content
      if (!Array.isArray(messages) || !messages.every(msg => msg.role && msg.content !== undefined)) {
        throw new Error("Parsed prompt is not a valid messages array.");
      }
    } catch (e) {
      throw new Error(`AgentDeepSeekLLMNode: Invalid prompt format. Expected stringified JSON array of messages. Error: ${e.message}`);
    }

    console.log(`[DeepSeek] Sending prompt for "${keyword || 'agent_reasoning'}"...`);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages, // Use the parsed messages array directly
        max_tokens: 2048,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error.message}`);
    }

    const data = await response.json();
    console.log("DeepSeek Raw Data:", JSON.stringify(data, null, 2)); // Added logging
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || typeof data.choices[0].message.content !== 'string') {
      throw new Error('Invalid response structure from DeepSeek API or missing content.');
    }
    
    const llmResponse = data.choices[0].message.content.trim();
    console.log(`[DeepSeek] Received response for "${keyword || 'agent_reasoning'}".`);
    return llmResponse; // Return the actual content
  }

  async postAsync(shared, prepRes, execRes) {
    shared.llmResponse = execRes;
    return execRes; // Return the actual LLM response
  }

  // preparePrompt is no longer needed as execAsync handles the prompt directly
  preparePrompt(shared) {
    // This method is intentionally left empty or can throw an error if called,
    // as the prompt is handled directly in execAsync for AgentNode integration.
    throw new Error("preparePrompt should not be called on AgentDeepSeekLLMNode. Prompt is handled in execAsync.");
  }
}

/**
 * A specialized OpenAILLMNode for use within the AgentNode.
 * It expects the full prompt (conversation history) to be provided directly via setParams.
 */
export class AgentOpenAILLMNode extends OpenAILLMNode {
  // Override execAsync to handle the conversation history format
  async execAsync() {
    const { prompt, apiKey, keyword } = this.params; // prompt here is the stringified conversation history

    if (!prompt) {
      throw new Error("AgentOpenAILLMNode: Prompt (conversation history) is missing from params.");
    }
    if (!apiKey) {
      throw new Error("OpenAI API Key is not configured for AgentOpenAILLMNode.");
    }

    let messages;
    try {
      messages = JSON.parse(prompt);
      // Ensure messages array contains objects with role and content
      if (!Array.isArray(messages) || !messages.every(msg => msg.role && msg.content !== undefined)) {
        throw new Error("Parsed prompt is not a valid messages array.");
      }
    } catch (e) {
      throw new Error(`AgentOpenAILLMNode: Invalid prompt format. Expected stringified JSON array of messages. Error: ${e.message}`);
    }

    console.log(`[OpenAI] Sending prompt for "${keyword || 'agent_reasoning'}"...`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Or gpt-4, etc.
        messages: messages, // Use the parsed messages array directly
        max_tokens: 1500, // Increased max_tokens for agent responses
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error.message}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || typeof data.choices[0].message.content !== 'string') {
      throw new Error('Invalid response structure from OpenAI API or missing content.');
    }
    
    const llmResponse = data.choices[0].message.content.trim();
    console.log(`[OpenAI] Received response for "${keyword || 'agent_reasoning'}".`);
    return llmResponse; // Return the actual content
  }

  async postAsync(shared, prepRes, execRes) {
    shared.llmResponse = execRes;
    return execRes; // Return the actual LLM response
  }

  // preparePrompt is not needed as execAsync handles the prompt directly
}