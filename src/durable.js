import { Database } from 'bun:sqlite';
import { AsyncFlow } from './qflow.js';
import { normalizeTrace, serializeTrace } from './trace.js';

function parseJson(value, fallback = null) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stringify(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return JSON.stringify(String(value));
  }
}

function abortError() {
  const error = new Error('Run aborted by AbortSignal.');
  error.name = 'AbortError';
  return error;
}

/** Build a viewer-ready trace from persisted run/checkpoint rows. */
function buildRunTrace(run, checkpoints, { events = [], includeState = false } = {}) {
  const publicCheckpoints = checkpoints.map(checkpoint => includeState
    ? checkpoint
    : {
        runId: checkpoint.runId,
        step: checkpoint.step,
        nodeIndex: checkpoint.nodeIndex,
        nodeClass: checkpoint.nodeClass,
        action: checkpoint.action,
        nextNodeIndex: checkpoint.nextNodeIndex,
        createdAt: checkpoint.createdAt,
      });

  const observedCheckpointSteps = new Set(
    events
      .map(event => event?.step ?? event?.payload?.step)
      .filter((step, index) => step != null && events[index]?.event === 'checkpoint:saved')
  );
  const syntheticCheckpointEvents = checkpoints
    .filter(checkpoint => !observedCheckpointSteps.has(checkpoint.step))
    .map(checkpoint => ({
      event: 'checkpoint:saved',
      runId: checkpoint.runId,
      step: checkpoint.step,
      nodeClass: checkpoint.nodeClass,
      action: checkpoint.action,
      nextNodeIndex: checkpoint.nextNodeIndex,
      createdAt: checkpoint.createdAt,
      ...(includeState ? { shared: checkpoint.shared, params: checkpoint.params, execRes: checkpoint.execRes } : {}),
    }));

  const traceEvents = [
    { event: 'run:start', runId: run.runId, flowName: run.flowName, status: 'running', createdAt: run.createdAt },
    ...events,
    ...syntheticCheckpointEvents,
    { event: 'run:end', runId: run.runId, status: run.status, step: run.step, result: run.result, error: run.error, updatedAt: run.updatedAt },
  ];

  return normalizeTrace({
    runId: run.runId,
    flowName: run.flowName,
    status: run.status,
    steps: run.step,
    startedAt: run.createdAt,
    endedAt: run.updatedAt,
    events: traceEvents,
    checkpoints: publicCheckpoints,
  });
}

/** SQLite-backed run state. One checkpointer can back many DurableFlow instances. */
export class SQLiteCheckpointer {
  constructor(filename = ':memory:') {
    this.db = new Database(filename);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS qflow_runs (
        run_id TEXT PRIMARY KEY,
        flow_name TEXT NOT NULL,
        status TEXT NOT NULL,
        step INTEGER NOT NULL DEFAULT 0,
        cursor_node_index INTEGER,
        shared_json TEXT NOT NULL,
        params_json TEXT NOT NULL,
        result_json TEXT,
        error_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS qflow_checkpoints (
        run_id TEXT NOT NULL,
        step INTEGER NOT NULL,
        node_index INTEGER,
        node_class TEXT NOT NULL,
        action TEXT,
        next_node_index INTEGER,
        shared_json TEXT NOT NULL,
        params_json TEXT NOT NULL,
        exec_res_json TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (run_id, step)
      );
    `);
  }

  startRun({ runId, flowName, shared, params }) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO qflow_runs (
        run_id, flow_name, status, step, cursor_node_index,
        shared_json, params_json, result_json, error_json, created_at, updated_at
      ) VALUES (?, ?, 'running', 0, NULL, ?, ?, NULL, NULL, ?, ?)
    `).run(runId, flowName, stringify(shared), stringify(params), now, now);
  }

  saveCheckpoint(entry) {
    const now = new Date().toISOString();
    const write = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO qflow_checkpoints (
          run_id, step, node_index, node_class, action, next_node_index,
          shared_json, params_json, exec_res_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(run_id, step) DO UPDATE SET
          node_index = excluded.node_index,
          node_class = excluded.node_class,
          action = excluded.action,
          next_node_index = excluded.next_node_index,
          shared_json = excluded.shared_json,
          params_json = excluded.params_json,
          exec_res_json = excluded.exec_res_json,
          created_at = excluded.created_at
      `).run(
        entry.runId,
        entry.step,
        entry.nodeIndex,
        entry.nodeClass,
        entry.action ?? null,
        entry.nextNodeIndex,
        stringify(entry.shared),
        stringify(entry.params),
        stringify(entry.execRes),
        now,
      );

      this.db.prepare(`
        INSERT INTO qflow_runs (
          run_id, flow_name, status, step, cursor_node_index,
          shared_json, params_json, result_json, error_json, created_at, updated_at
        ) VALUES (?, ?, 'running', ?, ?, ?, ?, NULL, NULL, ?, ?)
        ON CONFLICT(run_id) DO UPDATE SET
          status = 'running',
          step = excluded.step,
          cursor_node_index = excluded.cursor_node_index,
          shared_json = excluded.shared_json,
          params_json = excluded.params_json,
          result_json = NULL,
          error_json = NULL,
          updated_at = excluded.updated_at
      `).run(
        entry.runId,
        entry.flowName,
        entry.step,
        entry.nextNodeIndex,
        stringify(entry.shared),
        stringify(entry.params),
        now,
        now,
      );
    });
    write();
  }

  updateRunStatus(runId, status, { step, shared, result = null, error = null } = {}) {
    this.db.prepare(`
      UPDATE qflow_runs
      SET status = ?, step = ?, shared_json = ?, result_json = ?, error_json = ?, updated_at = ?
      WHERE run_id = ?
    `).run(
      status,
      step ?? 0,
      stringify(shared),
      stringify(result),
      error ? stringify({ message: error.message, stack: error.stack }) : null,
      new Date().toISOString(),
      runId,
    );
  }

  loadRun(runId) {
    const row = this.db.prepare('SELECT * FROM qflow_runs WHERE run_id = ?').get(runId);
    if (!row) return null;

    return {
      runId: row.run_id,
      flowName: row.flow_name,
      status: row.status,
      step: row.step,
      cursorNodeIndex: row.cursor_node_index,
      shared: parseJson(row.shared_json, {}),
      params: parseJson(row.params_json, {}),
      result: parseJson(row.result_json),
      error: parseJson(row.error_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  listRuns() {
    return this.db.prepare('SELECT run_id FROM qflow_runs ORDER BY created_at').all()
      .map(row => row.run_id);
  }

  listCheckpoints(runId) {
    return this.db.prepare(`
      SELECT * FROM qflow_checkpoints WHERE run_id = ? ORDER BY step
    `).all(runId).map(row => ({
      runId: row.run_id,
      step: row.step,
      nodeIndex: row.node_index,
      nodeClass: row.node_class,
      action: row.action,
      nextNodeIndex: row.next_node_index,
      shared: parseJson(row.shared_json, {}),
      params: parseJson(row.params_json, {}),
      execRes: parseJson(row.exec_res_json),
      createdAt: row.created_at,
    }));
  }

  /** Export a run as a JSON-safe trace for the site viewer. */
  exportRunTrace(runId, options = {}) {
    const run = this.loadRun(runId);
    if (!run) throw new Error(`Cannot export trace: no run found for '${runId}'.`);
    return buildRunTrace(run, this.listCheckpoints(runId), options);
  }

  async writeTraceFile(runId, filepath, options = {}) {
    await Bun.write(filepath, serializeTrace(this.exportRunTrace(runId, options)));
    return filepath;
  }

  close() {
    this.db.close();
  }
}

/**
 * AsyncFlow with a checkpoint after every successful node.
 *
 * `runDurable()` returns `{ runId, result, shared, steps, resumed }`; pass the
 * same `runId` with `resume: true` after a crash to continue from the last
 * committed node boundary. `runAsync()` keeps the normal AsyncFlow return shape.
 */
export class DurableFlow extends AsyncFlow {
  constructor(start = null, { checkpointer, name } = {}) {
    super(start);
    this.checkpointer = checkpointer ?? new SQLiteCheckpointer(':memory:');
    this.flowName = name ?? this.constructor.name;
  }

  buildNodeIndex() {
    const index = new Map();
    const queue = this.startNode ? [this.startNode] : [];
    const seen = new Set();

    while (queue.length) {
      const node = queue.shift();
      if (!node || seen.has(node)) continue;
      index.set(node, index.size);
      seen.add(node);
      for (const action of Object.keys(node.successors ?? {}).sort()) {
        queue.push(node.successors[action]);
      }
    }
    return index;
  }

  findNodeByIndex(index, target) {
    for (const [node, nodeIndex] of index) {
      if (nodeIndex === target) return node;
    }
    return this.startNode;
  }

  async runDurable({ shared = {}, runId = crypto.randomUUID(), resume = false, signal, observer = {} } = {}) {
    const flowObserver = this._createFlowObserver(runId, observer);
    const context = { ...flowObserver, runId, signal, checkpointer: this.checkpointer };
    let state;

    if (resume) {
      state = this.checkpointer.loadRun(runId);
      if (!state) throw new Error(`Cannot resume run '${runId}': no saved state found.`);
      shared = state.shared;
      this.setParams(state.params ?? {});
    } else {
      state = {
        status: 'running',
        step: 0,
        cursorNodeIndex: null,
      };
      this.checkpointer.startRun({ runId, flowName: this.flowName, shared, params: this.params });
    }

    flowObserver.emit(resume ? 'run:resumed' : 'run:start', {
      runId,
      flowName: this.flowName,
      status: state.status,
      step: state.step,
    });

    const nodeIndex = this.buildNodeIndex();
    let curr = resume
      ? (state.cursorNodeIndex == null ? null : this.findNodeByIndex(nodeIndex, state.cursorNodeIndex))
      : this.startNode;
    let step = state.step;
    let lastResult = state.result;

    try {
      while (curr) {
        if (signal?.aborted) throw abortError();

        curr.setParams({ ...this.params });
        const prepRes = await curr.prepAsync(shared, context);
        const execRes = await curr._exec(prepRes, shared, context);
        const action = await curr.postAsync(shared, prepRes, execRes, context);
        lastResult = execRes;
        step += 1;

        const nextNode = this.getNextNode(curr, action);
        const entry = {
          runId,
          flowName: this.flowName,
          step,
          nodeIndex: nodeIndex.get(curr) ?? null,
          nodeClass: curr.constructor.name,
          action,
          nextNodeIndex: nextNode ? nodeIndex.get(nextNode) ?? null : null,
          shared,
          params: this.params,
          execRes,
        };
        this.checkpointer.saveCheckpoint(entry);
        flowObserver.emit('checkpoint:saved', {
          runId,
          step,
          nodeClass: entry.nodeClass,
          action,
          nextNodeIndex: entry.nextNodeIndex,
        });

        curr = nextNode;
      }

      this.checkpointer.updateRunStatus(runId, 'completed', {
        step,
        shared,
        result: lastResult,
      });
      flowObserver.emit('run:end', { runId, status: 'completed', step, result: lastResult });
      return { runId, result: lastResult, shared, steps: step, resumed: resume };
    } catch (error) {
      this.checkpointer.updateRunStatus(runId, 'failed', { step, shared, result: lastResult, error });
      flowObserver.emit('run:end', { runId, status: 'failed', step, error: { message: error.message } });
      throw error;
    }
  }

  async runAsync(shared = {}, observer = {}) {
    const outcome = await this.runDurable({ shared, observer });
    return outcome.result;
  }
}

/** Functional form for custom checkpointers implementing loadRun/listCheckpoints. */
export function createRunTrace(checkpointer, runId, options = {}) {
  if (typeof checkpointer?.exportRunTrace === 'function') {
    return checkpointer.exportRunTrace(runId, options);
  }
  const run = checkpointer?.loadRun?.(runId);
  if (!run) throw new Error(`Cannot export trace: no run found for '${runId}'.`);
  return buildRunTrace(run, checkpointer.listCheckpoints(runId), options);
}
