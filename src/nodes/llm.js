import { AsyncNode } from '../qflow.js';

// --- Reusable LLM Node for DeepSeek ---

export class DeepSeekLLMNode extends AsyncNode {
  constructor(maxRetries = 3, wait = 2) {
    super(maxRetries, wait);
  }

  // This will be implemented by subclasses
  preparePrompt(shared) {
    throw new Error("preparePrompt must be implemented by subclasses");
  }

  async execAsync(prepRes, shared) {
    this.preparePrompt(shared); // Set the prompt, passing shared state
    const { prompt, keyword, apiKey } = this.params;

    if (!prompt) {
      throw new Error("Prompt was not generated.");
    }
    if (!apiKey) {
      throw new Error("DeepSeek API Key is not configured.");
    }

    console.log(`[DeepSeek] Sending prompt for \"${keyword}\"...`);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error.message}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || typeof data.choices[0].message.content !== 'string') {
      throw new Error('Invalid response structure from DeepSeek API.');
    }
    
    const llmResponse = data.choices[0].message.content.trim();
    console.log(`[DeepSeek] Received response for \"${keyword}\".`);
    return llmResponse; // Return the actual content
  }
}

export class OpenAILLMNode extends AsyncNode {
  async execAsync() {
    const { prompt, apiKey } = this.params; // prompt and apiKey passed via node params

    if (!prompt) {
      throw new Error('Prompt is required for OpenAILLMNode.');
    }
    if (!apiKey) {
      throw new Error('OpenAI API Key is required.');
    }

    console.log(`OpenAILLMNode: Sending prompt to OpenAI: \"${prompt.substring(0, 50)}\"...`);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error.message}`);
      }

      const data = await response.json();
      const llmResponse = data.choices[0].message.content.trim();
      console.log(`OpenAILLMNode: Received response: \"${llmResponse.substring(0, 50)}\"...`);
      return llmResponse; // Return the LLM's response
    } catch (error) {
      console.error('OpenAILLMNode: Error during API call:', error);
      throw error; // Re-throw to trigger qflow's retry/fallback
    }
  }
}

export class GeminiLLMNode extends AsyncNode {
  async execAsync() {
    const { prompt, apiKey } = this.params; // prompt and apiKey passed via node params

    if (!prompt) {
      throw new Error('Prompt is required for GeminiLLMNode.');
    }
    if (!apiKey) {
      throw new Error('Google Gemini API Key is required.');
    }

    console.log(`GeminiLLMNode: Sending prompt to Gemini: \"${prompt.substring(0, 50)}\"...`);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error.message}`);
      }

      const data = await response.json();
      const llmResponse = data.candidates[0].content.parts[0].text.trim();
      console.log(`GeminiLLMNode: Received response: \"${llmResponse.substring(0, 50)}\"...`);
      return llmResponse; // Return the LLM's response
    } catch (error) {
      console.error('GeminiLLMNode: Error during API call:', error);
      throw error; // Re-throw to trigger qflow's retry/fallback
    }
  }
}