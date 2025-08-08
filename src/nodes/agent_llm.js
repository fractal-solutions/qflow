import { DeepSeekLLMNode, OpenAILLMNode, GeminiLLMNode, OllamaLLMNode, HuggingFaceLLMNode } from './llm.js';

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

export class AgentGeminiLLMNode extends GeminiLLMNode {
  async execAsync() {
    const messages = JSON.parse(this.params.prompt);
    const { apiKey } = this.params;

    if (!messages || messages.length === 0) {
      throw new Error('Messages are required for AgentGeminiLLMNode.');
    }
    if (!apiKey) {
      throw new Error('Google Gemini API Key is required.');
    }

    console.log(`[AgentGemini] Sending prompt to Gemini...`);

    try {
      const contents = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: contents,
          safetySettings: [
            {
              "category": "HARM_CATEGORY_HARASSMENT",
              "threshold": "BLOCK_NONE"
            },
            {
              "category": "HARM_CATEGORY_HATE_SPEECH",
              "threshold": "BLOCK_NONE"
            },
            {
              "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              "threshold": "BLOCK_NONE"
            },
            {
              "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
              "threshold": "BLOCK_NONE"
            },
          ],
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error.message}`);
      }

      const data = await response.json();
      const llmResponse = data.candidates[0].content.parts[0].text.trim();
      console.log(`[AgentGemini] Received response from Gemini.`);
      return llmResponse;
    } catch (error) {
      console.error('AgentGeminiLLMNode: Error during API call:', error);
      throw error;
    }
  }
}

export class AgentOllamaLLMNode extends OllamaLLMNode {
  preparePrompt(shared) {
    const messages = JSON.parse(this.params.prompt);
    // Ollama's /api/generate endpoint expects a single prompt string,
    // so we'll concatenate the conversation history into a single prompt.
    // A more sophisticated approach might use a chat-specific endpoint if available.
    this.params.prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n') + '\nassistant:';
  }

  async execAsync(prepRes, shared) {
    this.preparePrompt(shared);
    const { prompt, model = 'llama2', baseUrl = 'http://localhost:11434' } = this.params;

    if (!prompt) {
      throw new Error('Prompt is required for AgentOllamaLLMNode.');
    }

    console.log(`[AgentOllama] Sending prompt to ${model} at ${baseUrl}...`);

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Ollama API error: ${response.status} - ${errorData.error}`);
      }

      const data = await response.json();
      const llmResponse = data.response.trim();
      console.log(`[AgentOllama] Received response from ${model}.`);
      return llmResponse;
    } catch (error) {
      console.error('AgentOllamaLLMNode: Error during API call:', error);
      throw error;
    }
  }
}

export class AgentHuggingFaceLLMNode extends HuggingFaceLLMNode {
  preparePrompt(shared) {
    const messages = JSON.parse(this.params.prompt);
    // Hugging Face router (OpenAI-compatible) expects a messages array.
    // We'll pass the parsed messages directly.
    this.params.messages = messages;
  }

  async execAsync(prepRes, shared) {
    this.preparePrompt(shared); // Prepare the prompt from shared state
    const { messages, model, hfToken, temperature, max_new_tokens, baseUrl } = this.params;

    if (!messages || messages.length === 0) {
      throw new Error('AgentHuggingFaceLLMNode requires `messages`.');
    }
    if (!model) {
      throw new Error('AgentHuggingFaceLLMNode requires a `model`.');
    }
    if (!hfToken) {
      throw new Error('AgentHuggingFaceLLMNode requires a `hfToken`.');
    }

    const url = `${baseUrl || 'https://router.huggingface.co/v1'}/chat/completions`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hfToken}`,
    };
    const body = JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature || 0.7,
      max_tokens: max_new_tokens || 500,
    });

    console.log(`[AgentHuggingFace] Sending prompt to ${model} at ${url}...`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = await response.text(); // Get raw text if not JSON
        }
        throw new Error(`Hugging Face API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      //console.log("HuggingFace Agent Raw Data:", JSON.stringify(data, null, 2)); // Added logging

      let llmResponse = '';
      if (data && data.choices && data.choices.length > 0 && data.choices[0].message && typeof data.choices[0].message.content === 'string') {
        llmResponse = data.choices[0].message.content.trim();
      } else if (data && Array.isArray(data) && data[0] && typeof data[0].generated_text === 'string') {
        // Fallback for models that return directly generated_text (e.g., older HF inference API)
        llmResponse = data[0].generated_text.trim();
      } else {
        throw new Error('Invalid or unexpected response structure from Hugging Face API.');
      }

      console.log(`[AgentHuggingFace] Received response from ${model}.`);
      return data; // Return the full data object for AgentNode to parse
    } catch (error) {
      console.error('AgentHuggingFaceLLMNode: Error during API call:', error);
      throw error;
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.llmResponse = execRes; // Store the full LLM response object
    return execRes; // Return the full LLM response object
  }
}