import { Database } from 'bun:sqlite';
import { AsyncFlow } from './qflow.js';
import { normalizeTrace, serializeTrace } from './trace.js';
import {
  ApprovalPendingError,
  FlowVersionMismatchError,
  SchedulePendingError,
  SideEffectClaimedError,
  SideEffectUncertainError,
} from './util.js';

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
    { event: 'run:start', runId: run.runId, flowName: run.flowName, flowVersion: run.flowVersion ?? null, status: 'running', createdAt: run.createdAt },
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
  constructor(filename = ':memory:', { workerId = `worker-${crypto.randomUUID().slice(0, 8)}`, leaseMs = 60_000 } = {}) {
    this.db = new Database(filename);
    this.workerId = workerId;
    this.leaseMs = leaseMs;
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
      CREATE TABLE IF NOT EXISTS qflow_side_effects (
        run_id TEXT NOT NULL,
        operation_id TEXT NOT NULL,
        kind TEXT,
        status TEXT NOT NULL,
        result_json TEXT,
        error_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (run_id, operation_id)
      );
      CREATE TABLE IF NOT EXISTS qflow_approvals (
        run_id TEXT NOT NULL,
        approval_id TEXT NOT NULL,
        prompt TEXT,
        status TEXT NOT NULL,
        decision_json TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (run_id, approval_id)
      );
      CREATE TABLE IF NOT EXISTS qflow_cache (
        namespace TEXT NOT NULL,
        cache_key TEXT NOT NULL,
        value_json TEXT NOT NULL,
        expires_at INTEGER,
        created_at TEXT NOT NULL,
        PRIMARY KEY (namespace, cache_key)
      );
    `);

    // Databases created by earlier canary builds lack the 2.0.0-canary.4 columns.
    this.#ensureColumn('qflow_runs', 'flow_version', 'TEXT');
    this.#ensureColumn('qflow_runs', 'due_at', 'INTEGER');
    this.#ensureColumn('qflow_checkpoints', 'flow_version', 'TEXT');
    this.#ensureColumn('qflow_side_effects', 'claimed_by', 'TEXT');
    this.#ensureColumn('qflow_side_effects', 'lease_expires_at', 'INTEGER');
  }

  #ensureColumn(table, column, definition) {
    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name);
    if (!columns.includes(column)) this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }

  startRun({ runId, flowName, shared, params, version = null }) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO qflow_runs (
        run_id, flow_name, status, step, cursor_node_index, flow_version, due_at,
        shared_json, params_json, result_json, error_json, created_at, updated_at
      ) VALUES (?, ?, 'running', 0, NULL, ?, NULL, ?, ?, NULL, NULL, ?, ?)
    `).run(runId, flowName, version, stringify(shared), stringify(params), now, now);
  }

  saveCheckpoint(entry) {
    const now = new Date().toISOString();
    const write = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO qflow_checkpoints (
          run_id, step, node_index, node_class, action, next_node_index, flow_version,
          shared_json, params_json, exec_res_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(run_id, step) DO UPDATE SET
          node_index = excluded.node_index,
          node_class = excluded.node_class,
          action = excluded.action,
          next_node_index = excluded.next_node_index,
          flow_version = excluded.flow_version,
          shared_json = excluded.shared_json,
          params_json = excluded.params_json,
          exec_res_json = excluded.exec_res_json,
          created_at = excluded.created_at
      `).run(
        entry.runId,
        entry.step,
        entry.nodeIndex,
        entry.nodeClass,
        // Actions are normally action names, but standalone eval/dataflow nodes
        // return their exec result. Persist those as JSON instead of handing an
        // object to bun:sqlite.
        typeof entry.action === 'object' && entry.action !== null
          ? stringify(entry.action)
          : entry.action ?? null,
        entry.nextNodeIndex,
        entry.flowVersion ?? null,
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
      flowVersion: row.flow_version ?? null,
      dueAt: row.due_at ?? null,
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

  /** Runs suspended by SchedulePendingError, ordered by due time. */
  listScheduledRuns({ before = Infinity } = {}) {
    return this.db.prepare(`
      SELECT run_id, flow_name, flow_version, due_at, step
      FROM qflow_runs
      WHERE status = 'scheduled' AND due_at IS NOT NULL AND due_at <= ?
      ORDER BY due_at
    `).all(before).map(row => ({
      runId: row.run_id,
      flowName: row.flow_name,
      flowVersion: row.flow_version ?? null,
      dueAt: row.due_at,
      step: row.step,
    }));
  }

  setRunDueAt(runId, dueAt) {
    this.db.prepare('UPDATE qflow_runs SET due_at = ?, updated_at = ? WHERE run_id = ?')
      .run(dueAt ?? null, new Date().toISOString(), runId);
    return dueAt;
  }

  setFlowVersion(runId, version) {
    const now = new Date().toISOString();
    const write = this.db.transaction(() => {
      this.db.prepare('UPDATE qflow_runs SET flow_version = ?, updated_at = ? WHERE run_id = ?')
        .run(version, now, runId);
      this.db.prepare('UPDATE qflow_checkpoints SET flow_version = ? WHERE run_id = ?')
        .run(version, runId);
    });
    write();
    return version;
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
      flowVersion: row.flow_version ?? null,
      shared: parseJson(row.shared_json, {}),
      params: parseJson(row.params_json, {}),
      execRes: parseJson(row.exec_res_json),
      createdAt: row.created_at,
    }));
  }

  // --- Durable human approvals -------------------------------------------------

  requestApproval({ runId, approvalId, prompt = null, metadata = null }) {
    if (!runId || !approvalId) throw new Error('requestApproval requires runId and approvalId.');
    const existing = this.getApproval(runId, approvalId);
    if (existing) return existing;
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO qflow_approvals (
        run_id, approval_id, prompt, status, decision_json, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, 'pending', NULL, ?, ?, ?)
    `).run(runId, approvalId, prompt ?? null, stringify(metadata), now, now);
    return this.getApproval(runId, approvalId);
  }

  getApproval(runId, approvalId) {
    const row = this.db.prepare(`
      SELECT * FROM qflow_approvals WHERE run_id = ? AND approval_id = ?
    `).get(runId, approvalId);
    return row ? this.#approvalRecord(row) : null;
  }

  listApprovals(runId, { status = null } = {}) {
    const rows = status
      ? this.db.prepare(`SELECT * FROM qflow_approvals WHERE run_id = ? AND status = ? ORDER BY created_at`).all(runId, status)
      : this.db.prepare(`SELECT * FROM qflow_approvals WHERE run_id = ? ORDER BY created_at`).all(runId);
    return rows.map(row => this.#approvalRecord(row));
  }

  #approvalRecord(row) {
    return {
      runId: row.run_id,
      approvalId: row.approval_id,
      prompt: row.prompt,
      status: row.status,
      decision: parseJson(row.decision_json),
      metadata: parseJson(row.metadata_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  #resolveApproval(runId, approvalId) {
    if (approvalId) {
      const record = this.getApproval(runId, approvalId);
      if (!record) throw new Error(`Cannot decide approval '${approvalId}': none exists for run '${runId}'.`);
      return record;
    }
    const pending = this.listApprovals(runId, { status: 'pending' });
    if (!pending.length) throw new Error(`No pending approvals for run '${runId}'.`);
    return pending[pending.length - 1];
  }

  approve(runId, decision = {}, approvalId = null) {
    const record = this.#resolveApproval(runId, approvalId);
    const value = { ...(decision ?? {}), approved: decision?.approved !== false };
    this.db.prepare(`
      UPDATE qflow_approvals SET status = 'approved', decision_json = ?, updated_at = ?
      WHERE run_id = ? AND approval_id = ?
    `).run(stringify(value), new Date().toISOString(), runId, record.approvalId);
    return this.getApproval(runId, record.approvalId);
  }

  reject(runId, decision = {}, approvalId = null) {
    const record = this.#resolveApproval(runId, approvalId);
    const value = { ...(decision ?? {}), approved: false };
    this.db.prepare(`
      UPDATE qflow_approvals SET status = 'rejected', decision_json = ?, updated_at = ?
      WHERE run_id = ? AND approval_id = ?
    `).run(stringify(value), new Date().toISOString(), runId, record.approvalId);
    return this.getApproval(runId, record.approvalId);
  }

  // --- Deterministic LLM response cache ---------------------------------------

  cacheGet(namespace, key) {
    const row = this.db.prepare(`
      SELECT value_json, expires_at FROM qflow_cache WHERE namespace = ? AND cache_key = ?
    `).get(namespace, key);
    if (!row) return null;
    if (row.expires_at != null && row.expires_at <= Date.now()) {
      this.db.prepare('DELETE FROM qflow_cache WHERE namespace = ? AND cache_key = ?').run(namespace, key);
      return null;
    }
    return parseJson(row.value_json);
  }

  cacheSet(namespace, key, value, ttlMs = null) {
    const expiresAt = ttlMs == null || ttlMs === Infinity ? null : Date.now() + ttlMs;
    this.db.prepare(`
      INSERT INTO qflow_cache (namespace, cache_key, value_json, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(namespace, cache_key) DO UPDATE SET
        value_json = excluded.value_json,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at
    `).run(namespace, key, stringify(value), expiresAt, new Date().toISOString());
    return key;
  }

  clearCache(namespace = null) {
    const statement = namespace
      ? this.db.prepare('DELETE FROM qflow_cache WHERE namespace = ?')
      : this.db.prepare('DELETE FROM qflow_cache');
    const result = namespace ? statement.run(namespace) : statement.run();
    return result.changes;
  }

  loadSideEffect(runId, operationId) {
    const row = this.db.prepare(`
      SELECT * FROM qflow_side_effects WHERE run_id = ? AND operation_id = ?
    `).get(runId, operationId);
    if (!row) return null;

    return {
      runId: row.run_id,
      operationId: row.operation_id,
      kind: row.kind,
      status: row.status,
      result: parseJson(row.result_json),
      error: parseJson(row.error_json),
      claimedBy: row.claimed_by ?? null,
      leaseExpiresAt: row.lease_expires_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  #handleExistingSideEffect(existing, { operationId, onPending, workerId }) {
    if (existing.status === 'completed') {
      return { result: existing.result, replayed: true, operationId, status: 'completed' };
    }
    if (onPending === 'return-null') {
      return { result: null, replayed: true, operationId, status: existing.status };
    }
    if (existing.status === 'failed' && onPending === 'retry') return null;
    if (
      existing.status === 'pending' &&
      existing.claimedBy &&
      existing.claimedBy !== workerId &&
      existing.leaseExpiresAt > Date.now()
    ) {
      throw new SideEffectClaimedError(operationId, existing.claimedBy);
    }
    throw new SideEffectUncertainError(operationId);
  }

  /**
   * Reserve an operation with an INSERT (never an upsert) before running it.
   * Completed operations replay their result; reserved-but-unfinished
   * operations are uncertain, and operations claimed by a live worker are
   * refused so two workers cannot execute the same effect.
   */
  async runSideEffect({
    runId,
    operationId,
    execute,
    kind = 'side_effect',
    onPending = 'error',
    workerId = this.workerId,
    leaseMs = this.leaseMs,
  }) {
    if (!runId || !operationId) throw new Error('runSideEffect requires runId and operationId.');
    if (typeof execute !== 'function') throw new Error('runSideEffect requires an execute function.');

    const now = new Date().toISOString();
    const leaseExpiresAt = Date.now() + Math.max(0, leaseMs);
    let reserved = false;

    for (let attempt = 0; attempt < 2 && !reserved; attempt += 1) {
      const current = this.loadSideEffect(runId, operationId);
      if (!current) {
        // INSERT OR IGNORE: a concurrent worker wins the row and we must not
        // reset its reservation (which is what the old upsert did).
        const reservation = this.db.prepare(`
          INSERT OR IGNORE INTO qflow_side_effects (
            run_id, operation_id, kind, status, result_json, error_json,
            claimed_by, lease_expires_at, created_at, updated_at
          ) VALUES (?, ?, ?, 'pending', NULL, NULL, ?, ?, ?, ?)
        `).run(runId, operationId, kind, workerId, leaseExpiresAt, now, now);
        reserved = reservation.changes > 0;
        continue;
      }

      const outcome = this.#handleExistingSideEffect(current, { operationId, onPending, workerId });
      if (outcome) return outcome;
      // Only reached for failed + retry: take ownership of the failed row.
      const claimed = this.db.prepare(`
        UPDATE qflow_side_effects
        SET status = 'pending', claimed_by = ?, lease_expires_at = ?, error_json = NULL, updated_at = ?
        WHERE run_id = ? AND operation_id = ? AND status = 'failed'
      `).run(workerId, leaseExpiresAt, now, runId, operationId);
      reserved = claimed.changes > 0;
    }
    if (!reserved) throw new SideEffectUncertainError(operationId);

    try {
      const result = await execute();
      this.db.prepare(`
        UPDATE qflow_side_effects
        SET status = 'completed', result_json = ?, error_json = NULL,
            claimed_by = NULL, lease_expires_at = NULL, updated_at = ?
        WHERE run_id = ? AND operation_id = ?
      `).run(stringify(result), new Date().toISOString(), runId, operationId);
      return { result, replayed: false, operationId, status: 'completed' };
    } catch (error) {
      this.db.prepare(`
        UPDATE qflow_side_effects
        SET status = 'failed', result_json = NULL, error_json = ?,
            claimed_by = NULL, lease_expires_at = NULL, updated_at = ?
        WHERE run_id = ? AND operation_id = ?
      `).run(
        stringify({ message: error.message, stack: error.stack }),
        new Date().toISOString(),
        runId,
        operationId,
      );
      throw error;
    }
  }

  /** Release a dead worker's claim so an explicit retry can take over. */
  failSideEffect(runId, operationId, error = { message: 'Released by operator' }) {
    this.db.prepare(`
      UPDATE qflow_side_effects
      SET status = 'failed', error_json = ?, claimed_by = NULL, lease_expires_at = NULL, updated_at = ?
      WHERE run_id = ? AND operation_id = ?
    `).run(stringify(error), new Date().toISOString(), runId, operationId);
    return this.loadSideEffect(runId, operationId);
  }

  listSideEffects(runId) {
    return this.db.prepare(`
      SELECT run_id, operation_id, kind, status, claimed_by, lease_expires_at, created_at, updated_at
      FROM qflow_side_effects WHERE run_id = ? ORDER BY created_at
    `).all(runId).map(row => ({
      runId: row.run_id,
      operationId: row.operation_id,
      kind: row.kind,
      status: row.status,
      claimedBy: row.claimed_by ?? null,
      leaseExpiresAt: row.lease_expires_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
  constructor(start = null, {
    checkpointer,
    name,
    version = '1.0.0',
    onVersionMismatch = 'abort',
    migrate = null,
    workerId = null,
    leaseMs = null,
  } = {}) {
    super(start);
    this.checkpointer = checkpointer ?? new SQLiteCheckpointer(':memory:');
    this.flowName = name ?? this.constructor.name;
    this.version = version;
    this.onVersionMismatch = onVersionMismatch;
    this.migrate = migrate;
    this.workerId = workerId ?? this.checkpointer.workerId ?? null;
    this.leaseMs = leaseMs ?? this.checkpointer.leaseMs ?? null;
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

  /** Find a resume cursor by index, falling back to the saved node class. */
  findNodeByIndex(index, target, nodeClass = null) {
    for (const [node, nodeIndex] of index) {
      if (nodeIndex === target) return node;
    }
    if (nodeClass) {
      for (const node of index.keys()) {
        if (node.constructor.name === nodeClass) return node;
      }
    }
    return this.startNode;
  }

  #checkVersion(state, runId, shared, flowObserver) {
    const saved = state.flowVersion ?? null;
    const current = this.version ?? null;
    if (saved === current) return shared;

    const detail = { runId, expected: saved, actual: current, step: state.step };
    if (this.onVersionMismatch === 'migrate') {
      const result = typeof this.migrate === 'function'
        ? this.migrate({ ...detail, shared, checkpoints: this.checkpointer.listCheckpoints(runId) })
        : null;
      const migrated = result && typeof result === 'object' ? result : shared;
      this.checkpointer.setFlowVersion?.(runId, current);
      flowObserver.emit('flow:version_migrated', detail);
      return migrated;
    }
    if (this.onVersionMismatch === 'ignore') {
      flowObserver.emit('flow:version_mismatch', { ...detail, policy: 'ignore' });
      return shared;
    }
    throw new FlowVersionMismatchError(runId, saved, current);
  }

  async runDurable({ shared = {}, runId = crypto.randomUUID(), resume = false, signal, observer = {} } = {}) {
    const flowObserver = this._createFlowObserver(runId, observer);
    const context = {
      ...flowObserver,
      runId,
      signal,
      checkpointer: this.checkpointer,
      workerId: this.workerId,
      leaseMs: this.leaseMs,
    };
    let state;

    if (resume) {
      state = this.checkpointer.loadRun(runId);
      if (!state) throw new Error(`Cannot resume run '${runId}': no saved state found.`);
      shared = state.shared;
      this.setParams(state.params ?? {});
      shared = this.#checkVersion(state, runId, shared, flowObserver) ?? shared;
    } else {
      state = { status: 'running', step: 0, cursorNodeIndex: null };
      this.checkpointer.startRun({
        runId,
        flowName: this.flowName,
        shared,
        params: this.params,
        version: this.version,
      });
    }

    flowObserver.emit(resume ? 'run:resumed' : 'run:start', {
      runId,
      flowName: this.flowName,
      flowVersion: this.version,
      status: state.status,
      step: state.step,
    });

    const nodeIndex = this.buildNodeIndex();
    const checkpoints = this.checkpointer.listCheckpoints(runId);
    const lastCheckpoint = checkpoints[checkpoints.length - 1];
    // A run that failed before its first checkpoint has no cursor yet; retry
    // from the start node rather than silently completing with no work done.
    let curr = resume && state.cursorNodeIndex != null
      ? this.findNodeByIndex(nodeIndex, state.cursorNodeIndex, lastCheckpoint?.nodeClass)
      : this.startNode;
    if (resume && lastCheckpoint?.nodeClass && curr?.constructor?.name !== lastCheckpoint.nodeClass) {
      flowObserver.emit('flow:node_remapped', {
        runId,
        from: lastCheckpoint.nodeClass,
        to: curr?.constructor?.name ?? null,
      });
    }
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
          flowVersion: this.version,
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

      this.checkpointer.setRunDueAt?.(runId, null);
      this.checkpointer.updateRunStatus(runId, 'completed', { step, shared, result: lastResult });
      flowObserver.emit('run:end', { runId, status: 'completed', step, result: lastResult });
      return { runId, result: lastResult, shared, steps: step, resumed: resume, status: 'completed' };
    } catch (error) {
      if (error instanceof ApprovalPendingError) {
        this.checkpointer.setRunDueAt?.(runId, null);
        this.checkpointer.updateRunStatus(runId, 'suspended', { step, shared, result: null });
        flowObserver.emit('approval:pending', {
          runId, approvalId: error.approvalId, prompt: error.prompt, step,
        });
        flowObserver.emit('run:end', { runId, status: 'suspended', step, approvalId: error.approvalId });
        return {
          runId, result: null, shared, steps: step, resumed: resume,
          status: 'suspended', suspended: true, approvalId: error.approvalId,
        };
      }
      if (error instanceof SchedulePendingError) {
        this.checkpointer.setRunDueAt?.(runId, error.dueAt);
        this.checkpointer.updateRunStatus(runId, 'scheduled', { step, shared, result: null });
        flowObserver.emit('schedule:pending', {
          runId, scheduleId: error.scheduleId, dueAt: error.dueAt, step,
        });
        flowObserver.emit('run:end', { runId, status: 'scheduled', step, dueAt: error.dueAt });
        return {
          runId, result: null, shared, steps: step, resumed: resume,
          status: 'scheduled', suspended: true, scheduled: true,
          scheduleId: error.scheduleId, dueAt: error.dueAt,
        };
      }
      this.checkpointer.setRunDueAt?.(runId, null);
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

// The durable subpath is the single entry point for long-lived run control.
export { WaitForApprovalNode, resolveApprovalId } from './approval.js';
export { ScheduleNode, nextCronTime } from './schedule.js';
export { BudgetNode, BudgetTracker } from './budget.js';
export {
  ApprovalPendingError,
  SchedulePendingError,
  FlowVersionMismatchError,
  SideEffectClaimedError,
  SideEffectUncertainError,
  BudgetExceededError,
} from './util.js';
