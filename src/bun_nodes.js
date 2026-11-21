import { AsyncNode } from './qflow.js';
import { Database } from 'bun:sqlite';

async function streamText(stream) {
  if (!stream) return '';
  if (typeof stream === 'string') return stream;
  const response = new Response(stream);
  return await response.text();
}

/** Run a child process with Bun.spawn and capture stdout/stderr. */
export class BunSpawnNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: 'bun_spawn',
      description: 'Runs a command with Bun.spawn.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Executable to run.' },
          args: { type: 'array', items: { type: 'string' }, description: 'Arguments for the executable.' },
          cwd: { type: 'string' },
          timeoutMs: { type: 'number' },
        },
        required: ['command'],
      },
    };
  }

  async prepAsync(shared = {}) {
    const command = this.params.command ?? shared.command;
    if (!command) throw new Error('BunSpawnNode requires a command.');
    return { command };
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    if (!globalThis.Bun?.spawn) throw new Error('BunSpawnNode requires the Bun runtime.');
    const { command, args = [], cwd, env, input, timeoutMs } = this.params;
    const proc = globalThis.Bun.spawn({
      cmd: [command, ...(Array.isArray(args) ? args : [])],
      cwd,
      env: env ? { ...process.env, ...env } : undefined,
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: input == null ? 'ignore' : 'pipe',
    });

    if (input != null) {
      proc.stdin.write(typeof input === 'string' ? input : JSON.stringify(input));
      proc.stdin.end();
    }

    let timer = null;
    try {
      const work = (async () => {
        const [stdout, stderr, exitCode] = await Promise.all([
          streamText(proc.stdout),
          streamText(proc.stderr),
          proc.exited,
        ]);
        return { exitCode, stdout, stderr };
      })();

      const result = timeoutMs
        ? await Promise.race([
            work,
            new Promise((_resolve, reject) => {
              timer = setTimeout(() => {
                proc.kill();
                const error = new Error(`BunSpawnNode timed out after ${timeoutMs}ms.`);
                error.name = 'TimeoutError';
                reject(error);
              }, timeoutMs);
            }),
          ])
        : await work;

      observer.emit?.('spawn:exit', { command, args, exitCode: result.exitCode });
      return result;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.spawnResult = execRes;
    shared.spawnStdout = execRes.stdout;
    shared.spawnStderr = execRes.stderr;
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}

/** Query a SQLite database with bun:sqlite, with a cached per-shared handle. */
export class SQLiteQueryNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: 'sqlite_query',
      description: 'Runs a SQL statement against a bun:sqlite database.',
      parameters: {
        type: 'object',
        properties: {
          database: { type: 'string', description: 'SQLite filename or :memory:.' },
          sql: { type: 'string', description: 'SQL statement.' },
          params: { type: 'array', items: { type: 'any' } },
          mode: { type: 'string', enum: ['all', 'get', 'run', 'exec'] },
        },
        required: ['database', 'sql'],
      },
    };
  }

  async prepAsync(shared = {}) {
    const database = this.params.database ?? shared.sqliteDatabase ?? ':memory:';
    const dbKey = this.params.dbKey ?? 'bunDb';
    const db = database instanceof Database
      ? database
      : shared[dbKey] instanceof Database
        ? shared[dbKey]
        : new Database(database);
    if (!(shared[dbKey] instanceof Database)) shared[dbKey] = db;
    return { db };
  }

  async execAsync(prepRes) {
    const sql = this.params.sql ?? this.params.query;
    if (!sql) throw new Error('SQLiteQueryNode requires `sql`.');
    const values = this.params.params ?? [];
    const mode = this.params.mode ?? 'all';

    if (mode === 'exec') {
      prepRes.db.exec(sql);
      return { changes: 0 };
    }
    const statement = prepRes.db.prepare(sql);
    if (mode === 'get') return statement.get(...values);
    if (mode === 'run') {
      const info = statement.run(...values);
      return { changes: info.changes, lastInsertRowid: String(info.lastInsertRowid) };
    }
    return statement.all(...values);
  }

  async postAsync(shared, prepRes, execRes) {
    shared.sqliteResult = execRes;
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}

/** Watch a path and collect file-system events. */
export class FileWatchNode extends AsyncNode {
  constructor({ eventKey = 'fileEvents', maxEvents = Infinity, waitForEvent = false, timeoutMs = null } = {}) {
    super();
    this.eventKey = eventKey;
    this.maxEvents = maxEvents;
    this.waitForEvent = waitForEvent;
    this.timeoutMs = timeoutMs;
    this.events = [];
    this.watcher = null;
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    const target = this.params.path ?? shared.watchPath;
    if (!target) throw new Error('FileWatchNode requires a path.');

    this.events = [];
    let resolveFirst = null;
    const firstEvent = new Promise(resolve => { resolveFirst = resolve; });
    const record = (event, filename) => {
      const entry = {
        event: String(event),
        filename: filename == null ? '' : String(filename),
        path: target,
        timestamp: Date.now(),
      };
      this.events.push(entry);
      observer.emit?.('file:change', { ...entry, flowId: observer.flowId });
      resolveFirst?.(entry);
      if (this.events.length >= (this.params.maxEvents ?? this.maxEvents)) this.close();
    };

    const recursive = this.params.recursive ?? true;
    let bunWatcher = null;
    try {
      bunWatcher = globalThis.Bun?.watch?.(target, { recursive }, (event, filename) => record(event, filename));
    } catch {
      bunWatcher = null;
    }

    if (bunWatcher?.close) {
      this.watcher = bunWatcher;
    } else {
      const { watch } = await import('node:fs');
      this.watcher = watch(target, { recursive }, (event, filename) => record(event, filename));
    }

    if (this.params.waitForEvent ?? this.waitForEvent) {
      const timeoutMs = this.params.timeoutMs ?? this.timeoutMs;
      if (!timeoutMs) return await firstEvent;
      let timer = null;
      try {
        return await Promise.race([
          firstEvent,
          new Promise((_resolve, reject) => {
            timer = setTimeout(() => {
              const error = new Error(`FileWatchNode timed out after ${timeoutMs}ms.`);
              error.name = 'TimeoutError';
              reject(error);
            }, timeoutMs);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    return { watching: true, path: target };
  }

  close() {
    this.watcher?.close?.();
    this.watcher = null;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.params.eventKey ?? this.eventKey] = this.events;
    shared.fileWatchResult = execRes;
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}

async function readChunks(input) {
  if (input && typeof input.getReader === 'function') {
    const reader = input.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    reader.releaseLock?.();
    return chunks;
  }
  if (Array.isArray(input)) return input;
  return input == null ? [] : [input];
}

/** Compose Web Streams with map/filter/reduce/transform operations. */
export class StreamTransformNode extends AsyncNode {
  constructor({ transform = null, mode = 'transform', outputKey = 'streamResult', initialValue = undefined } = {}) {
    super();
    this.transform = transform;
    this.mode = mode;
    this.outputKey = outputKey;
    this.initialValue = initialValue;
  }

  async prepAsync(shared = {}) {
    return this.params.input ?? shared.streamInput ?? shared.items ?? [];
  }

  async execAsync(chunks = [], shared = {}, observer = {}) {
    const mode = this.params.mode ?? this.mode;
    const transform = this.params.transform ?? this.transform;
    const source = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });

    let accumulator = this.params.initialValue ?? this.initialValue;
    const transformer = new TransformStream({
      async transform(chunk, controller) {
        if (mode === 'filter') {
          const keep = typeof transform === 'function' ? await transform(chunk) : Boolean(transform);
          if (keep) controller.enqueue(chunk);
          return;
        }
        if (mode === 'reduce') {
          accumulator = typeof transform === 'function'
            ? await transform(accumulator, chunk)
            : accumulator;
          return;
        }
        const output = typeof transform === 'function' ? await transform(chunk) : chunk;
        if (output === undefined) return;
        if (Array.isArray(output)) output.forEach(item => controller.enqueue(item));
        else controller.enqueue(output);
      },
      flush(controller) {
        if (mode === 'reduce') controller.enqueue(accumulator);
      },
    });

    const reader = source.pipeThrough(transformer).getReader();
    const items = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      items.push(value);
      observer.emit?.('stream:item', { value, index: items.length - 1 });
    }
    reader.releaseLock?.();

    return {
      items,
      stream: new ReadableStream({
        start(controller) {
          for (const item of items) controller.enqueue(item);
          controller.close();
        },
      }),
    };
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.outputKey] = execRes.items;
    shared[this.params.streamKey ?? 'stream'] = execRes.stream;
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}

export class StreamMapNode extends StreamTransformNode {
  constructor(options = {}) {
    super({ ...options, mode: 'map' });
  }
}

export class StreamFilterNode extends StreamTransformNode {
  constructor(options = {}) {
    super({ ...options, mode: 'filter' });
  }
}

export class StreamReduceNode extends StreamTransformNode {
  constructor(options = {}) {
    super({ ...options, mode: 'reduce' });
  }
}
