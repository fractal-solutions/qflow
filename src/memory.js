import { Database } from 'bun:sqlite';
import { AsyncNode } from './qflow.js';
import { stableHash } from './util.js';

export const MEMORY_ADD_EVENT = 'memory:add';
export const MEMORY_SEARCH_EVENT = 'memory:search';

export function tokenize(text) {
  return String(text ?? '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Lightweight lexical score used by both in-memory and SQLite stores. */
export function scoreMemory(record, tokens, tags = []) {
  const haystack = tokenize(`${record.text ?? ''} ${(record.tags ?? []).join(' ')}`);
  let score = 0;
  for (const token of tokens) {
    if (haystack.some(word => word.includes(token) || token.includes(word))) score += 1;
  }
  for (const tag of tags) {
    if ((record.tags ?? []).includes(tag)) score += 2;
  }
  return score;
}

async function rank(records, query, { limit = 5, tags = [] } = {}) {
  const tokens = tokenize(query);
  return records
    .map(record => ({ ...record, score: scoreMemory(record, tokens, tags) }))
    .filter(record => tokens.length === 0 || record.score > 0)
    .sort((a, b) => b.score - a.score || String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}

/** Common interface: add / search / get / delete / list / clear. */
export class MemoryStore {
  async add() { throw new Error('MemoryStore.add() must be implemented.'); }
  async search() { throw new Error('MemoryStore.search() must be implemented.'); }
  async get() { throw new Error('MemoryStore.get() must be implemented.'); }
  async delete() { throw new Error('MemoryStore.delete() must be implemented.'); }
  async list() { throw new Error('MemoryStore.list() must be implemented.'); }
  async clear() { throw new Error('MemoryStore.clear() must be implemented.'); }
}

export class InMemoryMemoryStore extends MemoryStore {
  constructor() {
    super();
    this.items = new Map();
  }

  async add({ id, text, tags = [], metadata = {} } = {}) {
    if (text == null) throw new Error('MemoryStore.add() requires text.');
    const record = {
      id: id ?? `mem_${this.items.size + 1}_${stableHash(String(text))}`,
      text: String(text),
      tags: Array.isArray(tags) ? tags.map(String) : [],
      metadata: metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    this.items.set(record.id, record);
    return { ...record };
  }

  async search(query, options = {}) {
    return rank([...this.items.values()].map(item => ({ ...item })), query, options);
  }

  async get(id) {
    const record = this.items.get(id);
    return record ? { ...record } : null;
  }

  async delete(id) {
    return this.items.delete(id);
  }

  async list() {
    return [...this.items.values()].map(item => ({ ...item }));
  }

  async clear() {
    const count = this.items.size;
    this.items.clear();
    return count;
  }
}

export class SQLiteMemoryStore extends MemoryStore {
  constructor(filename = ':memory:') {
    super();
    this.filename = filename;
    this.db = new Database(filename);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS qflow_memories (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
  }

  #record(row) {
    if (!row) return null;
    return {
      id: row.id,
      text: row.text,
      tags: JSON.parse(row.tags_json ?? '[]'),
      metadata: JSON.parse(row.metadata_json ?? '{}'),
      createdAt: row.created_at,
    };
  }

  async add({ id, text, tags = [], metadata = {} } = {}) {
    if (text == null) throw new Error('MemoryStore.add() requires text.');
    const record = {
      id: id ?? `mem_${stableHash({ text, at: Date.now() })}`,
      text: String(text),
      tags: Array.isArray(tags) ? tags.map(String) : [],
      metadata: metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    this.db.prepare(`
      INSERT INTO qflow_memories (id, text, tags_json, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        text = excluded.text, tags_json = excluded.tags_json,
        metadata_json = excluded.metadata_json, created_at = excluded.created_at
    `).run(record.id, record.text, JSON.stringify(record.tags), JSON.stringify(record.metadata), record.createdAt);
    return record;
  }

  async search(query, options = {}) {
    return rank(this.listSync(), query, options);
  }

  listSync() {
    return this.db.prepare('SELECT * FROM qflow_memories ORDER BY created_at').all().map(row => this.#record(row));
  }

  async get(id) {
    return this.#record(this.db.prepare('SELECT * FROM qflow_memories WHERE id = ?').get(id));
  }

  async delete(id) {
    return this.db.prepare('DELETE FROM qflow_memories WHERE id = ?').run(id).changes > 0;
  }

  async list() {
    return this.listSync();
  }

  async clear() {
    return this.db.prepare('DELETE FROM qflow_memories').run().changes;
  }

  close() {
    this.db.close();
  }
}

/** Flow-facing wrapper around any MemoryStore implementation. */
export class MemoryStoreNode extends AsyncNode {
  constructor({
    store = null,
    operation = 'add',
    inputKey = 'memoryInput',
    outputKey = 'memoryResult',
    storeKey = 'memoryStore',
    database = null,
    limit = 5,
  } = {}) {
    super();
    this.store = store;
    this.operation = operation;
    this.inputKey = inputKey;
    this.outputKey = outputKey;
    this.storeKey = storeKey;
    this.database = database;
    this.limit = limit;
  }

  async prepAsync(shared = {}) {
    let store = this.params.store ?? shared[this.storeKey] ?? this.store;
    if (!store) {
      const database = this.params.database ?? this.database ?? shared.memoryDatabase;
      if (database) {
        store = new SQLiteMemoryStore(database);
      } else {
        store = new InMemoryMemoryStore();
      }
      shared[this.storeKey] = store;
    }
    return {
      store,
      operation: this.params.operation ?? this.operation ?? 'add',
      shared,
    };
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    const { store, operation } = prepRes;
    const payload = this.params.input ?? shared[this.inputKey] ?? {};
    const value = typeof payload === 'object' && payload !== null ? payload : { text: payload };

    switch (operation) {
      case 'add': {
        const text = this.params.text ?? value.text ?? value.content;
        if (text == null) throw new Error('MemoryStoreNode add requires text.');
        const record = await store.add({
          id: this.params.id ?? value.id,
          text,
          tags: this.params.tags ?? value.tags ?? [],
          metadata: this.params.metadata ?? value.metadata ?? {},
        });
        observer.emit?.(MEMORY_ADD_EVENT, { id: record.id });
        return record;
      }
      case 'search': {
        const query = this.params.query ?? value.query ?? value.text ?? '';
        const results = await store.search(query, {
          limit: this.params.limit ?? this.limit,
          tags: this.params.tags ?? value.tags ?? [],
        });
        observer.emit?.(MEMORY_SEARCH_EVENT, { count: results.length });
        return results;
      }
      case 'get':
        return store.get(this.params.id ?? value.id);
      case 'delete':
        return store.delete(this.params.id ?? value.id);
      case 'list':
        return store.list();
      case 'clear':
        return store.clear();
      default:
        throw new Error(`Unknown MemoryStoreNode operation '${operation}'.`);
    }
  }

  async postAsync(shared, _prepRes, execRes) {
    shared[this.outputKey] = execRes;
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}
