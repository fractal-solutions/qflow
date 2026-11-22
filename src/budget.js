import { AsyncNode } from './qflow.js';
import { BudgetExceededError } from './util.js';

export { BudgetExceededError };
export const BUDGET_CHECK_EVENT = 'budget:check';
export const BUDGET_EXCEEDED_EVENT = 'budget:exceeded';

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Accumulates LLM usage and enforces cost/token/latency/step limits. */
export class BudgetTracker {
  constructor({
    maxCost = Infinity,
    maxTokens = Infinity,
    maxDurationMs = Infinity,
    maxSteps = Infinity,
    startedAt = null,
  } = {}) {
    this.limits = { maxCost, maxTokens, maxDurationMs, maxSteps };
    this.startedAt = startedAt ?? Date.now();
    this.totalCost = 0;
    this.totalTokens = 0;
    this.calls = 0;
  }

  record(usage = null, cost = null) {
    this.totalTokens += finite(usage?.total ?? usage?.total_tokens)
      || finite(usage?.prompt) + finite(usage?.completion);
    this.totalCost += finite(cost ?? usage?.cost);
    this.calls += 1;
    return this.snapshot();
  }

  snapshot({ steps = 0, now = Date.now() } = {}) {
    return {
      cost: this.totalCost,
      tokens: this.totalTokens,
      calls: this.calls,
      steps: finite(steps),
      durationMs: Math.max(0, now - this.startedAt),
    };
  }

  check(context = {}) {
    const snapshot = this.snapshot(context);
    const reasons = [];
    if (snapshot.cost > this.limits.maxCost) {
      reasons.push(`cost ${snapshot.cost} > ${this.limits.maxCost}`);
    }
    if (snapshot.tokens > this.limits.maxTokens) {
      reasons.push(`tokens ${snapshot.tokens} > ${this.limits.maxTokens}`);
    }
    if (snapshot.durationMs > this.limits.maxDurationMs) {
      reasons.push(`duration ${snapshot.durationMs}ms > ${this.limits.maxDurationMs}ms`);
    }
    if (snapshot.steps > this.limits.maxSteps) {
      reasons.push(`steps ${snapshot.steps} > ${this.limits.maxSteps}`);
    }
    return { ...snapshot, ...this.limits, reasons, exceeded: reasons.length > 0 };
  }

  assertWithin(context = {}) {
    const result = this.check(context);
    if (result.exceeded) throw new BudgetExceededError(result.reasons, result);
    return result;
  }

  reset({ startedAt = Date.now() } = {}) {
    this.startedAt = startedAt;
    this.totalCost = 0;
    this.totalTokens = 0;
    this.calls = 0;
    return this;
  }
}

/** Route a run to `exceeded` when cost/token/latency/step limits are crossed. */
export class BudgetNode extends AsyncNode {
  constructor({
    maxCost = Infinity,
    maxTokens = Infinity,
    maxDurationMs = Infinity,
    maxSteps = Infinity,
    tracker = null,
    limitsKey = 'budget',
    outputKey = 'budget',
    throwOnExceed = false,
  } = {}) {
    super();
    this.maxCost = maxCost;
    this.maxTokens = maxTokens;
    this.maxDurationMs = maxDurationMs;
    this.maxSteps = maxSteps;
    this.tracker = tracker;
    this.limitsKey = limitsKey;
    this.outputKey = outputKey;
    this.throwOnExceed = throwOnExceed;
  }

  async prepAsync(shared = {}) {
    const limits = {
      maxCost: this.params.maxCost ?? this.maxCost ?? shared[this.limitsKey]?.maxCost ?? Infinity,
      maxTokens: this.params.maxTokens ?? this.maxTokens ?? shared[this.limitsKey]?.maxTokens ?? Infinity,
      maxDurationMs: this.params.maxDurationMs ?? this.maxDurationMs ?? shared[this.limitsKey]?.maxDurationMs ?? Infinity,
      maxSteps: this.params.maxSteps ?? this.maxSteps ?? shared[this.limitsKey]?.maxSteps ?? Infinity,
    };
    if (shared.budgetStartedAt == null) shared.budgetStartedAt = Date.now();
    return { limits, shared };
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    const { limits } = prepRes;
    const tracker = this.params.tracker ?? this.tracker ?? shared.budgetTracker ?? null;
    const steps = shared.agentFlowSteps ?? shared.steps ?? shared.budgetSteps ?? 0;
    const usage = shared.llmUsage ?? {};
    let snapshot;

    if (tracker && typeof tracker.snapshot === 'function') {
      snapshot = { ...tracker.snapshot({ steps }), limits };
    } else {
      snapshot = {
        cost: shared.llmCost ?? shared.budgetCost ?? 0,
        tokens: usage.total ?? usage.total_tokens ?? shared.budgetTokens ?? 0,
        calls: 0,
        steps: finite(steps),
        durationMs: Math.max(0, Date.now() - (shared.budgetStartedAt ?? Date.now())),
      };
    }

    const reasons = [];
    if (snapshot.cost > limits.maxCost) reasons.push(`cost ${snapshot.cost} > ${limits.maxCost}`);
    if (snapshot.tokens > limits.maxTokens) reasons.push(`tokens ${snapshot.tokens} > ${limits.maxTokens}`);
    if (snapshot.durationMs > limits.maxDurationMs) {
      reasons.push(`duration ${snapshot.durationMs}ms > ${limits.maxDurationMs}ms`);
    }
    if (snapshot.steps > limits.maxSteps) reasons.push(`steps ${snapshot.steps} > ${limits.maxSteps}`);

    const result = { ...snapshot, reasons, exceeded: reasons.length > 0 };
    observer.emit?.(BUDGET_CHECK_EVENT, result);
    if (result.exceeded) {
      observer.emit?.(BUDGET_EXCEEDED_EVENT, result);
      if (this.params.throwOnExceed ?? this.throwOnExceed) {
        throw new BudgetExceededError(result.reasons, result);
      }
    }
    return result;
  }

  async postAsync(shared, _prepRes, execRes) {
    shared[this.outputKey] = execRes;
    if (!Object.keys(this.successors).length) return execRes;
    return execRes.exceeded ? 'exceeded' : 'continue';
  }
}
