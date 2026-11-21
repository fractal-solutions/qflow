import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AsyncFlow } from '../src/qflow.js';
import {
  BunSpawnNode,
  FileWatchNode,
  SQLiteQueryNode,
  StreamFilterNode,
  StreamMapNode,
  StreamReduceNode,
  StreamTransformNode,
} from '../src/bun_nodes.js';

describe('Bun-native nodes', () => {
  test('BunSpawnNode captures stdout and exit code', async () => {
    const node = new BunSpawnNode();
    node.setParams({ command: process.execPath, args: ['--version'] });
    const shared = {};

    await new AsyncFlow(node).runAsync(shared);

    expect(shared.spawnResult.exitCode).toBe(0);
    expect(shared.spawnStdout).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('SQLiteQueryNode creates, inserts and queries rows', async () => {
    const shared = {};
    const create = new SQLiteQueryNode();
    create.setParams({ database: ':memory:', sql: 'CREATE TABLE items (id INTEGER, name TEXT)', mode: 'exec' });
    await new AsyncFlow(create).runAsync(shared);

    const insert = new SQLiteQueryNode();
    insert.setParams({
      database: shared.bunDb,
      sql: 'INSERT INTO items (id, name) VALUES (?, ?)',
      params: [1, 'one'],
      mode: 'run',
    });
    await new AsyncFlow(insert).runAsync(shared);

    const query = new SQLiteQueryNode();
    query.setParams({ database: shared.bunDb, sql: 'SELECT * FROM items', mode: 'all' });
    const rows = await new AsyncFlow(query).runAsync(shared);

    expect(rows).toEqual([{ id: 1, name: 'one' }]);
    shared.bunDb.close();
  });

  test('stream transform nodes map, filter and reduce chunks', async () => {
    const map = new StreamMapNode({ transform: value => value * 2 });
    expect((await new AsyncFlow(map).runAsync({ streamInput: [1, 2, 3] })).items).toEqual([2, 4, 6]);

    const filter = new StreamFilterNode({ transform: value => value > 2 });
    expect((await new AsyncFlow(filter).runAsync({ streamInput: [1, 2, 3, 4] })).items).toEqual([3, 4]);

    const reduce = new StreamReduceNode({ transform: (sum, value) => sum + value, initialValue: 0 });
    expect((await new AsyncFlow(reduce).runAsync({ streamInput: [1, 2, 3, 4] })).items).toEqual([10]);

    const transform = new StreamTransformNode({ transform: value => [value, value] });
    expect((await new AsyncFlow(transform).runAsync({ streamInput: ['a'] })).items).toEqual(['a', 'a']);
  });

  test('FileWatchNode captures file changes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'qflow-watch-'));
    const node = new FileWatchNode({ waitForEvent: true, timeoutMs: 5000 });
    node.setParams({ path: dir, recursive: true });

    try {
      const pending = new AsyncFlow(node).runAsync({});
      await new Promise(resolve => setTimeout(resolve, 100));
      await Bun.write(join(dir, 'changed.txt'), 'hello');
      await pending;

      expect(node.events.length).toBeGreaterThan(0);
      expect(node.events[0].filename).toContain('changed');
    } finally {
      node.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
