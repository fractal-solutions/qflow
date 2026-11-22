import { AsyncNode } from '../qflow.js';
import { resolveTemplate, stableHash } from '../util.js';
import {
  streamChatCompletions,
  LLM_DELTA_EVENT,
  LLM_REASONING_EVENT,
  LLM_DONE_EVENT,
} from '../streaming.js';

export { LLM_DELTA_EVENT, LLM_REASONING_EVENT, LLM_DONE_EVENT };

export const LLM_RETRY_EVENT = 'llm:retry';
export const LLM_FALLBACK_EVENT = 'llm:fallback';
export const LLM_NEGOTIATED_EVENT = 'llm:negotiated';
export const LLM_CAPABILITY_EVENT = 'llm:capability';
export const LLM_USAGE_EVENT = 'llm:usage';
export const LLM_TOOL_CALL_EVENT = 'llm:tool_call';
export const LLM_CACHE_HIT_EVENT = 'llm:cache_hit';

export const LLM_EVENTS = {
  delta: LLM_DELTA_EVENT,
  reasoning: LLM_REASONING_EVENT,
  done: LLM_DONE_EVENT,
  retry: LLM_RETRY_EVENT,
  fallback: LLM_FALLBACK_EVENT,
  negotiated: LLM_NEGOTIATED_EVENT,
  capability: LLM_CAPABILITY_EVENT,
  usage: LLM_USAGE_EVENT,
  toolCall: LLM_TOOL_CALL_EVENT,
  cacheHit: LLM_CACHE_HIT_EVENT,
};

const DEFAULT_URLS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  huggingface: 'https://router.huggingface.co/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  together: 'https://api.together.xyz/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  ollama: 'http://localhost:11434/api/chat',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
};

const DEFAULT_CAPABILITIES = {
  streaming: false,
  toolCalls: false,
  structuredOutput: false,
  reasoning: false,
  tokenUsage: false,
  cost: false,
};

const OPENAI_CAPABILITIES = {
  streaming: true,
  toolCalls: true,
  structuredOutput: true,
  reasoning: true,
  tokenUsage: true,
  cost: true,
};

function toMessages(request = {}) {
  if (Array.isArray(request.messages)) return request.messages;
  return [{ role: 'user', content: String(request.prompt ?? '') }];
}

function serializeTool(tool) {
  if (!tool) return null;
  if (typeof tool.getToolDefinition === 'function') return tool.getToolDefinition();
  if (typeof tool.definition === 'function') return tool.definition();
  if (tool.function?.parameters || tool.function?.name) return tool.function;
  return tool;
}

function normalizeToolCalls(calls = []) {
  return (Array.isArray(calls) ? calls : [])
    .filter(call => call?.function?.name || call?.name || call?.id)
    .map(call => ({
      index: call.index ?? 0,
      id: call.id ?? null,
      type: call.type ?? 'function',
      function: {
        name: call.function?.name ?? call.name ?? '',
        arguments: typeof call.function?.arguments === 'string'
          ? call.function.arguments
          : JSON.stringify(call.function?.arguments ?? call.input ?? call.arguments ?? {}),
      },
    }));
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function normalizeUsage(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const prompt = finite(
    raw.prompt_tokens ?? raw.promptTokenCount ?? raw.input_tokens ?? raw.prompt_eval_count ?? raw.input
  );
  const completion = finite(
    raw.completion_tokens ?? raw.candidatesTokenCount ?? raw.output_tokens ?? raw.eval_count ?? raw.output
  );
  return {
    prompt,
    completion,
    total: finite(raw.total_tokens ?? raw.totalTokenCount ?? raw.total) || prompt + completion,
    raw,
  };
}

export function normalizeCompletion(raw, provider = 'unknown') {
  const result = typeof raw === 'string' ? { text: raw } : raw ?? {};
  const choice = result.choices?.[0] ?? {};
  const message = choice.message ?? {};
  const rawText = result.text ?? message.content ?? choice.text ?? '';
  const text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);

  return {
    text,
    reasoning: String(result.reasoning ?? message.reasoning_content ?? message.reasoning ?? ''),
    toolCalls: normalizeToolCalls(
      result.toolCalls ?? result.tool_calls ?? message.tool_calls ?? choice.delta?.tool_calls ?? []
    ),
    usage: normalizeUsage(result.usage ?? result.usageMetadata),
    finishReason: result.finishReason ?? choice.finish_reason ?? result.stopReason ?? null,
    cost: result.cost ?? null,
    raw: result.raw ?? result,
  };
}

export async function resolveCost({ provider, model, usage, pricing = null, result = null }) {
  if (result?.cost != null) return result.cost;
  if (typeof pricing === 'function') {
    return await pricing({ provider, model, usage });
  }
  if (!pricing || typeof pricing !== 'object' || !usage) return null;

  const inputPerMillion = pricing.inputPerMillion ?? pricing.input ?? pricing.prompt ?? 0;
  const outputPerMillion = pricing.outputPerMillion ?? pricing.output ?? pricing.completion ?? 0;
  return (finite(usage.prompt) / 1_000_000) * inputPerMillion
    + (finite(usage.completion) / 1_000_000) * outputPerMillion;
}

function openAITool(tool) {
  const definition = serializeTool(tool);
  if (!definition?.function && !definition?.name) return definition;
  const fn = definition.function ?? definition;
  return {
    type: 'function',
    function: {
      name: fn.name,
      description: fn.description ?? '',
      parameters: fn.parameters ?? definition.parameters ?? { type: 'object', properties: {} },
    },
  };
}

async function readSSE(response, onData) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Provider returned no streaming body.');
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;

  while (!done) {
    const { done: streamDone, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !streamDone });
    let newline = buffer.indexOf('\n');
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith('data:')) {
        if (reader.read && line === '[DONE]') done = true;
        newline = buffer.indexOf('\n');
        continue;
      }
      const data = line.slice(5).trim();
      if (data === '[DONE]') {
        done = true;
        break;
      }
      try {
        onData(JSON.parse(data));
      } catch {
        // Ignore malformed keep-alive payloads.
      }
      newline = buffer.indexOf('\n');
    }
    if (streamDone) {
      if (buffer.trim().startsWith('data:')) {
        const data = buffer.trim().slice(5).trim();
        if (data !== '[DONE]') {
          try {
            onData(JSON.parse(data));
          } catch {}
        }
      }
      break;
    }
  }
  reader.releaseLock?.();
}

async function readJsonLines(response, onObject) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Provider returned no streaming body.');
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    let newline = buffer.indexOf('\n');
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        try {
          onObject(JSON.parse(line));
        } catch {}
      }
      newline = buffer.indexOf('\n');
    }
    if (done) break;
  }
  if (buffer.trim()) {
    try {
      onObject(JSON.parse(buffer.trim()));
    } catch {}
  }
  reader.releaseLock?.();
}

async function throwProviderError(response, provider) {
  let detail;
  try {
    detail = await response.json();
  } catch {
    detail = await response.text();
  }
  const message = detail?.error?.message ?? detail?.message ?? JSON.stringify(detail);
  throw new Error(`${provider} LLM request failed (${response.status}): ${message}`);
}

/** Base class for provider-neutral adapters. */
export class LLMAdapter {
  static id = 'base';

  constructor(options = {}) {
    this.options = options;
    this.provider = options.provider ?? this.constructor.id;
    this.capabilities = { ...DEFAULT_CAPABILITIES, ...(options.capabilities ?? {}) };
  }

  get id() {
    return this.options.id ?? this.provider ?? this.constructor.id;
  }

  requireModel(request) {
    const model = request.model ?? this.options.model;
    if (!model) throw new Error(`LLM adapter '${this.id}' requires a model.`);
    return model;
  }

  async complete() {
    throw new Error(`LLM adapter '${this.id}' does not implement complete().`);
  }

  async stream(request, context = {}) {
    const result = await this.complete(request, context);
    if (result.text && typeof context.onDelta === 'function') {
      context.onDelta({ delta: result.text, text: result.text, index: 0, raw: result.raw });
    }
    return result;
  }
}

/** OpenAI-compatible dialect: OpenAI, DeepSeek, OpenRouter, Hugging Face, Groq, Together. */
export class OpenAICompatibleAdapter extends LLMAdapter {
  static id = 'openai-compatible';

  constructor(options = {}) {
    super({ ...options, capabilities: { ...OPENAI_CAPABILITIES, ...(options.capabilities ?? {}) } });
    this.provider = options.provider ?? 'openai';
    this.baseUrl = options.baseUrl ?? DEFAULT_URLS[this.provider] ?? DEFAULT_URLS.openai;
  }

  get id() {
    return this.options.id ?? this.provider;
  }

  buildPayload(request) {
    const payload = {
      model: this.requireModel(request),
      messages: toMessages(request),
      ...(request.options ?? {}),
    };
    const tools = (request.tools ?? []).map(openAITool).filter(Boolean);
    if (tools.length) payload.tools = tools;
    if (request.toolChoice) payload.tool_choice = request.toolChoice;
    if (request.responseFormat) payload.response_format = request.responseFormat;
    return payload;
  }

  buildHeaders(request) {
    const apiKey = request.apiKey ?? this.options.apiKey;
    return {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...(this.options.headers ?? {}),
      ...(request.headers ?? {}),
    };
  }

  url(request) {
    return request.baseUrl ?? this.baseUrl;
  }

  async complete(request, context = {}) {
    const response = await fetch(this.url(request), {
      method: 'POST',
      headers: this.buildHeaders(request),
      body: JSON.stringify(this.buildPayload(request)),
      signal: context.signal,
    });
    if (!response.ok) await throwProviderError(response, this.id);
    const data = await response.json();
    return normalizeCompletion(data, this.id);
  }

  async stream(request, context = {}) {
    const result = await streamChatCompletions({
      url: this.url(request),
      apiKey: request.apiKey ?? this.options.apiKey,
      model: this.requireModel(request),
      messages: toMessages(request),
      headers: { ...(this.options.headers ?? {}), ...(request.headers ?? {}) },
      body: this.buildPayload(request),
      signal: context.signal,
      onDelta: context.onDelta,
      onReasoning: context.onReasoning,
    });
    return normalizeCompletion(result, this.id);
  }
}

function anthropicTool(tool) {
  const definition = serializeTool(tool);
  const fn = definition?.function ?? definition;
  if (!fn?.name) return null;
  return {
    name: fn.name,
    description: fn.description ?? '',
    input_schema: fn.parameters ?? definition.parameters ?? { type: 'object', properties: {} },
  };
}

export class AnthropicAdapter extends LLMAdapter {
  static id = 'anthropic';

  constructor(options = {}) {
    super({
      ...options,
      capabilities: { streaming: true, toolCalls: true, structuredOutput: false, reasoning: false, tokenUsage: true, cost: true, ...(options.capabilities ?? {}) },
    });
    this.baseUrl = options.baseUrl ?? DEFAULT_URLS.anthropic;
  }

  buildPayload(request) {
    const messages = toMessages(request);
    const system = messages.filter(message => message.role === 'system').map(message => message.content).join('\n');
    const conversation = messages.filter(message => message.role !== 'system');
    const tools = (request.tools ?? []).map(anthropicTool).filter(Boolean);
    return {
      model: this.requireModel(request),
      messages: conversation,
      max_tokens: request.max_tokens ?? request.maxTokens ?? this.options.maxTokens ?? 4096,
      ...(system ? { system } : {}),
      ...(tools.length ? { tools } : {}),
      ...(request.toolChoice ? { tool_choice: request.toolChoice } : {}),
      ...(request.options ?? {}),
    };
  }

  buildHeaders(request) {
    const apiKey = request.apiKey ?? this.options.apiKey;
    return {
      'Content-Type': 'application/json',
      'anthropic-version': request.anthropicVersion ?? this.options.anthropicVersion ?? '2023-06-01',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
      ...(this.options.headers ?? {}),
      ...(request.headers ?? {}),
    };
  }

  url() {
    return this.baseUrl;
  }

  async complete(request, context = {}) {
    const response = await fetch(this.url(request), {
      method: 'POST',
      headers: this.buildHeaders(request),
      body: JSON.stringify(this.buildPayload(request)),
      signal: context.signal,
    });
    if (!response.ok) await throwProviderError(response, this.id);
    const data = await response.json();
    const parts = data.content ?? [];
    return normalizeCompletion({
      text: parts.filter(part => part.type === 'text').map(part => part.text).join(''),
      toolCalls: parts.filter(part => part.type === 'tool_use').map(part => ({
        id: part.id,
        function: { name: part.name, arguments: part.input ?? {} },
      })),
      usage: data.usage,
      finishReason: data.stop_reason,
      raw: data,
    }, this.id);
  }

  async stream(request, context = {}) {
    const response = await fetch(this.url(request), {
      method: 'POST',
      headers: { ...this.buildHeaders(request), Accept: 'text/event-stream' },
      body: JSON.stringify({ ...this.buildPayload(request), stream: true }),
      signal: context.signal,
    });
    if (!response.ok) await throwProviderError(response, this.id);

    const state = {
      text: '',
      toolCalls: [],
      usage: null,
      finishReason: null,
      toolBuffers: new Map(),
      done: false,
    };

    await readSSE(response, event => {
      if (event.type === 'message_start') state.usage = event.message?.usage ?? null;
      if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
        state.toolBuffers.set(event.index, {
          index: event.index,
          id: event.content_block.id,
          name: event.content_block.name,
          input: '',
        });
      }
      if (event.type === 'content_block_delta') {
        if (event.delta?.type === 'text_delta' && event.delta.text) {
          state.text += event.delta.text;
          context.onDelta?.({
            delta: event.delta.text,
            text: state.text,
            index: event.index,
            raw: event,
          });
        }
        if (event.delta?.type === 'input_json_delta') {
          const buffer = state.toolBuffers.get(event.index);
          if (buffer) buffer.input += event.delta.partial_json ?? '';
        }
      }
      if (event.type === 'message_delta') {
        state.finishReason = event.delta?.stop_reason ?? state.finishReason;
        state.usage = { ...(state.usage ?? {}), ...(event.usage ?? {}) };
      }
      if (event.type === 'message_stop') state.done = true;
    });

    const toolCalls = [...state.toolBuffers.values()].map(buffer => {
      let input = {};
      try {
        input = buffer.input ? JSON.parse(buffer.input) : {};
      } catch {}
      return { index: buffer.index, id: buffer.id, function: { name: buffer.name, arguments: input } };
    });

    return normalizeCompletion({
      text: state.text,
      toolCalls,
      usage: state.usage,
      finishReason: state.finishReason,
      raw: state,
    }, this.id);
  }
}

function ollamaTool(tool) {
  const definition = serializeTool(tool);
  const fn = definition?.function ?? definition;
  if (!fn?.name) return null;
  return {
    type: 'function',
    function: {
      name: fn.name,
      description: fn.description ?? '',
      parameters: fn.parameters ?? definition.parameters ?? { type: 'object', properties: {} },
    },
  };
}

export class OllamaAdapter extends LLMAdapter {
  static id = 'ollama';

  constructor(options = {}) {
    super({
      ...options,
      capabilities: { streaming: true, toolCalls: true, structuredOutput: true, reasoning: false, tokenUsage: true, cost: false, ...(options.capabilities ?? {}) },
    });
    this.baseUrl = options.baseUrl ?? DEFAULT_URLS.ollama;
  }

  buildPayload(request) {
    const tools = (request.tools ?? []).map(ollamaTool).filter(Boolean);
    const format = request.format ?? request.responseFormat;
    return {
      model: this.requireModel(request),
      messages: toMessages(request),
      stream: false,
      ...(tools.length ? { tools } : {}),
      ...(format ? { format } : {}),
      ...(request.options ?? {}),
    };
  }

  url(request) {
    return request.baseUrl ?? this.baseUrl;
  }

  buildHeaders(request) {
    const apiKey = request.apiKey ?? this.options.apiKey;
    return {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...(this.options.headers ?? {}),
      ...(request.headers ?? {}),
    };
  }

  async complete(request, context = {}) {
    const response = await fetch(this.url(request), {
      method: 'POST',
      headers: this.buildHeaders(request),
      body: JSON.stringify(this.buildPayload(request)),
      signal: context.signal,
    });
    if (!response.ok) await throwProviderError(response, this.id);
    const data = await response.json();
    return normalizeCompletion({
      text: data.message?.content ?? data.response ?? '',
      toolCalls: data.message?.tool_calls ?? [],
      usage: { prompt_eval_count: data.prompt_eval_count, eval_count: data.eval_count, total: data.eval_count ? data.prompt_eval_count + data.eval_count : undefined },
      finishReason: data.done ? 'stop' : null,
      raw: data,
    }, this.id);
  }

  async stream(request, context = {}) {
    const response = await fetch(this.url(request), {
      method: 'POST',
      headers: this.buildHeaders(request),
      body: JSON.stringify({ ...this.buildPayload(request), stream: true }),
      signal: context.signal,
    });
    if (!response.ok) await throwProviderError(response, this.id);

    const state = { text: '', toolCalls: [], usage: null, finishReason: null };
    await readJsonLines(response, event => {
      const delta = event.message?.content ?? event.response ?? '';
      if (delta) {
        state.text += delta;
        context.onDelta?.({ delta, text: state.text, raw: event });
      }
      const calls = normalizeToolCalls(event.message?.tool_calls ?? []);
      for (const call of calls) {
        const existing = state.toolCalls.find(entry => entry.index === call.index);
        if (existing) existing.function.arguments += call.function.arguments;
        else state.toolCalls.push(call);
      }
      if (event.prompt_eval_count || event.eval_count) {
        state.usage = {
          prompt_eval_count: event.prompt_eval_count,
          eval_count: event.eval_count,
          total: (event.prompt_eval_count ?? 0) + (event.eval_count ?? 0),
        };
      }
      if (event.done) state.finishReason = 'stop';
    });

    return normalizeCompletion({ ...state, raw: state }, this.id);
  }
}

function geminiContents(messages) {
  return messages
    .filter(message => message.role !== 'system')
    .map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }],
    }));
}

function geminiTool(tool) {
  const definition = serializeTool(tool);
  const fn = definition?.function ?? definition;
  if (!fn?.name) return null;
  return {
    functionDeclarations: [{
      name: fn.name,
      description: fn.description ?? '',
      parameters: fn.parameters ?? definition.parameters ?? { type: 'object', properties: {} },
    }],
  };
}

export class GeminiAdapter extends LLMAdapter {
  static id = 'gemini';

  constructor(options = {}) {
    super({
      ...options,
      capabilities: { streaming: true, toolCalls: true, structuredOutput: true, reasoning: false, tokenUsage: true, cost: false, ...(options.capabilities ?? {}) },
    });
    this.baseUrl = options.baseUrl ?? DEFAULT_URLS.gemini;
  }

  buildUrl(request, { stream = false } = {}) {
    const model = this.requireModel(request);
    const apiKey = request.apiKey ?? this.options.apiKey;
    const action = stream ? 'streamGenerateContent' : 'generateContent';
    const url = `${request.baseUrl ?? this.baseUrl}/${model}:${action}`;
    return apiKey ? `${url}?alt=${stream ? 'sse' : 'json'}&key=${encodeURIComponent(apiKey)}` : `${url}?alt=${stream ? 'sse' : 'json'}`;
  }

  buildPayload(request) {
    const messages = toMessages(request);
    const system = messages.filter(message => message.role === 'system').map(message => message.content).join('\n');
    const tools = (request.tools ?? []).map(geminiTool).filter(Boolean);
    const responseFormat = request.responseFormat ?? request.format;
    const generationConfig = { ...(request.options ?? {}) };
    if (responseFormat?.type === 'json_object' || responseFormat?.mimeType) {
      generationConfig.responseMimeType = 'application/json';
    }
    if (responseFormat?.schema) generationConfig.responseSchema = responseFormat.schema;

    return {
      contents: geminiContents(messages),
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      ...(tools.length ? { tools } : {}),
      ...(Object.keys(generationConfig).length ? { generationConfig } : {}),
    };
  }

  normalize(data) {
    const candidate = data.candidates?.[0] ?? {};
    const parts = candidate.content?.parts ?? [];
    return normalizeCompletion({
      text: parts.filter(part => typeof part.text === 'string').map(part => part.text).join(''),
      toolCalls: parts.filter(part => part.functionCall).map(part => ({
        function: { name: part.functionCall.name, arguments: part.functionCall.args ?? {} },
      })),
      usage: data.usageMetadata,
      finishReason: candidate.finishReason ?? null,
      raw: data,
    }, this.id);
  }

  async complete(request, context = {}) {
    const response = await fetch(this.buildUrl(request), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(this.options.headers ?? {}), ...(request.headers ?? {}) },
      body: JSON.stringify(this.buildPayload(request)),
      signal: context.signal,
    });
    if (!response.ok) await throwProviderError(response, this.id);
    return this.normalize(await response.json());
  }

  async stream(request, context = {}) {
    const response = await fetch(this.buildUrl(request, { stream: true }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(this.options.headers ?? {}), ...(request.headers ?? {}) },
      body: JSON.stringify(this.buildPayload(request)),
      signal: context.signal,
    });
    if (!response.ok) await throwProviderError(response, this.id);

    const state = { text: '', toolCalls: [], usage: null, finishReason: null, raw: [] };
    await readSSE(response, chunk => {
      state.raw.push(chunk);
      const candidate = chunk.candidates?.[0] ?? {};
      const parts = candidate.content?.parts ?? [];
      for (const part of parts) {
        if (typeof part.text === 'string' && part.text) {
          state.text += part.text;
          context.onDelta?.({ delta: part.text, text: state.text, raw: chunk });
        }
        if (part.functionCall) {
          state.toolCalls.push({ function: { name: part.functionCall.name, arguments: part.functionCall.args ?? {} } });
        }
      }
      if (chunk.usageMetadata) state.usage = chunk.usageMetadata;
      if (candidate.finishReason) state.finishReason = candidate.finishReason;
    });

    return normalizeCompletion({ ...state, raw: state.raw }, this.id);
  }
}

export const llmAdapters = new Map();

export function registerLLMAdapter(id, adapter) {
  if (!id || (typeof adapter !== 'function' && typeof adapter?.complete !== 'function')) {
    throw new Error("registerLLMAdapter(id, adapter) requires an id and an adapter with complete().");
  }
  llmAdapters.set(id, adapter);
  return adapter;
}

for (const [id, adapter] of [
  ['openai', OpenAICompatibleAdapter],
  ['deepseek', OpenAICompatibleAdapter],
  ['openrouter', OpenAICompatibleAdapter],
  ['huggingface', OpenAICompatibleAdapter],
  ['groq', OpenAICompatibleAdapter],
  ['together', OpenAICompatibleAdapter],
  ['openai-compatible', OpenAICompatibleAdapter],
  ['anthropic', AnthropicAdapter],
  ['ollama', OllamaAdapter],
  ['gemini', GeminiAdapter],
]) {
  registerLLMAdapter(id, adapter);
}

export function listLLMAdapters() {
  return [...llmAdapters.keys()].sort();
}

export function resolveLLMAdapter(provider, options = {}) {
  if (provider && typeof provider === 'object' && typeof provider.complete === 'function') return provider;
  const Adapter = llmAdapters.get(provider);
  if (!Adapter) {
    throw new Error(`Unknown LLM provider '${provider}'. Available: ${listLLMAdapters().join(', ')}`);
  }
  if (typeof Adapter === 'function') return new Adapter({ ...options, provider });
  return Adapter;
}

export function negotiateCapabilities(adapter, requested = []) {
  const supported = adapter?.capabilities ?? DEFAULT_CAPABILITIES;
  return {
    provider: adapter?.id ?? adapter?.constructor?.id ?? 'unknown',
    requested: [...requested],
    supported: { ...supported },
    missing: requested.filter(capability => !supported[capability]),
  };
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Accept a cache object, or build one from a durable checkpointer. */
function resolveLLMCache(request, shared, observer = {}) {
  const cache = request.cache ?? shared.llmCache ?? null;
  if (!cache) return null;
  if (typeof cache.get === 'function' && typeof cache.set === 'function') return cache;
  if (cache === true) {
    const checkpointer = request.checkpointer ?? observer.checkpointer ?? shared.checkpointer;
    if (checkpointer && typeof checkpointer.cacheGet === 'function' && typeof checkpointer.cacheSet === 'function') {
      return {
        get: key => checkpointer.cacheGet('llm', key),
        set: (key, value, ttlMs) => checkpointer.cacheSet('llm', key, value, ttlMs),
      };
    }
  }
  throw new Error('LLMNode caching requires a cache object or a checkpointer with cacheGet/cacheSet().');
}

/** Stable cache key: explicit template/function, or a hash of the request. */
export function buildLLMCacheKey(request, shared = {}) {
  if (typeof request.cacheKey === 'function') {
    return String(request.cacheKey({ request, shared }));
  }
  const template = request.cacheKey ?? request.operationId;
  if (typeof template === 'string' && template.includes('{{')) {
    const rendered = resolveTemplate(template, { ...shared, ...request, shared });
    if (rendered.trim()) return rendered;
  }
  return `llm:${stableHash({
    provider: request.provider,
    model: request.model,
    messages: Array.isArray(request.messages)
      ? request.messages
      : [{ role: 'user', content: String(request.prompt ?? '') }],
    tools: request.tools ?? null,
    responseFormat: request.responseFormat ?? null,
    temperature: request.temperature ?? null,
    maxTokens: request.maxTokens ?? null,
  })}`;
}

/** One LLM node for every provider, with retries, fallbacks and usage events. */
export class LLMNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: 'llm',
      description: 'Runs a provider-neutral LLM completion with retries and fallbacks.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Prompt to send to the model.' },
          messages: { type: 'array', description: 'Chat messages to send to the model.' },
          provider: { type: 'string', description: 'Adapter id (openai, anthropic, ollama, gemini, ...).' },
          model: { type: 'string', description: 'Model name.' },
          fallbackProviders: { type: 'array', items: { type: 'string' } },
        },
        required: ['prompt'],
      },
    };
  }

  constructor(options = {}) {
    super(options.maxRetries ?? 1, options.wait ?? 0);
    this.options = { ...options };
  }

  async prepAsync(shared = {}, observer = {}) {
    const request = {
      ...this.options,
      ...this.params,
      ...(shared.llm ?? {}),
    };
    const prompt = request.prompt ?? shared.prompt;
    const messages = request.messages ?? shared.messages;
    if (!prompt && !Array.isArray(messages)) {
      throw new Error('LLMNode requires a prompt or messages.');
    }
    return { request: { ...request, prompt, messages }, shared };
  }

  async execAsync(prepRes, _shared, observer = {}) {
    const request = prepRes.request;
    const providers = [request.provider, ...(request.fallbackProviders ?? [])].filter(Boolean);
    if (!providers.length) throw new Error('LLMNode requires a provider or an adapter.');

    const cache = resolveLLMCache(request, prepRes.shared ?? {}, observer);
    const cacheKey = cache ? buildLLMCacheKey(request, prepRes.shared ?? {}) : null;
    if (cache) {
      const hit = await cache.get(cacheKey);
      if (hit) {
        observer.emit?.(LLM_CACHE_HIT_EVENT, {
          key: cacheKey,
          provider: hit.provider ?? providers[0],
          model: hit.model ?? request.model ?? null,
        });
        return hit;
      }
    }

    const requested = new Set(request.capabilities ?? request.requireCapabilities ?? []);
    if (request.stream) requested.add('streaming');
    if (request.tools?.length) requested.add('toolCalls');
    if (request.responseFormat) requested.add('structuredOutput');
    if (request.includeReasoning) requested.add('reasoning');

    let lastError = null;

    for (let providerIndex = 0; providerIndex < providers.length; providerIndex += 1) {
      const provider = providers[providerIndex];
      let adapter;
      try {
        adapter = providerIndex === 0 && request.adapter
          ? request.adapter
          : resolveLLMAdapter(provider, request);
      } catch (error) {
        lastError = error;
        continue;
      }

      const negotiation = negotiateCapabilities(adapter, [...requested]);
      observer.emit?.(LLM_NEGOTIATED_EVENT, negotiation);
      if (negotiation.missing.length) {
        const error = new Error(
          `Provider '${provider}' does not support required LLM capabilities: ${negotiation.missing.join(', ')}.`
        );
        error.code = 'QFLOW_LLM_CAPABILITY_MISSING';
        observer.emit?.(LLM_CAPABILITY_EVENT, { ...negotiation, provider });
        lastError = error;
        continue;
      }

      const maxAttempts = Math.max(1, request.maxRetries ?? this.maxRetries ?? 1);
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const raw = request.stream
            ? await adapter.stream(request, {
                signal: observer.signal ?? request.signal,
                onDelta: entry => {
                  observer.emit?.(LLM_DELTA_EVENT, { ...entry, provider, model: request.model });
                  request.onDelta?.(entry);
                },
                onReasoning: entry => {
                  observer.emit?.(LLM_REASONING_EVENT, { ...entry, provider, model: request.model });
                  request.onReasoning?.(entry);
                },
              })
            : await adapter.complete(request, { signal: observer.signal ?? request.signal });

          const result = normalizeCompletion(raw, provider);
          result.provider = provider;
          result.model = request.model ?? adapter.options?.model ?? null;
          const usage = result.usage
            ? {
                ...result.usage,
                cost: await resolveCost({ provider, model: result.model, usage: result.usage, pricing: request.pricing, result }),
              }
            : null;
          result.usage = usage;
          result.cost = usage?.cost ?? null;

          observer.emit?.(LLM_USAGE_EVENT, { provider, model: result.model, usage });
          if (result.toolCalls.length) {
            observer.emit?.(LLM_TOOL_CALL_EVENT, { provider, toolCalls: result.toolCalls });
          }
          observer.emit?.(LLM_DONE_EVENT, {
            provider,
            model: result.model,
            text: result.text,
            reasoning: result.reasoning,
            finishReason: result.finishReason,
            usage,
          });

          if (request.budget && typeof request.budget.record === 'function') {
            request.budget.record(result.usage, result.cost);
            if (typeof request.budget.assertWithin === 'function') {
              request.budget.assertWithin({ steps: (prepRes.shared ?? {}).agentFlowSteps ?? 0 });
            }
          }
          if (cache) await cache.set(cacheKey, result, request.cacheTtlMs ?? null);
          return result;
        } catch (error) {
          lastError = error;
          observer.emit?.(LLM_RETRY_EVENT, {
            provider,
            attempt,
            maxRetries: maxAttempts,
            error: { message: error.message },
          });
          if (attempt < maxAttempts && request.wait) await delay(request.wait);
        }
      }

      if (providerIndex < providers.length - 1) {
        observer.emit?.(LLM_FALLBACK_EVENT, {
          from: provider,
          to: providers[providerIndex + 1],
          error: { message: lastError?.message ?? 'Unknown LLM error' },
        });
      }
    }

    throw lastError ?? new Error('LLMNode could not complete the request.');
  }

  async postAsync(shared, prepRes, execRes) {
    shared.llmResult = execRes;
    shared.llmUsage = execRes?.usage ?? null;
    shared.llmToolCalls = execRes?.toolCalls ?? [];
    shared.llmCost = execRes?.cost ?? null;
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}
