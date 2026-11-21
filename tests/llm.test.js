import { describe, expect, test } from 'bun:test';
import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import {
  AnthropicAdapter,
  GeminiAdapter,
  LLMNode,
  LLMAdapter,
  LLM_CAPABILITY_EVENT,
  LLM_DONE_EVENT,
  LLM_FALLBACK_EVENT,
  LLM_NEGOTIATED_EVENT,
  LLM_RETRY_EVENT,
  LLM_TOOL_CALL_EVENT,
  LLM_USAGE_EVENT,
  OllamaAdapter,
  OpenAICompatibleAdapter,
  listLLMAdapters,
  registerLLMAdapter,
} from '../src/llm/index.js';

class EchoAdapter extends LLMAdapter {
  static id = 'test-echo';

  constructor(options = {}) {
    super({
      ...options,
      capabilities: { streaming: true, toolCalls: true, structuredOutput: true, reasoning: false, tokenUsage: true, cost: false },
    });
    this.calls = 0;
  }

  async complete(request) {
    this.calls += 1;
    return {
      text: `echo:${request.prompt}`,
      reasoning: 'reasoned',
      toolCalls: [{ function: { name: 'echo', arguments: '{"value":"x"}' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    };
  }
}

class FailingAdapter extends LLMAdapter {
  static id = 'test-failing';

  constructor() {
    super({ capabilities: { streaming: false, toolCalls: false, structuredOutput: false, tokenUsage: true } });
    this.calls = 0;
  }

  async complete() {
    this.calls += 1;
    throw new Error('primary down');
  }
}

class FallbackAdapter extends LLMAdapter {
  static id = 'test-fallback';

  constructor() {
    super({ capabilities: { streaming: false, toolCalls: false, structuredOutput: false, tokenUsage: true } });
  }

  async complete() {
    return { text: 'fallback answer' };
  }
}

registerLLMAdapter('test-echo', EchoAdapter);
registerLLMAdapter('test-failing', FailingAdapter);
registerLLMAdapter('test-fallback', FallbackAdapter);

describe('provider-neutral LLM adapters', () => {
  test('ships adapters for every documented provider', () => {
    const ids = listLLMAdapters();
    for (const provider of ['openai', 'anthropic', 'ollama', 'gemini', 'openrouter', 'deepseek']) {
      expect(ids).toContain(provider);
    }
    expect(new OpenAICompatibleAdapter({ provider: 'openai' }).capabilities.toolCalls).toBe(true);
    expect(new AnthropicAdapter({}).capabilities.structuredOutput).toBe(false);
    expect(new OllamaAdapter({}).capabilities.cost).toBe(false);
    expect(new GeminiAdapter({}).capabilities.structuredOutput).toBe(true);
  });

  test('normalizes text, tool calls, usage and cost and emits negotiation events', async () => {
    const adapter = new EchoAdapter();
    const node = new LLMNode({
      adapter,
      provider: 'test-echo',
      model: 'echo-1',
      pricing: { inputPerMillion: 1, outputPerMillion: 2 },
      capabilities: ['toolCalls'],
    });
    const flow = new AsyncFlow(node);
    const events = [];
    for (const name of [LLM_NEGOTIATED_EVENT, LLM_TOOL_CALL_EVENT, LLM_USAGE_EVENT, LLM_DONE_EVENT]) {
      flow.on(name, payload => events.push({ name, payload }));
    }

    const result = await flow.runAsync({ prompt: 'hello' });

    expect(result.text).toBe('echo:hello');
    expect(result.toolCalls[0].function.name).toBe('echo');
    expect(result.usage).toMatchObject({ prompt: 10, completion: 5, total: 15 });
    expect(result.usage.cost).toBeCloseTo(0.00002);
    expect(events.map(entry => entry.name)).toEqual([
      LLM_NEGOTIATED_EVENT,
      LLM_USAGE_EVENT,
      LLM_TOOL_CALL_EVENT,
      LLM_DONE_EVENT,
    ]);
    expect(events[0].payload.missing).toEqual([]);
  });

  test('retries failures, then falls back to the next provider', async () => {
    const node = new LLMNode({
      provider: 'test-failing',
      fallbackProviders: ['test-fallback'],
      model: 'x',
      maxRetries: 2,
    });
    const flow = new AsyncFlow(node);
    const events = [];
    flow.on(LLM_RETRY_EVENT, payload => events.push({ event: LLM_RETRY_EVENT, payload }));
    flow.on(LLM_FALLBACK_EVENT, payload => events.push({ event: LLM_FALLBACK_EVENT, payload }));

    const result = await flow.runAsync({ prompt: 'hello' });

    expect(result.text).toBe('fallback answer');
    expect(result.provider).toBe('test-fallback');
    expect(events.filter(entry => entry.event === LLM_RETRY_EVENT)).toHaveLength(2);
    expect(events.filter(entry => entry.event === LLM_FALLBACK_EVENT)).toHaveLength(1);
  });

  test('reports missing capabilities instead of calling an unsupported adapter', async () => {
    const adapter = new FailingAdapter();
    const node = new LLMNode({ adapter, provider: 'test-failing', model: 'x', tools: [{ name: 'echo' }] });
    const flow = new AsyncFlow(node);
    const capabilityEvents = [];
    flow.on(LLM_CAPABILITY_EVENT, payload => capabilityEvents.push(payload));

    await expect(flow.runAsync({ prompt: 'hello' })).rejects.toMatchObject({
      code: 'QFLOW_LLM_CAPABILITY_MISSING',
    });
    expect(adapter.calls).toBe(0);
    expect(capabilityEvents[0].missing).toEqual(['toolCalls']);
  });

  test('streams text and tool-call deltas through an OpenAI-compatible adapter', async () => {
    const chunks = [
      {
        choices: [{
          delta: { tool_calls: [{ index: 0, id: 'call-1', function: { name: 'echo', arguments: '{"value":' } }] },
        }],
      },
      {
        choices: [{
          delta: { content: 'Hi ', tool_calls: [{ index: 0, function: { arguments: '"stream"}' } }] },
        }],
      },
      {
        choices: [{ delta: { content: 'there' }, finish_reason: 'tool_calls' }],
      },
    ];
    const server = Bun.serve({
      port: 0,
      fetch() {
        const sse = chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n';
        return new Response(sse, { headers: { 'Content-Type': 'text/event-stream' } });
      },
    });

    try {
      const node = new LLMNode({
        provider: 'openai',
        model: 'test-model',
        baseUrl: `http://localhost:${server.port}/v1/chat/completions`,
        stream: true,
      });
      const flow = new AsyncFlow(node);
      const deltas = [];
      const toolEvents = [];
      flow.on('llm:delta', payload => deltas.push(payload.delta));
      flow.on(LLM_TOOL_CALL_EVENT, payload => toolEvents.push(payload));

      const result = await flow.runAsync({ prompt: 'hello' });

      expect(result.text).toBe('Hi there');
      expect(result.finishReason).toBe('tool_calls');
      expect(result.toolCalls[0].function).toEqual({ name: 'echo', arguments: '{"value":"stream"}' });
      expect(deltas.join('')).toBe('Hi there');
      expect(toolEvents).toHaveLength(1);
    } finally {
      server.stop(true);
    }
  });
});

// Keep the base class imported for declaration generation in downstream builds.
export { AsyncNode };
