# qflow 2.0 tutorial index

These are teaching documents, not API dumps. Each tutorial follows the same
shape: **why this exists**, **1-2-3 steps that run**, **what every option
means**, and **what to do when it fails**. All snippets are Bun/ESM and use the
public subpath exports.

Start with the [migration guide](../../MIGRATION.md) if you are upgrading from
1.x or an earlier canary. Start here if you are learning 2.0.

## Before you begin

```bash
bun add @fractal-solutions/qflow
bun test tests
bun run examples:v2
```

Two facts make every tutorial easier to follow:

1. A **durable run** is identified by a caller-owned `runId`. `DurableFlow`
   checkpoints after every successful node, and `resume: true` re-enters the
   last node instead of guessing where to continue.
2. The **observer** is the event bus. Nodes emit through `observer.emit?.()`;
   flows listen with `flow.on()` / `flow.onAny()`. Approval requests, budget
   checks, cache hits and side-effect outcomes all appear there, and the same
   events become traces.

## Learning path A — build a durable agent workflow

| Step | Tutorial | You will learn | Key API |
| --- | --- | --- | --- |
| 1 | [Provider-neutral LLM nodes](provider-neutral-llm.md) | Swap providers, negotiate capabilities, read usage | `LLMNode`, adapters |
| 2 | [Unified tool contract with MCP](mcp.md) | One tool definition for agents, MCP, LLM schemas and docs | `ToolSpec`, `ToolRegistry` |
| 3 | [Durable side effects](durable-side-effects.md) | Replay completed effects, refuse uncertain ones, add worker leases | `ReplaySafeNode`, `operationId`, `workerId` |
| 4 | **[Durable human approval](durable-approval.md)** | Suspend for days, record a decision, resume | `WaitForApprovalNode`, `approve()` / `reject()` |
| 5 | **[Durable scheduling](durable-scheduling.md)** | Suspend until a date, delay or cron slot; resume due runs | `ScheduleNode`, `listScheduledRuns()` |
| 6 | **[Deterministic LLM replay](llm-deterministic-cache.md)** | Cache completions across workers and restarts | `cache`, `cacheKey`, `llm:cache_hit` |
| 7 | **[Budget guardrails](budget-guardrails.md)** | Track spend/tokens/latency and route or throw | `BudgetTracker`, `BudgetNode` |
| 8 | **[Multi-tenant memory](multi-tenant-memory.md)** | Give each tenant a store and share one node API | `MemoryStoreNode`, `SQLiteMemoryStore` |
| 9 | [Flow versioning](../../MIGRATION.md#10-flow-versioning) | Resume old runs safely after a graph change | `version`, `onVersionMismatch` |
| 10 | [Agent strategies as flows](agent-flows.md) | Turn reasoning patterns into inspectable graphs | `AgentEngine.asFlow()` |

## Learning path B — ship and evaluate

| Step | Tutorial | You will learn | Key API |
| --- | --- | --- | --- |
| 1 | [Agent strategies as flows](agent-flows.md) | Phases as checkpointable nodes | `asFlow()`, `strategyGraph()` |
| 2 | [Trace-driven evaluation](trace-driven-eval.md) | Export a run, replay it, assert and score | `writeTraceFile()`, `ReplayNode` |
| 3 | [Durable side effects](durable-side-effects.md) | Make traces deterministic at external boundaries | reservations and leases |
| 4 | **[Deterministic LLM replay](llm-deterministic-cache.md)** | Remove provider randomness from replays | LLM response cache |

## Tutorials in this directory

| Tutorial | Covers | Prerequisites |
| --- | --- | --- |
| [MCP tool servers and clients](mcp.md) | `QFlowMCPServer`, `MCPClientNode`, tool registry | None |
| [Provider-neutral LLM nodes](provider-neutral-llm.md) | Adapters, capabilities, streaming, costs | None |
| [Durable side effects and safe replay](durable-side-effects.md) | `operationId`, replay, uncertain effects, leases | Core flows |
| [Durable human approval](durable-approval.md) | Suspension, review queues, decisions, routing | `DurableFlow` |
| [Durable scheduling](durable-scheduling.md) | `at` / `delayMs` / `cron`, due-run polling | `DurableFlow` |
| [Deterministic LLM replay and caching](llm-deterministic-cache.md) | Cache stores, keys, TTLs, `llm:cache_hit` | `LLMNode` |
| [Budget guardrails](budget-guardrails.md) | Trackers, limits, `continue` / `exceeded` | `LLMNode` helpful |
| [Multi-tenant memory](multi-tenant-memory.md) | Store interface, SQLite/in-memory, operations | Core flows |
| [Agent strategies as flows](agent-flows.md) | Strategy phases, `asFlow()`, graphs | Agents |
| [Trace-driven evaluation](trace-driven-eval.md) | Normalized traces, replay, diffs, assertions | Flows + events |

## Cross-cutting reference

| Topic | Where |
| --- | --- |
| Every subpath export and what it contains | [MIGRATION.md § 3](../../MIGRATION.md#3-imports-one-package-many-subpaths) |
| Option tables with types and defaults | [MIGRATION.md](../../MIGRATION.md) — sections 8-15 |
| Error codes and what to do about them | [MIGRATION.md § 20](../../MIGRATION.md#20-error-code-reference) |
| End-to-end offline stories | [`examples/v2/`](../../examples/v2/README.md) |
| Full node reference | [Integrated nodes](../integrated_nodes.md) |

## Conventions used here

- **Why first.** Each tutorial explains the failure mode before the API.
- **Three steps.** Setup → run → observe/fix. No hidden scaffolding.
- **Option tables.** Type, default, allowed values and meaning for every
  option that matters.
- **File-backed SQLite.** Examples use a file path so a restart demonstrates
  real persistence. Replace with `':memory:'` only for tests.
- **JSON-safe `shared`.** Checkpoints round-trip through JSON; do not store
  live handles, streams or class instances there.
