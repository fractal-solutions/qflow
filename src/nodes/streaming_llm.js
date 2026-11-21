import { AsyncNode } from '../qflow.js';
import {
  LLM_DELTA_EVENT,
  LLM_DONE_EVENT,
  LLM_REASONING_EVENT,
  streamChatCompletions,
} from '../streaming.js';

const INTERNAL_PARAMS = new Set([
  'prompt',
  'messages',
  'apiKey',
  'model',
  'baseUrl',
  'headers',
  'logging',
  'keyword',
  'signal',
  'abortSignal',
]);

/** OpenAI-compatible LLM node that emits `llm:delta` flow events while generating. */
export class StreamingLLMNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: 'streaming_llm',
      description: 'Generates text via an OpenAI-compatible chat API, streaming each token as a flow event.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The prompt to send to the language model.' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Optional chat messages array (takes precedence over prompt).' },
          apiKey: { type: 'string', description: 'API key for the provider.' },
          model: { type: 'string', description: 'Model identifier.' },
          baseUrl: { type: 'string', description: "Provider base URL. Defaults to 'https://api.openai.com/v1'." },
          max_tokens: { type: 'number', description: 'Optional maximum number of tokens to generate.' },
          temperature: { type: 'number', description: 'Optional sampling temperature.' },
        },
        required: ['prompt', 'apiKey', 'model'],
      },
    };
  }

  resolveMessages() {
    const { prompt, messages } = this.params;
    if (messages) {
      if (!Array.isArray(messages)) {
        throw new Error('StreamingLLMNode requires `messages` to be an array.');
      }
      return messages;
    }
    if (!prompt) {
      throw new Error('StreamingLLMNode requires a `prompt` or `messages`.');
    }
    return [{ role: 'user', content: prompt }];
  }

  async execAsync(prepRes, shared, observer = {}) {
    const {
      apiKey,
      model,
      baseUrl = 'https://api.openai.com/v1',
      headers = {},
      signal,
      abortSignal,
    } = this.params;

    if (!apiKey) throw new Error('StreamingLLMNode requires an `apiKey`.');
    if (!model) throw new Error('StreamingLLMNode requires a `model`.');

    const emit = typeof observer.emit === 'function' ? observer.emit : null;
    const metadata = {
      flowId: observer.flowId,
      nodeClass: this.constructor.name,
      model,
    };
    const providerOptions = Object.fromEntries(
      Object.entries(this.params).filter(([key]) => !INTERNAL_PARAMS.has(key))
    );

    const result = await streamChatCompletions({
      url: `${baseUrl.replace(/\/+$/, '')}/chat/completions`,
      apiKey,
      model,
      messages: this.resolveMessages(),
      headers,
      body: providerOptions,
      signal: signal ?? abortSignal,
      onDelta: entry => emit?.(LLM_DELTA_EVENT, { ...metadata, ...entry }),
      onReasoning: entry => emit?.(LLM_REASONING_EVENT, { ...metadata, ...entry }),
    });

    emit?.(LLM_DONE_EVENT, {
      ...metadata,
      text: result.text,
      reasoning: result.reasoning,
      finishReason: result.finishReason,
      usage: result.usage,
    });

    return result.text;
  }

  async postAsync(shared, prepRes, execRes) {
    return execRes;
  }
}

/** Streaming LLM node that reads the agent's stringified conversation history. */
export class AgentStreamingLLMNode extends StreamingLLMNode {
  static getToolDefinition() {
    return {
      ...super.getToolDefinition(),
      name: 'agent_streaming_llm',
      description: 'Streams agent reasoning from a stringified chat history.',
    };
  }

  resolveMessages() {
    const { messages } = this.params;
    if (messages) return super.resolveMessages();

    const { prompt } = this.params;
    if (!prompt) {
      throw new Error('AgentStreamingLLMNode requires a `prompt` with stringified chat history.');
    }

    let parsed;
    try {
      parsed = JSON.parse(prompt);
    } catch (error) {
      throw new Error(`AgentStreamingLLMNode: invalid chat history JSON: ${error.message}`);
    }

    if (!Array.isArray(parsed) || !parsed.every(message => message?.role && message?.content !== undefined)) {
      throw new Error('AgentStreamingLLMNode: expected a JSON array of { role, content } messages.');
    }
    return parsed;
  }

  async postAsync(shared, prepRes, execRes) {
    if (shared) shared.llmResponse = execRes;
    return execRes;
  }
}
