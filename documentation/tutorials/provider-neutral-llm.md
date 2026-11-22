# Tutorial: provider-neutral LLM nodes

`LLMNode` replaces one class per vendor. A single node handles OpenAI-compatible APIs, Anthropic, Ollama, Gemini, and your own adapters, with the same normalized result and the same events.

## 1. Pick a built-in adapter

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { LLMNode, listLLMAdapters } from '@fractal-solutions/qflow/llm';

console.log(listLLMAdapters());
// anthropic, deepseek, gemini, groq, huggingface, ollama, openai, openai-compatible, openrouter, together

const llm = new LLMNode({
  provider: 'openai',                       // or 'anthropic', 'ollama', 'gemini', ...
  model: 'gpt-4o-mini',
  apiKey: Bun.env.OPENAI_API_KEY,
  pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
});

const result = await new AsyncFlow(llm).runAsync({ prompt: 'Explain qflow in one sentence.' });
console.log(result.text, result.usage?.cost);
```

The result is always normalized:

```javascript
{
  text, reasoning, toolCalls, finishReason,
  usage: { prompt, completion, total, cost, raw },
  cost, raw, provider, model,
}
```

The node also writes `shared.llmResult`, `shared.llmUsage`, `shared.llmToolCalls` and `shared.llmCost`.

## 2. Override the request per run

Constructor options are the default. `setParams()` overrides them, and `shared.llm` overrides again — useful for per-user models or budgets:

```javascript
const flow = new AsyncFlow(new LLMNode({ provider: 'openai', model: 'gpt-4o-mini' }));
await flow.runAsync({
  prompt: 'Summarize this release.',
  llm: { model: 'gpt-4o', maxRetries: 3 },
});
```

## 3. Stream tokens as flow events

```javascript
const llm = new LLMNode({ provider: 'openai', model: 'gpt-4o-mini', stream: true });
const flow = new AsyncFlow(llm);

flow.on('llm:delta', ({ delta }) => process.stdout.write(delta));
flow.on('llm:reasoning', ({ delta }) => console.error('[reasoning]', delta));
flow.on('llm:usage', ({ usage }) => console.error('tokens:', usage.prompt, usage.completion));

await flow.runAsync({ prompt: 'Write a haiku about workflows.' });
```

Events you can listen for: `llm:negotiated`, `llm:capability`, `llm:delta`, `llm:reasoning`, `llm:done`, `llm:usage`, `llm:tool_call`, `llm:retry`, `llm:fallback`.

## 4. Capability negotiation fails before the API call

```javascript
const llm = new LLMNode({
  provider: 'anthropic',
  model: 'claude-3-5-haiku-latest',
  requireCapabilities: ['streaming', 'toolCalls'],
  stream: true,
});
const flow = new AsyncFlow(llm);
flow.on('llm:capability', event => console.log('missing:', event.missing));
// If an adapter lacks a requested capability, the node emits llm:capability,
// sets error.code = 'QFLOW_LLM_CAPABILITY_MISSING', and tries the next provider.
```

`requireCapabilities` is a fallback name; `capabilities` wins when both are supplied. Requesting `stream`, `tools`, `responseFormat`, or `includeReasoning` automatically adds the matching capability.

## 5. Retries and fallback providers

```javascript
const llm = new LLMNode({
  provider: 'openai',
  model: 'gpt-4o-mini',
  maxRetries: 2,
  wait: 1,                          // seconds between attempts
  fallbackProviders: ['ollama'],
});

const flow = new AsyncFlow(llm);
flow.on('llm:retry', ({ provider, attempt, error }) =>
  console.log(`${provider} attempt ${attempt} failed: ${error.message}`));
flow.on('llm:fallback', ({ from, to }) => console.log(`falling back ${from} -> ${to}`));

await flow.runAsync({ prompt: 'Hello' });
```

Each failed attempt emits `llm:retry`. When a provider is exhausted, `llm:fallback` fires before the next provider is tried. If all providers fail, the last error is thrown.

## 6. Register your own adapter

An adapter needs `complete()`; add `stream()` if you advertise streaming. Capabilities default to all `false`, so declare what you support.

```javascript
import { LLMAdapter, LLMNode, registerLLMAdapter } from '@fractal-solutions/qflow/llm';

class EchoAdapter extends LLMAdapter {
  static id = 'echo';

  constructor(options = {}) {
    super({ ...options, capabilities: { streaming: false, tokenUsage: true } });
  }

  async complete(request) {
    return {
      text: `echo: ${request.prompt}`,
      usage: { prompt_tokens: 4, completion_tokens: 3 },
    };
  }
}

registerLLMAdapter('echo', EchoAdapter);

const llm = new LLMNode({ provider: 'echo', model: 'echo-1' });
await new AsyncFlow(llm).runAsync({ prompt: 'hello' }); // result.text === 'echo: hello'
```

You can also pass an adapter instance directly: `new LLMNode({ provider: 'my-id', adapter: new EchoAdapter() })`. A truthy `provider` is still required when using a custom adapter.

## 7. Tool calls

```javascript
const llm = new LLMNode({
  provider: 'openai',
  model: 'gpt-4o-mini',
  tools: registry.llmTools(),       // from ToolRegistry
});

const result = await new AsyncFlow(llm).runAsync({ prompt: 'Search the docs for replay.' });
for (const call of result.toolCalls) {
  console.log(call.function.name, JSON.parse(call.function.arguments));
}
```

Tool calls are normalized to `{ index, id, type, function: { name, arguments } }` with `arguments` always a string. See [MCP tool servers and clients](mcp.md) for where `registry.llmTools()` comes from.

## 8. Cost accounting

`pricing` accepts `{ inputPerMillion, outputPerMillion, ... }` or a function `({ provider, model, usage }) => number`. A `cost` returned by the provider wins. Listen for `llm:usage` to aggregate spend per run.

## Next

- [Agent strategies as flows](agent-flows.md) — note that `AgentEngine` expects raw JSON completion text, so unwrap `LLMNode`'s normalized result when wiring it into an agent (the [working example](../../examples/v2/unified-tool-contract.js) shows the small subclass).
- [Trace-driven evaluation](trace-driven-eval.md) — turn usage and output events into regression tests.
