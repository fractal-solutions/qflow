import { AsyncNode } from './qflow.js';
import { stableHash, resolveTemplate, SideEffectClaimedError, SideEffectUncertainError } from './util.js';

export { SideEffectClaimedError, SideEffectUncertainError };

export async function resolveOperationId(operationId, { params = {}, shared = {}, kind = 'side_effect' } = {}) {
  if (typeof operationId === 'function') {
    return String(await operationId({ params, shared, kind }));
  }
  if (operationId === true || operationId == null) {
    return `${kind}:${stableHash({ params, shared })}`;
  }
  const rendered = resolveTemplate(String(operationId), { ...shared, ...params, params, shared });
  return rendered.trim() ? `${kind}:${rendered}` : `${kind}:${stableHash({ params, shared })}`;
}

/**
 * Run an external side effect at most once per operation ID per durable run.
 * Completed operations return their recorded result; reserved-but-unfinished
 * operations raise `SideEffectUncertainError` instead of running twice.
 */
export async function withReplaySafeSideEffect({
  params = {},
  shared = {},
  observer = {},
  execute,
  kind = 'side_effect',
  operationId = null,
  onPending = 'error',
  workerId = null,
  leaseMs = null,
}) {
  if (typeof execute !== 'function') throw new Error('withReplaySafeSideEffect requires an execute function.');

  const checkpointer = params.checkpointer ?? observer.checkpointer;
  const runId = params.runId ?? observer.runId;
  if (!checkpointer || !runId || !operationId) {
    return { result: await execute(), replayed: false, operationId: null, status: 'executed' };
  }
  if (typeof checkpointer.runSideEffect !== 'function') {
    throw new Error('Replay-safe side effects require a checkpointer with runSideEffect().');
  }

  const id = await resolveOperationId(operationId, { params, shared, kind });
  const outcome = await checkpointer.runSideEffect({
    runId,
    operationId: id,
    kind,
    onPending,
    workerId: workerId ?? params.workerId ?? observer.workerId,
    leaseMs: leaseMs ?? params.leaseMs ?? observer.leaseMs,
    execute,
  });

  if (outcome.replayed) {
    observer.emit?.('side_effect:replay', {
      runId,
      operationId: id,
      kind,
      status: outcome.status,
    });
  } else {
    observer.emit?.('side_effect:committed', {
      runId,
      operationId: id,
      kind,
      status: outcome.status,
    });
  }
  return outcome;
}

/** Generic node wrapper for any side effect that should be replay-safe. */
export class ReplaySafeNode extends AsyncNode {
  constructor({
    execute,
    operationId = true,
    kind = 'side_effect',
    resultKey = 'replaySafeResult',
    inputKey = 'input',
    onPending = 'error',
    workerId = null,
    leaseMs = null,
    maxRetries = 1,
    wait = 0,
  } = {}) {
    super(maxRetries, wait);
    if (typeof execute !== 'function') throw new Error('ReplaySafeNode requires an execute function.');
    this.execute = execute;
    this.operationId = operationId;
    this.kind = kind;
    this.resultKey = resultKey;
    this.inputKey = inputKey;
    this.onPending = onPending;
    this.workerId = workerId;
    this.leaseMs = leaseMs;
  }

  async prepAsync(shared = {}) {
    return shared[this.inputKey] ?? this.params.input ?? null;
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    const outcome = await withReplaySafeSideEffect({
      params: this.params,
      shared,
      observer,
      kind: this.kind,
      operationId: this.params.operationId ?? this.operationId,
      onPending: this.params.onPendingSideEffect ?? this.onPending,
      workerId: this.params.workerId ?? this.workerId,
      leaseMs: this.params.leaseMs ?? this.leaseMs,
      execute: () => this.execute({ input: prepRes, params: this.params, shared, observer }),
    });
    return outcome.result;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.resultKey] = execRes;
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}
