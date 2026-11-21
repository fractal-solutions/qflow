import { AsyncFlow, AsyncNode } from './qflow.js';
import { normalizeTrace, serializeTrace } from './trace.js';

const DEFAULT_IGNORED_KEYS = new Set([
  'seq', 'startTime', 'endTime', 'duration', 'timestamp', 'stack', 'flowId', 'parentFlowId', 'updatedAt', 'createdAt',
]);

export function deepDiff(expected, actual, { path = '', ignoreKeys = [], tolerance = 0 } = {}) {
  const differences = [];
  const ignored = new Set([...DEFAULT_IGNORED_KEYS, ...ignoreKeys]);

  const compare = (left, right, currentPath) => {
    if (Object.prototype.hasOwnProperty.call(left ?? {}, '$ignore')) return;
    if (typeof left === 'number' && typeof right === 'number') {
      if (Math.abs(left - right) > tolerance) differences.push({ path: currentPath, expected: left, actual: right });
      return;
    }
    if (left === right) return;
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        differences.push({ path: `${currentPath}.length`, expected: left.length, actual: right.length });
      }
      const length = Math.min(left.length, right.length);
      for (let index = 0; index < length; index += 1) compare(left[index], right[index], `${currentPath}[${index}]`);
      return;
    }
    if (left && right && typeof left === 'object' && typeof right === 'object') {
      const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
      for (const key of keys) {
        if (ignored.has(key)) continue;
        compare(left[key], right[key], currentPath ? `${currentPath}.${key}` : key);
      }
      return;
    }
    differences.push({ path: currentPath || 'root', expected: left, actual: right });
  };

  compare(expected, actual, path);
  return differences;
}

function looksLikeTrace(value) {
  return Boolean(value && typeof value === 'object' && (Array.isArray(value.events) || Array.isArray(value.spans)));
}

export function compareTraces(expected, actual, options = {}) {
  const left = looksLikeTrace(expected) ? normalizeTrace(expected) : expected;
  const right = looksLikeTrace(actual) ? normalizeTrace(actual) : actual;
  const fields = options.fields ?? ['status', 'events', 'spans', 'checkpoints'];
  const projected = trace => Object.fromEntries(fields.map(field => [field, trace?.[field]]));
  const differences = deepDiff(projected(left), projected(right), options);

  return {
    equal: differences.length === 0,
    differences,
    expected: left,
    actual: right,
  };
}

function applyOperator(operator, actual, expected) {
  switch (operator) {
    case 'eq': return actual === expected;
    case 'ne': return actual !== expected;
    case 'deepEqual': return JSON.stringify(actual) === JSON.stringify(expected);
    case 'gt': return actual > expected;
    case 'gte': return actual >= expected;
    case 'lt': return actual < expected;
    case 'lte': return actual <= expected;
    case 'contains': return String(actual ?? '').includes(String(expected));
    case 'truthy': return Boolean(actual);
    case 'falsy': return !actual;
    default: throw new Error(`Unknown assertion operator '${operator}'.`);
  }
}

function actionForNode(node, action) {
  return Object.keys(node.successors).length ? action : action === 'pass' || action === 'equal' ? true : false;
}

/** Deterministic pass/fail check for regression flows. */
export class AssertNode extends AsyncNode {
  constructor({
    condition = null,
    operator = 'eq',
    expected = true,
    actualKey = 'actual',
    outputKey = 'assertions',
    throwOnFailure = false,
  } = {}) {
    super();
    this.condition = condition;
    this.operator = operator;
    this.expected = expected;
    this.actualKey = actualKey;
    this.outputKey = outputKey;
    this.throwOnFailure = throwOnFailure;
  }

  async prepAsync(shared = {}) {
    const actual = this.params.actual ?? shared[this.params.actualKey ?? this.actualKey];
    const expected = this.params.expected ?? this.expected;
    return { actual, expected };
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    const condition = this.params.condition ?? this.condition;
    let passed;
    if (typeof condition === 'function') passed = Boolean(await condition(prepRes.actual, shared, observer));
    else if (typeof condition === 'boolean') passed = condition;
    else passed = applyOperator(this.params.operator ?? this.operator, prepRes.actual, prepRes.expected);

    const result = {
      passed,
      operator: this.params.operator ?? this.operator,
      expected: prepRes.expected,
      actual: prepRes.actual,
      message: this.params.message ?? `${passed ? 'Assertion passed' : 'Assertion failed'}`,
    };
    observer.emit?.('eval:assert', result);
    if (!passed && (this.params.throwOnFailure ?? this.throwOnFailure)) {
      throw new Error(result.message);
    }
    return result;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.outputKey] = [...(shared[this.outputKey] ?? []), execRes];
    return actionForNode(this, execRes.passed ? 'pass' : 'fail');
  }
}

/** Numeric scorer with a threshold and structured output. */
export class ScoreNode extends AsyncNode {
  constructor({ scorer = null, threshold = 0.8, outputKey = 'score' } = {}) {
    super();
    this.scorer = scorer;
    this.threshold = threshold;
    this.outputKey = outputKey;
  }

  async prepAsync(shared = {}) {
    return {
      actual: this.params.actual ?? shared.actual ?? shared.llmResult,
      expected: this.params.expected ?? shared.expected,
    };
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    const scorer = this.params.scorer ?? this.scorer;
    if (typeof scorer !== 'function') throw new Error('ScoreNode requires a scorer function.');
    const score = await scorer(prepRes.actual, prepRes.expected, shared, observer);
    const threshold = this.params.threshold ?? this.threshold;
    const result = {
      score: typeof score === 'number' ? score : score?.score ?? 0,
      threshold,
      passed: (typeof score === 'number' ? score : score?.score ?? 0) >= threshold,
      details: typeof score === 'number' ? null : score?.details ?? null,
    };
    observer.emit?.('eval:score', result);
    return result;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.outputKey] = execRes;
    return actionForNode(this, execRes.passed ? 'pass' : 'fail');
  }
}

/** Diff two payloads or two normalized traces. */
export class CompareNode extends AsyncNode {
  constructor({ expected = null, actual = null, actualKey = 'actual', outputKey = 'comparison', fields = null } = {}) {
    super();
    this.expected = expected;
    this.actual = actual;
    this.actualKey = actualKey;
    this.outputKey = outputKey;
    this.fields = fields;
  }

  async prepAsync(shared = {}) {
    return {
      expected: this.params.expected ?? this.expected ?? shared.expected,
      actual: this.params.actual ?? this.actual ?? shared[this.params.actualKey ?? this.actualKey],
    };
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    const result = compareTraces(prepRes.expected, prepRes.actual, {
      ...(this.params.compareOptions ?? {}),
      ...(this.fields ? { fields: this.params.fields ?? this.fields } : {}),
    });
    observer.emit?.('eval:compare', { equal: result.equal, differences: result.differences });
    return result;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.outputKey] = execRes;
    return actionForNode(this, execRes.equal ? 'equal' : 'different');
  }
}

/** Replay a saved trace into a flow, then compare the resulting trace. */
export class ReplayNode extends AsyncNode {
  constructor({ trace = null, tracePath = null, flow = null, flowFactory = null, outputKey = 'replay' } = {}) {
    super();
    this.trace = trace;
    this.tracePath = tracePath;
    this.flow = flow;
    this.flowFactory = flowFactory;
    this.outputKey = outputKey;
  }

  async loadTrace(shared = {}) {
    const source = this.params.trace ?? this.trace ?? shared.trace;
    if (source) return normalizeTrace(source);
    const path = this.params.tracePath ?? this.tracePath ?? shared.tracePath;
    if (path) {
      if (!globalThis.Bun?.file) throw new Error('ReplayNode trace loading requires the Bun runtime.');
      const text = await globalThis.Bun.file(path).text();
      return normalizeTrace(JSON.parse(text));
    }
    throw new Error('ReplayNode requires a trace object or tracePath.');
  }

  async prepAsync(shared = {}) {
    const trace = await this.loadTrace(shared);
    const initialShared = this.params.shared
      ?? trace.checkpoints?.[0]?.shared
      ?? trace.events?.find(event => event.shared)?.shared
      ?? {};
    return { trace, initialShared };
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    const factory = this.params.flowFactory ?? this.flowFactory;
    const target = factory
      ? await factory({ ...prepRes.initialShared }, { trace: prepRes.trace, observer })
      : this.params.flow ?? this.flow;
    if (!target || typeof target.runAsync !== 'function') {
      throw new Error('ReplayNode requires an AsyncFlow or a flowFactory.');
    }

    const events = [];
    target.onAny?.(entry => events.push({ event: entry.event, payload: entry.payload }));
    const result = await target.runAsync({ ...prepRes.initialShared }, observer);
    const actual = normalizeTrace({
      runId: prepRes.trace.runId,
      flowName: prepRes.trace.flowName,
      events,
    });
    // Checkpoints are metadata of the saved run, not an output of replaying a
    // fresh flow, so compare observed behaviour by default.
    const comparison = compareTraces(prepRes.trace, actual, {
      fields: ['status', 'events', 'spans'],
      ...(this.params.compareOptions ?? {}),
    });
    observer.emit?.('eval:replay', { equal: comparison.equal, differences: comparison.differences.length });

    return {
      result,
      actual,
      comparison,
      expectedTrace: serializeTrace(prepRes.trace),
      actualTrace: serializeTrace(actual),
    };
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.outputKey] = execRes;
    return actionForNode(this, execRes.comparison.equal ? 'equal' : 'different');
  }
}

export function createEvalSuite(flow, cases = []) {
  return {
    cases,
    async run() {
      const results = [];
      for (const testCase of cases) {
        const shared = { ...(testCase.shared ?? {}) };
        const result = await flow.runAsync(shared);
        results.push({ name: testCase.name ?? `case-${results.length + 1}`, result, shared });
      }
      return results;
    },
  };
}

export { AsyncFlow };
