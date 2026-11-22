/** Small, dependency-free helpers shared by the 2.0 node families. */

export function stableStringify(value, seen = new WeakSet()) {
  if (value == null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (seen.has(value)) return '"[Circular]"';
  seen.add(value);

  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item, seen)).join(',')}]`;
  }

  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value instanceof Error) return JSON.stringify({ name: value.name, message: value.message });

  const keys = Object.keys(value).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key], seen)}`).join(',')}}`;
}

/** Deterministic 32-bit hash, useful for operation and idempotency keys. */
export function stableHash(value) {
  const input = typeof value === 'string' ? value : stableStringify(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function cloneValue(value, seen = new WeakSet()) {
  if (value == null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => cloneValue(item, seen));
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return { name: value.name, message: value.message };
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = cloneValue(child, seen);
  }
  return result;
}

export class SideEffectUncertainError extends Error {
  constructor(operationId, message) {
    super(message ?? `Side effect '${operationId}' was reserved but never recorded as completed. It must not be retried automatically.`);
    this.name = 'SideEffectUncertainError';
    this.code = 'QFLOW_SIDE_EFFECT_UNCERTAIN';
    this.operationId = operationId;
  }
}

/** Another worker holds an active lease on an operation; do not execute it. */
export class SideEffectClaimedError extends SideEffectUncertainError {
  constructor(operationId, claimedBy, message) {
    super(
      operationId,
      message ?? `Side effect '${operationId}' is currently claimed by worker '${claimedBy}'. Wait for its lease to expire or for the owner to finish.`
    );
    this.name = 'SideEffectClaimedError';
    this.code = 'QFLOW_SIDE_EFFECT_CLAIMED';
    this.claimedBy = claimedBy;
  }
}

/** A durable run is waiting for a human/webhook decision. */
export class ApprovalPendingError extends Error {
  constructor(approvalId, { runId = null, prompt = null, step = 0 } = {}) {
    super(`Approval '${approvalId}' is pending for run '${runId ?? 'unknown'}'.`);
    this.name = 'ApprovalPendingError';
    this.code = 'QFLOW_APPROVAL_PENDING';
    this.approvalId = approvalId;
    this.runId = runId;
    this.prompt = prompt;
    this.step = step;
  }
}

/** A durable run is waiting until a future time. */
export class SchedulePendingError extends Error {
  constructor(scheduleId, { runId = null, dueAt = 0, step = 0 } = {}) {
    super(`Schedule '${scheduleId}' is not due until ${new Date(dueAt).toISOString()}.`);
    this.name = 'SchedulePendingError';
    this.code = 'QFLOW_SCHEDULE_PENDING';
    this.scheduleId = scheduleId;
    this.runId = runId;
    this.dueAt = dueAt;
    this.step = step;
  }
}

/** A resumed run targets a different flow version than the one it started with. */
export class FlowVersionMismatchError extends Error {
  constructor(runId, expected, actual, message) {
    super(message ?? `Run '${runId}' was started with flow version '${expected}' but the current flow is '${actual}'.`);
    this.name = 'FlowVersionMismatchError';
    this.code = 'QFLOW_FLOW_VERSION_MISMATCH';
    this.runId = runId;
    this.expected = expected;
    this.actual = actual;
  }
}

/** A run exceeded a configured cost/token/latency/step budget. */
export class BudgetExceededError extends Error {
  constructor(reasons = [], snapshot = {}, message) {
    super(message ?? `Budget exceeded: ${reasons.join(', ') || 'limit reached'}.`);
    this.name = 'BudgetExceededError';
    this.code = 'QFLOW_BUDGET_EXCEEDED';
    this.reasons = reasons;
    this.snapshot = snapshot;
  }
}

export function resolveTemplate(template, context) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, rawPath) => {
    const path = rawPath.trim();
    const parts = path.split('.');
    let value = context;
    for (const part of parts) {
      if (value == null) return '';
      value = value[part];
    }
    return value == null ? '' : String(value);
  });
}
