# Tutorial: budget guardrails

An agent can loop forever, retry an expensive model, or quietly turn a
five-cent question into a fifty-dollar run. Flow-level `maxSteps` and `timeout`
catch runaway *execution*; they do not know what a token or a dollar is.

The 2.0 budget layer tracks real LLM usage and gives you two ways to react:

- `BudgetNode` routes to `continue` or `exceeded` — good for graceful fallback.
- `BudgetTracker.assertWithin()` throws `BudgetExceededError` — good for hard
  stops, including inside `LLMNode`.

> **Why both?** A product agent usually wants a cheaper model after a limit; a
> payment workflow usually wants to stop. The same numbers power both.

## 1. Track real usage

```javascript
import { BudgetTracker } from '@fractal-solutions/qflow/budget';

const budget = new BudgetTracker({
  maxCost: 0.50,       // currency unit used by pricing()
  maxTokens: 20_000,   // prompt + completion
  maxDurationMs: 60_000,
  maxSteps: 50,
});

budget.record({ prompt: 10, completion: 5 }, 0.20);
console.log(budget.snapshot());
// { cost: 0.2, tokens: 15, calls: 1, steps: 0, durationMs: ... }

const check = budget.check({ steps: 4 });
console.log(check.exceeded, check.reasons); // false, []
budget.assertWithin({ steps: 4 });          // throws only when exceeded
```

`record()` accepts a usage object and an optional explicit cost. Usage totals
are read from `usage.total` or `usage.total_tokens`, otherwise
`prompt + completion`. Cost comes from the explicit argument or `usage.cost`.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `maxCost` | number | `Infinity` | Total spend ceiling |
| `maxTokens` | number | `Infinity` | Total token ceiling |
| `maxDurationMs` | number | `Infinity` | Wall-clock ceiling from `startedAt` |
| `maxSteps` | number | `Infinity` | Step ceiling |
| `startedAt` | Date / epoch ms | now | Start of the duration window |

| Method | Returns | Meaning |
| --- | --- | --- |
| `record(usage?, cost?)` | snapshot | Add one call's usage/cost and increment `calls` |
| `snapshot({steps, now})` | numbers object | Current cost, tokens, calls, steps, duration |
| `check(context)` | snapshot + limits + `reasons` + `exceeded` | Non-throwing evaluation |
| `assertWithin(context)` | check result, or throws | Hard enforcement |
| `reset({startedAt})` | tracker | Zero counters and restart the clock |

## 2. Wire it into an LLM call

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { LLMNode } from '@fractal-solutions/qflow/llm';
import { BudgetTracker, BudgetExceededError } from '@fractal-solutions/qflow/budget';

const budget = new BudgetTracker({ maxCost: 0.01 });
const llm = new LLMNode({
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: Bun.env.OPENAI_API_KEY,
  pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  budget,                       // recorded after every real completion
});

try {
  await new AsyncFlow(llm).runAsync({ prompt: 'Draft the plan.' });
} catch (error) {
  if (error instanceof BudgetExceededError) {
    console.log(error.code, error.reasons, error.snapshot);
    // 'QFLOW_BUDGET_EXCEEDED', ['cost 0.5 > 0.01'], {...}
  } else {
    throw error;
  }
}
```

If `LLMNode` has a `cache` hit, the budget is **not** charged. Replaying a
cached answer costs nothing, so it should not push a run over its limit. See
[deterministic LLM replay](llm-deterministic-cache.md).

## 3. Route to a fallback instead of throwing

```javascript
import { AsyncNode, AsyncFlow } from '@fractal-solutions/qflow';
import { BudgetNode } from '@fractal-solutions/qflow/budget';
import { LLMNode } from '@fractal-solutions/qflow/llm';

class CheapFallbackNode extends AsyncNode {
  async execAsync() { return { usedFallback: true }; }
  async postAsync() { return 'default'; }
}
class StopNode extends AsyncNode {
  async execAsync() { return { stopped: true }; }
  async postAsync() { return 'default'; }
}

const budget = new BudgetTracker({ maxCost: 0.50 });
const guard = new BudgetNode({ tracker: budget, maxCost: 0.50 });
const llm = new LLMNode({ provider: 'openai', budget, model: 'gpt-4o-mini' });

guard.next(llm, 'continue');
guard.next(new StopNode(), 'exceeded');

const flow = new AsyncFlow(guard);
flow.on('budget:check', result => console.log('checked', result.cost, result.tokens));
flow.on('budget:exceeded', result => console.log('over budget', result.reasons));

const outcome = await flow.runAsync({ prompt: 'Draft the plan.' });
```

`BudgetNode.postAsync()` writes the check result to `shared.budget`, then
returns the action:

| Condition | Action when successors exist | Result when no successors |
| --- | --- | --- |
| Within limits | `continue` | the check object |
| Over a limit | `exceeded` | the check object |

Set `throwOnExceed: true` if you prefer `QFLOW_BUDGET_EXCEEDED` over a route.

### `BudgetNode` options

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `maxCost`, `maxTokens`, `maxDurationMs`, `maxSteps` | number | `Infinity` | Limits; `params` and `shared.budget` can override them |
| `tracker` | `BudgetTracker` | `null` | Source of accumulated usage; without it, reads `shared.llmCost` / `shared.llmUsage` |
| `limitsKey` | string | `'budget'` | Shared key holding a limits object |
| `outputKey` | string | `'budget'` | Shared key for the check result |
| `throwOnExceed` | boolean | `false` | Throw instead of routing to `exceeded` |

When no tracker is supplied, `BudgetNode` reads `shared.llmCost` or
`shared.budgetCost`, `shared.llmUsage.total` or `shared.budgetTokens`, and
measures duration from `shared.budgetStartedAt`. That is enough for a simple
flow without an `LLMNode`, but a tracker is the accurate path.

## Guards that work together

| Guard | Stops | Scope |
| --- | --- | --- |
| `maxSteps` on a flow | Too many node visits | One flow run |
| `timeout` on a flow | A run that takes too long wall-clock | One flow run |
| `maxIterations` / `maxItems` on `CycleNode` | A dataflow loop | One cycle |
| `BudgetTracker` | Money, tokens, duration, steps across nodes | Anything sharing the tracker |
| `FlowVersionMismatchError` | Resuming obsolete logic | Durable runs |

Use them together. A budget tracker with `maxSteps` set counts
`shared.agentFlowSteps` when an agent flow provides it, so it complements
rather than duplicates the flow guard.

## Events and errors

| Signal | Payload / meaning |
| --- | --- |
| `budget:check` | `{cost, tokens, calls, steps, durationMs, reasons, exceeded}` |
| `budget:exceeded` | Same payload, emitted only when a limit is crossed |
| `QFLOW_BUDGET_EXCEEDED` | `BudgetExceededError` with `reasons[]` and `snapshot` |

## Rules of thumb

- Define pricing explicitly. Without `pricing` or an adapter-provided cost,
  `cost` stays `null`/`0` and only token/token-based limits are meaningful.
- Pass the **same tracker instance** to `LLMNode` and `BudgetNode`.
- Put `BudgetNode` before an expensive loop, not only after it — the check is a
  routing decision, and a late check still pays for the previous call.
- Use `exceeded` for UX fallbacks and `throwOnExceed` for hard compliance
  boundaries.
- Cache hits do not record usage, which makes replay deterministic and cheap.

Next: [multi-tenant memory](multi-tenant-memory.md) shows how to keep tenant
state separate while sharing the same node code.
