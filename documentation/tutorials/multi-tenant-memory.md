# Tutorial: multi-tenant memory

A single shared file of "memories" is fine for a demo and wrong for a product.
Two customers must not be able to read each other's notes, and a test suite must
not pollute production recall.

The 2.0 memory layer separates **storage** from **flow logic**:

- A `MemoryStore` implements `add`, `search`, `get`, `delete`, `list`, `clear`.
- `InMemoryMemoryStore` is disposable and process-local.
- `SQLiteMemoryStore` persists to a `bun:sqlite` file.
- `MemoryStoreNode` is the flow-facing wrapper; the same node works with any
  store and any tenant.

> **Why a store interface?** Because tenant isolation should be a construction
> detail (`new SQLiteMemoryStore('./tenant-acme.db')`), not a filter repeated in
> every prompt and query.

## 1. Create one store per tenant

```javascript
import { InMemoryMemoryStore, SQLiteMemoryStore } from '@fractal-solutions/qflow/memory';

// Tests and short-lived agents:
const scratch = new InMemoryMemoryStore();

// Production: one file per tenant, database, or workspace.
const acme = new SQLiteMemoryStore('./tenant-acme.db');
const globex = new SQLiteMemoryStore('./tenant-globex.db');

await acme.add({
  id: 'policy-1',
  text: 'Refunds over $500 require human approval.',
  tags: ['policy', 'finance'],
  metadata: { owner: 'finance-team' },
});

console.log(await acme.get('policy-1'));
// { id, text, tags, metadata, createdAt }
console.log(await globex.list()); // [] — no cross-tenant leakage
```

A record has this shape:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Caller-supplied or generated stable id |
| `text` | string | The recalled content (required by `add`) |
| `tags` | string[] | Extra labels; matching tags boost search rank |
| `metadata` | object | JSON-safe application data, never searched |
| `createdAt` | string | ISO timestamp used as a tie-breaker |

## 2. Use the store from a flow

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { MemoryStoreNode } from '@fractal-solutions/qflow/memory';

const add = new MemoryStoreNode({ operation: 'add' });
await new AsyncFlow(add).runAsync({
  memoryStore: acme,                         // created in step 1
  memoryInput: {
    text: 'Acme uses net-30 payment terms.',
    tags: ['policy', 'finance'],
    metadata: { source: 'handbook' },
  },
});
// shared.memoryResult = the stored record

const search = new MemoryStoreNode({ operation: 'search', limit: 3 });
const hits = await new AsyncFlow(search).runAsync({
  memoryStore: acme,
  memoryInput: { query: 'payment terms', tags: ['policy'] },
});
// hits: [{ id, text, tags, metadata, createdAt, score }, ...]
```

`MemoryStoreNode` looks for a store in this order: `params.store` →
`shared.memoryStore` → constructor `store` → a newly created store saved to
`shared[storeKey]`. If `database` is set, the new store is a
`SQLiteMemoryStore(database)`; otherwise it is in-memory.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `store` | `MemoryStore` | `null` | Explicit store instance |
| `operation` | string | `'add'` | `add`, `search`, `get`, `delete`, `list`, `clear` |
| `inputKey` | string | `'memoryInput'` | Shared key holding the operation payload |
| `outputKey` | string | `'memoryResult'` | Shared key for the result |
| `storeKey` | string | `'memoryStore'` | Shared key used to find/create the store |
| `database` | string | `null` | File path for an automatically created SQLite store |
| `limit` | number | `5` | Default search limit |

The payload can be a string (treated as `{ text: value }`) or an object:

| Operation | Reads from payload | Result |
| --- | --- | --- |
| `add` | `text`, `id`, `tags`, `metadata` | the stored record |
| `search` | `query` (or `text`), `tags`, `limit` | scored records |
| `get` | `id` | record / `null` |
| `delete` | `id` | `boolean` |
| `list` | — | all records |
| `clear` | — | number removed |

## 3. Compose operations in one flow

```javascript
import { AsyncNode, AsyncFlow } from '@fractal-solutions/qflow';
import { MemoryStoreNode } from '@fractal-solutions/qflow/memory';

class AnswerNode extends AsyncNode {
  async execAsync(_prep, shared) {
    const notes = shared.memoryResult ?? [];
    return { answer: notes.map(note => note.text).join('\n') || 'No relevant policy.' };
  }
  async postAsync() { return 'default'; }
}

const remember = new MemoryStoreNode({
  operation: 'add',
  store: acme,
});
const recall = new MemoryStoreNode({
  operation: 'search',
  store: acme,
  limit: 2,
});
remember.next(recall);
recall.next(new AnswerNode());

const flow = new AsyncFlow(remember, { maxSteps: 10 });
flow.on('memory:add', ({ id }) => console.log('stored', id));
flow.on('memory:search', ({ count }) => console.log('found', count));

const result = await flow.runAsync({
  memoryInput: { text: 'Refunds over $500 require human approval.', tags: ['policy'] },
});
// The second node reads memoryInput.query ?? memoryInput.text, so the same
// payload works for a quick demo. In production, use a dedicated recall input.
```

`memory:add` emits `{id}` and `memory:search` emits `{count}`; both appear in
traces and in `flow.onAny()`.

## Store API reference

| Method | Arguments | Returns | Meaning |
| --- | --- | --- | --- |
| `add` | `{id?, text, tags?, metadata?}` | record | Upsert by id; throws without `text` |
| `search` | `query, {limit?, tags?}` | scored records | Lexical match, tag bonus, sorted by score then newest |
| `get` | `id` | record / `null` | Fetch by id |
| `delete` | `id` | boolean | Remove by id |
| `list` | — | records | All records, oldest first |
| `clear` | — | number | Remove all and return the count |
| `close` | — | — | `SQLiteMemoryStore` only: close the database |

Search is deliberately simple: it tokenizes the query and record text, gives a
point per overlapping word and two points per matching tag, drops zero-score
rows, and returns up to `limit` results. It does **not** embed text. For meaning
based recall, use `SemanticMemoryNode` (requires Ollama) or plug your own vector
store into the `MemoryStore` interface.

## Rules of thumb

- One store per isolation boundary (tenant, workspace, project). Do not rely on
  a `tenantId` field to filter a shared store unless every query is audited.
- Call `close()` on `SQLiteMemoryStore` when a tenant is removed or a worker
  shuts down.
- Keep `metadata` JSON-serializable; SQLite stores serialize it.
- Use `InMemoryMemoryStore` in tests so cases cannot leak into each other.
- Avoid putting a live store inside durable `shared` state: checkpoints
  round-trip through JSON. Keep stores outside durable state, or recreate them
  from a `database` path on resume.

Next: [flow versioning](../../MIGRATION.md#10-flow-versioning) explains how to
resume long-lived runs after the graph changes.
