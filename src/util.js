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
