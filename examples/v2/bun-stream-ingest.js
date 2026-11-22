/**
 * WHY THIS EXISTS
 * ---------------
 * For local automation you don't need optional native packages: Bun's process,
 * stream, file-watch and SQLite primitives compose into a small ingest
 * pipeline. This demo emits JSON lines from a child process, maps/filters/
 * reduces them as Web Streams, aggregates them in SQLite, and observes a
 * file change.
 *
 * Run: bun examples/v2/bun-stream-ingest.js
 */
import { mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AsyncFlow } from '../../src/qflow.js';
import {
  BunSpawnNode,
  FileWatchNode,
  SQLiteQueryNode,
  StreamFilterNode,
  StreamMapNode,
  StreamReduceNode,
} from '../../src/bun_nodes.js';

const tempRoot = join(tmpdir(), `qflow-ingest-${crypto.randomUUID()}`);
mkdirSync(tempRoot, { recursive: true });
const emitterPath = join(tempRoot, 'emit.js');
const dbPath = join(tempRoot, 'events.db');
const watchDir = join(tempRoot, 'watch');
const watchLogPath = join(watchDir, 'new.log');

writeFileSync(emitterPath, `
const events = [
  { id: 1, level: 'info', ms: 120 },
  { id: 2, level: 'error', ms: 340 },
  { id: 3, level: 'info', ms: 90 },
  { id: 4, level: 'error', ms: 215 },
];
for (const event of events) console.log(JSON.stringify(event));
`);
mkdirSync(watchDir, { recursive: true });

try {
  const shared = {};

  const spawn = new BunSpawnNode();
  spawn.setParams({ command: process.execPath, args: [emitterPath] });
  await new AsyncFlow(spawn).runAsync(shared);
  console.log(`1) Spawned child: exit ${shared.spawnResult.exitCode}, stdout lines=${shared.spawnStdout.trim().split(/\r?\n/).length}`);

  shared.streamInput = shared.spawnStdout.trim().split(/\r?\n/);
  const parse = new StreamMapNode({ transform: line => JSON.parse(line) });
  const parsed = await new AsyncFlow(parse).runAsync(shared);
  console.log(`2) StreamMap: ${parsed.items.length} events`);

  shared.streamInput = parsed.items;
  const errors = new StreamFilterNode({ transform: event => event.level === 'error' });
  const filtered = await new AsyncFlow(errors).runAsync(shared);
  console.log(`3) StreamFilter: ${filtered.items.map(event => event.id).join(', ')}`);

  shared.streamInput = filtered.items;
  const totals = new StreamReduceNode({
    transform: (sum, event) => sum + event.ms,
    initialValue: 0,
  });
  const reduced = await new AsyncFlow(totals).runAsync(shared);
  console.log(`4) StreamReduce: ${reduced.items[0]}ms of errors`);

  const dbShared = {};
  const sql = (text, params = [], mode = 'all') => {
    const node = new SQLiteQueryNode();
    node.setParams({ database: dbPath, sql: text, params, mode });
    return new AsyncFlow(node).runAsync(dbShared);
  };
  await sql('CREATE TABLE errors (id INTEGER PRIMARY KEY, ms INTEGER NOT NULL)', [], 'exec');
  for (const event of filtered.items) {
    await sql('INSERT INTO errors (id, ms) VALUES (?, ?)', [event.id, event.ms], 'run');
  }
  const summary = await sql('SELECT COUNT(*) AS count, SUM(ms) AS ms FROM errors', [], 'get');
  console.log(`5) SQLite summary: ${JSON.stringify(summary)}`);
  dbShared.bunDb.close();

  const watcher = new FileWatchNode({ waitForEvent: true, timeoutMs: 3000 });
  const watchFlow = new AsyncFlow(watcher);
  watchFlow.on('file:change', ({ event, filename }) => {
    console.log(`6) file:change ${event} ${filename}`);
  });
  const writing = setTimeout(() => writeFileSync(watchLogPath, 'hello'), 150);
  const watchResult = await watchFlow.runAsync({ watchPath: watchDir });
  clearTimeout(writing);
  await watcher.watcher?.close?.();
  watcher.close();
  console.log(`   Watch result: ${watchResult.event} ${watchResult.filename}`);
} finally {
  for (const path of [watchLogPath, ...['', '-wal', '-shm'].map(suffix => `${dbPath}${suffix}`)]) {
    try {
      unlinkSync(path);
    } catch {
      // already gone
    }
  }
  // Windows can keep the watched directory busy for a moment after close().
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      rmSync(tempRoot, { recursive: true, force: true });
      break;
    } catch (error) {
      if (error.code !== 'EBUSY' || attempt === 7) throw error;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
}
