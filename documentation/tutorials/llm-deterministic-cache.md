# Tutorial: deterministic LLM replay and caching

Durable flows solve "what step are we on?". They do not solve "the model gave a
different answer this time". That matters in two situations:

- **Replay after a crash:** a checkpoint says the LLM node finished, but the
  provider call itself is not checkpointed. Calling it again costs money and
  can produce different text.
- **Multiple workers:** two workers processing the same request should not each
  pay for an identical completion.

`LLMNode` can cache normalized completions in a store. On a hit it returns the
recorded result immediately and emits `llm:cache_hit`, before capability
negotiation or billing.

> **Why cache *normalized* results?** Downstream nodes and traces should see
> the same shape (`text`, `toolCalls`, `usage`, `cost`, `finishReason`) whether
> the answer came from the provider or the cache.

## 1. Enable the cache with a checkpointer

Inside a `DurableFlow`, `cache: true` automatically uses the flow's checkpointer
as the store:

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DurableFlow, SQLiteCheckpointer } from '@fractal-solutions/qflow/durable';
import { LLMNode, LLM_CACHE_HIT_EVENT } from '@fractal-solutions/qflow/llm';

const checkpointer = new SQLiteCheckpointer('./runs.db');
const llm = new LLMNode({
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: Bun.env.OPENAI_API_KEY,
  cache: true,
});

const flow = new DurableFlow(llm, { checkpointer, name: 'summarize' });
flow.on(LLM_CACHE_HIT_EVENT, ({ key, provider }) =>
  console.log('cache hit', key, provider));

const first = await flow.runDurable({ runId: 'summary-1', shared: { prompt: 'Summarize this release.' } });
// provider called once; result stored under an llm:* key
const replay = await flow.runDurable({ runId: 'summary-2', shared: { prompt: 'Summarize this release.' } });
// same prompt, same model, same tools → cache hit, no provider call
// Keep the checkpointer open for step 3.
```

Outside a flow, pass the checkpointer explicitly:

```javascript
llm.setParams({ checkpointer, cache: true });
await new AsyncFlow(llm).runAsync({ prompt: 'Summarize this release.' });
```

Or supply any object with `get(key)` and `set(key, value, ttlMs)`:

```javascript
const values = new Map();
const cache = {
  get: key => values.get(key) ?? null,
  set: (key, value) => values.set(key, value),
};
await new AsyncFlow(new LLMNode({ provider: 'openai', adapter, cache }))
  .runAsync({ prompt: 'Hello' });
```

## 2. Decide how keys are made

By default the key is a deterministic hash of provider, model, messages/prompt,
tools, response format, temperature and max tokens. That is the safest option:
any input that changes the answer changes the key.

For readable, inspectable keys use a template or a function:

```javascript
const llm = new LLMNode({
  provider: 'openai',
  model: 'gpt-4o-mini',
  cache: true,
  cacheKey: '{{tenant}}:{{prompt}}',            // e.g. 'acme:Summarize this release.'
  cacheTtlMs: 24 * 60 * 60 * 1000,              // one day
});

// Equivalent function form, when the key needs logic:
const custom = new LLMNode({
  provider: 'openai',
  adapter,
  cache: true,
  cacheKey: ({ request, shared }) =>
    `${shared.tenant ?? 'public'}:${request.model}:${shared.promptHash}`,
});
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `cache` | `true`, `{get, set}`, `null` | `null` | `true` uses `checkpointer.cacheGet/cacheSet` in the `llm` namespace |
| `cacheKey` | template string, function, `null` | request hash | Function receives `{request, shared}` and must return a string. `operationId` is a fallback template. |
| `cacheTtlMs` | number / `null` | `null` | Entry lifetime; `null` never expires, `<= 0` expires immediately (for checkpointer-backed caches) |
| `budget` | `BudgetTracker` | `null` | Records only real provider calls, never cache hits |

Templates resolve against `shared` plus the request, so `{{prompt}}`,
`{{tenant}}` and `{{model}}` all work. A function gives you access to the whole
request object (including `messages` and `tools`).

## 3. Verify replay and manage entries

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { SQLiteCheckpointer } from '@fractal-solutions/qflow/durable';
import { LLMNode, LLMAdapter, LLM_CACHE_HIT_EVENT } from '@fractal-solutions/qflow/llm';

class LocalAdapter extends LLMAdapter {
  constructor() { super({ capabilities: { tokenUsage: true } }); this.calls = 0; }
  async complete(request) {
    this.calls += 1;
    return { text: `answer:${request.prompt}`, usage: { prompt_tokens: 5, completion_tokens: 5 } };
  }
}

const adapter = new LocalAdapter();
const localCheckpointer = new SQLiteCheckpointer('./runs.db');
const replayLlm = new LLMNode({
  provider: 'local', adapter,
  cache: true, cacheKey: '{{tenant}}:{{prompt}}',
});
replayLlm.setParams({ checkpointer: localCheckpointer });

const verifyFlow = new AsyncFlow(replayLlm);
let hits = 0;
verifyFlow.on(LLM_CACHE_HIT_EVENT, () => { hits += 1; }); // listen on the flow you run

await verifyFlow.runAsync({ prompt: 'Same question', tenant: 'acme' });
await verifyFlow.runAsync({ prompt: 'Same question', tenant: 'acme' });
console.log(adapter.calls, hits); // 1, 1

// Inspect and manage the checkpointer-backed cache directly:
localCheckpointer.cacheGet('llm', 'acme:Same question'); // stored normalized result
localCheckpointer.cacheSet('llm', 'manual-key', { text: 'preset answer' });
localCheckpointer.clearCache('llm');   // clear only LLM entries
localCheckpointer.clearCache();        // clear every namespace
localCheckpointer.close();
```

`cacheGet(namespace, key)` returns `null` for a miss or an expired entry.
`cacheSet(namespace, key, value, ttlMs)` upserts a JSON-safe value.

### Events and errors

| Signal | Payload / meaning |
| --- | --- |
| `llm:cache_hit` | `{key, provider, model}` — the provider was not called |
| `llm:done` | Not emitted on a cache hit (no new completion happened) |
| `llm:usage` / `budget:check` | Not emitted on a cache hit |
| Error if misconfigured | "LLMNode caching requires a cache object or a checkpointer with cacheGet/cacheSet()" |

## Rules of thumb

- Include **every input that changes the answer** in a custom key: prompt,
  model, tool schemas, output format, tenant, language. A partial key is a
  correctness bug, not just a performance bug.
- Use `cacheTtlMs` when the prompt depends on data that changes (prices,
  inventory, weather). Leave it `null` for deterministic extraction tasks.
- Combine with [budget guardrails](budget-guardrails.md): the same `budget`
  tracker passed to the node records real spend and ignores replays.
- Cache hits bypass capability negotiation by design. If an adapter's
  capabilities change, clear the `llm` namespace.
- Only JSON-serializable normalized results are stored. Custom adapters must
  return normal completion shapes `{text, reasoning, toolCalls, usage, ...}`.

## Verification without an API key

Use a local adapter object and count calls:

```javascript
import { LLMNode, LLMAdapter } from '@fractal-solutions/qflow/llm';

class CountingAdapter extends LLMAdapter {
  constructor() { super({ capabilities: { tokenUsage: true } }); this.calls = 0; }
  async complete(request) {
    this.calls += 1;
    return { text: `answer:${request.prompt}`, usage: { prompt_tokens: 5, completion_tokens: 5 } };
  }
}

const adapter = new CountingAdapter();
const cache = { values: new Map(), get(k) { return this.values.get(k) ?? null; }, set(k, v) { this.values.set(k, v); } };
const flow = new AsyncFlow(new LLMNode({ provider: 'test', adapter, cache }));
await flow.runAsync({ prompt: 'hello' });
await flow.runAsync({ prompt: 'hello' });
console.log(adapter.calls); // 1
```

Next: [trace-driven evaluation](trace-driven-eval.md) uses the same events to
diff a replayed run against a saved baseline.
