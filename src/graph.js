import { AsyncFlow, AsyncNode } from './qflow.js';

/**
 * Run several branches against copies of `shared`, then collect their results.
 * Branches may be nodes or AsyncFlow instances.
 */
export class FanOutNode extends AsyncNode {
  constructor({ branches = [], parallel = true, resultKey = 'fanOutResults' } = {}) {
    super();
    this.branches = [...branches];
    this.parallel = parallel;
    this.resultKey = resultKey;
  }

  async execAsync(prepRes, shared, observer = {}) {
    const runBranch = async branch => {
      const branchShared = { ...shared };
      if (branch instanceof AsyncFlow) {
        return await branch.runAsync(branchShared, observer);
      }
      return await new AsyncFlow(branch).runAsync(branchShared, observer);
    };

    if (this.parallel) {
      return await Promise.all(this.branches.map(runBranch));
    }

    const results = [];
    for (const branch of this.branches) {
      results.push(await runBranch(branch));
    }
    return results;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.resultKey] = execRes;
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}

/** Combine `shared.fanOutResults` (or a custom key) into one result. */
export class FanInNode extends AsyncNode {
  constructor({ combine, inputKey = 'fanOutResults', outputKey = 'fanInResult' } = {}) {
    super();
    this.combine = combine ?? (results => results);
    this.inputKey = inputKey;
    this.outputKey = outputKey;
  }

  async prepAsync(shared) {
    return shared[this.inputKey] ?? this.params.input;
  }

  async execAsync(prepRes, shared, observer = {}) {
    return typeof this.combine === 'function'
      ? await this.combine(prepRes, shared, observer)
      : this.combine;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.outputKey] = execRes;
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}
