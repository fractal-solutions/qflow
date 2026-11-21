# qflow 2.0 — Canary Roadmap

Branch: `canary/2.0` (from `main` @ `1.0.84`)

## Agreed direction

| Decision | Choice |
| --- | --- |
| Runtime contract | **Bun-only, done properly.** Lean into `bun:sqlite`, `Bun.spawn`, Bun-native SQLite. No Node portability work. |
| API compatibility | Breaking changes allowed in 2.0, with a migration guide. |
| Priority | **New features and growth first.** Foundational debt is fixed only where it blocks shipping a feature. |
| Package layout | One package (`@fractal-solutions/qflow`) with subpath exports and lazy boundaries. |
| License | **Recommendation: MIT** (matches `package.json`, npm metadata and README). `LICENSE` currently says LGPL-2.1 — needs owner confirmation before replacing. |

## Product thesis

qflow's differentiator is breadth of integrations plus usable agent patterns. 2.0 should turn that from a collection of examples into a **platform**: durable agent runs, standard tool interoperability, and one agent engine that can grow new reasoning patterns cheaply.

## Growth tracks (in order)

### Track 1 — MCP bridge *(in progress)*
- [x] Canary branch created
- [ ] `QFlowMCPServer`: expose every registered qflow node as an MCP tool over stdio (`initialize`, `tools/list`, `tools/call`).
- [ ] `MCPClientNode`: let qflow agents call external MCP servers via `Bun.spawn`.
- [ ] Fix tool registry: missing `AsyncNode` import, Windows dynamic import, consumer `qflow.config.js` resolution.
- [ ] Export `./mcp` subpath, add tests and docs.

### Track 2 — One agent engine
- Collapse `agent.js`, `base_agent.js` and the four pattern agents into one execution engine with pluggable reasoning strategies (RAOR / OODA / PEMA / LPAVRL preserved as strategies).
- Fix missing `SummarizeNode` imports and shared tool-call duplication while consolidating.
- Streaming LLM output as flow events.

### Track 3 — Durable execution (Bun-native)
- Checkpoint flow graph + cursor + `shared` state to `bun:sqlite` at node boundaries.
- Run IDs, resume-after-restart, replay/debugging of past runs.
- Cancellation via `AbortSignal` propagated through async nodes.

### Track 4 — Graph semantics & DX
- Fan-out/fan-in, error edges, guarded loops, flow-level timeouts.
- `@fractal-solutions/qflow/testing`: mock nodes, recorded runs, trace snapshots.
- Reuse `site/` as a run-trace viewer instead of a static brochure.

## Shipping floor (kept deliberately small)

- `type: module`, correct export map including `/logger` and `/mcp`, `prepublishOnly`, pinned toolchain + lockfile.
- Real tests under `tests/`; keep `examples/*_test.js` demos out of test discovery.
- CI: typecheck + tests on Bun.
- Resolve license mismatch; CHANGELOG + migration guide.

## Explicitly deferred

Node portability, `docs/` cleanup, site build-system overhaul, and the security/capability audit are tracked but not on the critical path for the first 2.0 canary.
