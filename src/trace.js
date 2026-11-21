/**
 * Trace normalization helpers shared by testing, durable runs, and the trace
 * viewer. The output is plain JSON so it can be saved, shipped, or pasted into
 * the site viewer without pulling in Bun-specific modules.
 */

export const TRACE_SCHEMA = 'qflow.trace/v1';

function cloneValue(value, seen = new WeakSet()) {
  if (value == null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[Circular]';

  seen.add(value);
  if (Array.isArray(value)) return value.map(item => cloneValue(item, seen));

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = cloneValue(child, seen);
  }
  return result;
}

function normalizeEvent(entry, index) {
  if (typeof entry === 'string') return { seq: index, event: entry };
  if (!entry || typeof entry !== 'object') {
    return { seq: index, event: 'log', message: String(entry) };
  }

  const { event, type, payload, ...topLevel } = entry;
  const eventName = event ?? type ?? 'custom';
  const payloadObject = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? cloneValue(payload)
    : null;

  if (payloadObject) {
    return { seq: index, event: eventName, ...cloneValue(topLevel), ...payloadObject };
  }

  return {
    seq: index,
    event: eventName,
    ...cloneValue(topLevel),
    ...(payload !== undefined ? { message: cloneValue(payload) } : {}),
  };
}

function lastDefined(events, key) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const value = events[i]?.[key];
    if (value != null) return cloneValue(value);
  }
  return null;
}

function firstTime(events, keys) {
  for (const event of events) {
    for (const key of keys) {
      if (event?.[key] != null) return event[key];
    }
  }
  return null;
}

function lastTime(events, keys) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    for (const key of keys) {
      if (events[i]?.[key] != null) return events[i][key];
    }
  }
  return null;
}

function deriveStatus(events) {
  const terminal = [...events].reverse().find(event =>
    event.event === 'flow:end' || event.event === 'run:end'
  );
  if (terminal?.status) return terminal.status;
  if (terminal?.error || events.some(event => event.error || event.status === 'error')) return 'failed';
  if (events.some(event => event.event === 'flow:start' || event.event === 'run:start')) return 'running';
  return 'unknown';
}

function spanKey(event) {
  if (event.nodeClass) return `node:${event.flowId ?? event.runId ?? ''}:${event.nodeClass}`;
  if (event.event?.startsWith('flow:')) return `flow:${event.flowId ?? ''}`;
  return `run:${event.runId ?? ''}`;
}

/** Pair `*:start` / `*:end` events into timeline spans. */
export function buildTraceSpans(events = []) {
  const open = new Map();
  const spans = [];

  for (const event of events) {
    const name = event.event ?? '';
    if (name === 'node:start' || name === 'flow:start' || name === 'run:start') {
      const key = spanKey(event);
      open.set(key, {
        seq: event.seq,
        kind: name.split(':')[0],
        label: event.nodeClass ?? event.flowName ?? event.runId ?? name,
        flowId: event.flowId ?? null,
        runId: event.runId ?? null,
        startTime: event.startTime ?? event.createdAt ?? event.timestamp ?? null,
        endTime: null,
        duration: null,
        status: 'running',
        params: event.params ?? null,
      });
      continue;
    }

    if (name !== 'node:end' && name !== 'flow:end' && name !== 'run:end') continue;

    const key = spanKey(event);
    const span = open.get(key) ?? [...open.entries()].reverse().find(([openKey]) =>
      openKey.startsWith(name.split(':')[0])
    )?.[1];

    if (span) {
      span.endTime = event.endTime ?? event.updatedAt ?? event.timestamp ?? null;
      span.duration = event.duration ?? (
        span.startTime != null && span.endTime != null ? span.endTime - span.startTime : null
      );
      span.status = event.status ?? (event.error ? 'error' : 'success');
      span.error = event.error != null ? cloneValue(event.error) : null;
      span.result = event.result != null ? cloneValue(event.result) : null;
      span.step = event.step ?? null;
      if (span.kind === 'node' && event.nodeClass) span.label = event.nodeClass;
      open.delete(key);
    }

    spans.push({
      seq: event.seq,
      kind: name.split(':')[0],
      label: event.nodeClass ?? event.flowName ?? event.runId ?? name,
      startTime: event.startTime ?? event.createdAt ?? event.timestamp ?? null,
      endTime: event.endTime ?? event.updatedAt ?? event.timestamp ?? null,
      duration: event.duration ?? null,
      status: event.status ?? (event.error ? 'error' : 'instant'),
      error: event.error != null ? cloneValue(event.error) : null,
      step: event.step ?? null,
    });
  }

  for (const span of open.values()) {
    span.status = 'open';
    spans.push(span);
  }

  return spans.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
}

/**
 * Accepts a raw event array, `recordFlow()` events, `createTraceSnapshot()`
 * output, an `exportRunTrace()` result, or `{ events, checkpoints }`.
 */
export function normalizeTrace(input) {
  const source = Array.isArray(input)
    ? { events: input }
    : input && typeof input === 'object'
      ? input
      : {};

  const rawEvents = source.events ?? source.trace ?? source.entries ?? [];
  const events = (Array.isArray(rawEvents) ? rawEvents : []).map(normalizeEvent);
  const checkpoints = (Array.isArray(source.checkpoints) ? source.checkpoints : [])
    .map(checkpoint => cloneValue(checkpoint));

  return {
    schema: TRACE_SCHEMA,
    runId: source.runId ?? lastDefined(events, 'runId'),
    flowName: source.flowName ?? lastDefined(events, 'flowName'),
    status: source.status ?? deriveStatus(events),
    steps: source.steps ?? (checkpoints.length || events.filter(event => event.event === 'node:end').length || null),
    startedAt: source.startedAt ?? source.createdAt ?? firstTime(events, ['startTime', 'createdAt', 'timestamp']),
    endedAt: source.endedAt ?? source.updatedAt ?? lastTime(events, ['endTime', 'updatedAt', 'timestamp']),
    events,
    checkpoints,
    spans: buildTraceSpans(events),
  };
}

/** Pretty-printed JSON suitable for download or clipboard. */
export function serializeTrace(trace) {
  return JSON.stringify(normalizeTrace(trace), null, 2);
}

/** Write a trace to disk. Bun-only, matching the 2.0 runtime contract. */
export async function writeTraceFile(trace, filepath) {
  if (typeof globalThis.Bun?.write !== 'function') {
    throw new Error('writeTraceFile() requires the Bun runtime.');
  }
  await globalThis.Bun.write(filepath, serializeTrace(trace));
  return filepath;
}
