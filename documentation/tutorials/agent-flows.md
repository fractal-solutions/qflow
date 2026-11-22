# Tutorial: agent strategies as flows

The agent engine owns reasoning and tool semantics; 2.0 lets you expose that engine as a normal `AsyncFlow`. That makes strategies inspectable, checkpointable and traceable instead of a black box.

## 1. Choose a strategy

```javascript
import { listStrategies, strategyGraph } from '@fractal-solutions/qflow/agent';

console.log(listStrategies());
// default, raor, ooda, lpavrl, pema

console.log(strategyGraph('raor'));
// { id: 'raor', label: 'Reason → Act → Reflect', phases: [...], edges: [...] }
```

| Strategy | Phases |
| --- | --- |
| `default` | thought → action |
| `raor` | Reason → Act → Reflect |
| `ooda` | Observe → Orient → Decide → Act |
| `lpavrl` | Listen → Plan → Act → Visualize → Reflect → Learn |
| `pema` | Plan → Execute → Monitor → Adjust |

## 2. Give the engine a registry and a model

```javascript
import { AgentEngine } from '@fractal-solutions/qflow/agent';
import { LLMNode } from '@fractal-solutions/qflow/llm';

// AgentEngine expects raw completion text, while LLMNode returns a normalized
// object. This tiny subclass keeps the adapter/events and unwraps the text.
class AgentLLM extends LLMNode {
  async postAsync(shared, prepRes, execRes, observer) {
    await super.postAsync(shared, prepRes, execRes, observer);
    return execRes.text;
  }
}

const llmNode = new AgentLLM({ provider: 'openai', model: 'gpt-4o-mini', apiKey: Bun.env.OPENAI_API_KEY });

const agent = new AgentEngine({
  llmNode,
  toolRegistry: registry,                 // from ToolSpec / ToolRegistry
  grantedCapabilities: ['read', 'write'],
  grantedPermissions: ['public', 'internal'],
  strategy: 'raor',
  requireFinishConfirmation: false,       // set false for background/offline runs
  maxSteps: 10,
});
```

The LLM must reply with a single JSON object:

```json
{ "thought": "Search first.", "tool_calls": [{ "tool": "catalog.search", "parameters": { "query": "replay" } }] }
```

Finish with `{ "tool": "finish", "parameters": { "output": "..." } }`. With `requireFinishConfirmation: true` the engine asks for confirmation on stdin; disable it for servers and examples.

## 3. Run the engine as a flow

```javascript
const flow = agent.asFlow();

console.log(flow.graph.nodes.length);            // one node per phase + a finish node
console.log(flow.graph.edges);                   // { from, to, action: 'continue' | 'finish' }

const answer = await flow.runAsync({ goal: 'Find the replay docs and save a summary.' });
console.log(answer);                             // the finish tool's output
console.log(flow.shared?.agentPhase ?? 'done');
```

`asFlow()` accepts an optional strategy override:

```javascript
const inspectable = agent.asFlow({ strategy: 'ooda', maxSteps: 20 });
```

Each phase node increments `shared.agentFlowSteps`; if it exceeds `agent.maxSteps`, the flow finishes with a budget-exhausted message.

## 4. Compose control nodes yourself

For a custom control graph, use the first-class nodes instead of a strategy:

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { PlanNode, CriticNode, ReflectNode, FinishNode, HumanApprovalNode } from '@fractal-solutions/qflow/agent';

const plan = new PlanNode({ llmNode });
const critic = new CriticNode({ llmNode });
const revise = new ReflectNode({ llmNode });
const approve = new HumanApprovalNode();
const finish = new FinishNode();

plan.next(critic, 'default');
critic.next(revise, 'reject');
critic.next(approve, 'approve');
revise.next(critic, 'default');
approve.next(finish, 'approve');

const controlFlow = new AsyncFlow(plan);
await controlFlow.runAsync({ goal: 'Ship the 2.0 docs', answer: 'yes' });
// HumanApprovalNode reads params.answer when present, so this stays offline.
```

Actions are explicit:

| Node | Shared state written | Successors |
| --- | --- | --- |
| `PlanNode` | `plan`, `planResult` | `default` |
| `CriticNode` | `critique`, `approved`, `critiqueResult` | `approve` / `reject` |
| `ReflectNode` | `reflection`, `nextAction`, `reflectionResult` | `default` |
| `FinishNode` | `finalOutput` | `finish` |
| `HumanApprovalNode` | `approval` (`{ approved, answer }`) | `approve` / `reject` |

All control nodes emit events and work as durable-flow nodes; wiring `approve` to an external decision mechanism is the next product gap to close.

## 5. Keep tools scoped

Because the engine consults the registry for tool validation and execution, capability grants are enforced before a tool is listed or called:

```javascript
const readOnly = new AgentEngine({
  llmNode,
  toolRegistry: registry,
  grantedCapabilities: ['read'],
  grantedPermissions: ['public'],
  strategy: 'default',
  requireFinishConfirmation: false,
});
// A write tool is now "not allowed by the current capability grant".
```

The same registry can back `QFlowMCPServer` and `registry.llmTools()` — see [MCP tool servers and clients](mcp.md).

## Working example

`bun examples/v2/unified-tool-contract.js` runs a scripted RAOR agent end to end: search, save a note, finish. It prints the strategy phases, the flow graph, and `llm:usage` events without needing an API key.
