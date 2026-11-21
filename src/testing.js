import { AsyncNode, AsyncFlow } from './qflow.js';

function clone(value) {
  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
}

function stableId(map, prefix, value) {
  if (!map.has(value)) map.set(value, `${prefix}:${map.size + 1}`);
  return map.get(value);
}

const VOLATILE_KEYS = new Set(['startTime', 'endTime', 'duration', 'timestamp', 'stack']);

/**
 * AsyncNode with queued responses and a record of every execution.
 *
 * `postAction` controls the flow action returned from `postAsync`; it defaults
 * to the exec result, which is what most standalone/mock nodes want.
 */
export class MockNode extends AsyncNode {
  constructor({
    name = 'MockNode',
    responses = [],
    error = null,
    postAction = execRes => execRes,
    maxRetries = 1,
    wait = 0,
  } = {}) {
    super(maxRetries, wait);
    this.mockName = name;
    this.responses = [...responses];
    this.error = error;
    this.postAction = postAction;
    this.calls = [];
    this.results = [];
  }

  async execAsync(prepRes, shared, observer = {}) {
    this.calls.push({
      index: this.calls.length,
      prepRes: clone(prepRes),
      shared: clone(shared),
      params: clone(this.params),
      flowId: observer.flowId,
    });

    if (this.error) {
      const failure = typeof this.error === 'function'
        ? await this.error(prepRes, shared, observer)
        : this.error;
      throw failure instanceof Error ? failure : new Error(String(failure));
    }

    if (this.responses.length === 0) return undefined;
    const response = this.responses.shift();
    return typeof response === 'function'
      ? await response(prepRes, shared, observer)
      : response;
  }

  async postAsync(shared, prepRes, execRes, observer = {}) {
    this.results.push(clone(execRes));
    return typeof this.postAction === 'function'
      ? await this.postAction(execRes, shared, prepRes, observer)
      : this.postAction;
  }

  reset({ responses } = {}) {
    this.calls = [];
    this.results = [];
    if (responses) this.responses = [...responses];
    return this;
  }
}

/** A MockNode that mimics the LLM nodes used by agents. */
export class MockLLMNode extends MockNode {
  constructor(options = {}) {
    super({ name: 'MockLLMNode', postAction: execRes => execRes, ...options });
  }
}

/** Attach to a flow and collect a normalized, snapshot-friendly event trace. */
export function recordFlow(flow) {
  const events = [];
  flow.onAny(entry => events.push({ event: entry.event, payload: entry.payload }));

  return {
    events,
    snapshot(options) {
      return createTraceSnapshot(events, options);
    },
    clear() {
      events.length = 0;
      return this;
    },
  };
}

/** Convert captured events into deterministic snapshots for `expect(...).toMatchSnapshot()`. */
export function createTraceSnapshot(events = [], { includeTiming = false, includeIds = false } = {}) {
  const flowIds = new Map();
  const runIds = new Map();

  const clean = (value, key) => {
    if (!includeIds && (key === 'flowId' || key === 'parentFlowId') && value != null) {
      return stableId(flowIds, 'flow', String(value));
    }
    if (!includeIds && key === 'runId' && value != null) {
      return stableId(runIds, 'run', String(value));
    }
    if (value instanceof Error) {
      return { name: value.name, message: value.message };
    }
    if (typeof value === 'function') {
      return '[Function]';
    }
    if (Array.isArray(value)) {
      return value.map(item => clean(item));
    }
    if (value && typeof value === 'object') {
      const result = {};
      for (const [childKey, childValue] of Object.entries(value)) {
        if (!includeTiming && VOLATILE_KEYS.has(childKey)) continue;
        result[childKey] = clean(childValue, childKey);
      }
      return result;
    }
    return value;
  };

  return events.map(entry => {
    const event = entry.event;
    const payload = entry.payload ?? entry;
    return { event, ...clean(payload) };
  });
}

export { AsyncFlow };
