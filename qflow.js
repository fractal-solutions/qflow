class BaseNode {
  constructor() {
    this.params = {};
    this.successors = {};
  }

  setParams(params) {
    this.params = params;
  }

  next(node, action = "default") {
    if (this.successors[action]) {
      console.warn(`Overwriting successor for action '${action}'`);
    }
    this.successors[action] = node;
    return node;
  }

  prep(shared) {}
  exec(prepRes) {}
  post(shared, prepRes, execRes) {
    return execRes;
  }

  _exec(prepRes) {
    return this.exec(prepRes);
  }

  _run(shared) {
    const prepRes = this.prep(shared);
    const execRes = this._exec(prepRes);
    return this.post(shared, prepRes, execRes);
  }

  run(shared) {
    if (Object.keys(this.successors).length) {
      console.warn("Node won't run successors. Use Flow.");
    }
    return this._run(shared);
  }

  transition(action) {
    return new ConditionalTransition(this, action);
  }
}

class ConditionalTransition {
  constructor(src, action) {
    this.src = src;
    this.action = action;
  }

  to(tgt) {
    return this.src.next(tgt, this.action);
  }
}

class Node extends BaseNode {
  constructor(maxRetries = 1, wait = 0) {
    super();
    this.maxRetries = maxRetries;
    this.wait = wait;
  }

  execFallback(prepRes, error) {
    throw error;
  }

  _exec(prepRes) {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return this.exec(prepRes);
      } catch (e) {
        if (i === this.maxRetries - 1) return this.execFallback(prepRes, e);
        if (this.wait > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, this.wait * 1000);
      }
    }
  }
}

class BatchNode extends Node {
  _exec(items) {
    return (items || []).map(item => super._exec(item));
  }
}

class Flow extends BaseNode {
  constructor(start = null) {
    super();
    this.startNode = start;
  }

  start(startNode) {
    this.startNode = startNode;
    return startNode;
  }

  getNextNode(curr, action) {
    const nxt = curr.successors[action || "default"];
    if (!nxt && Object.keys(curr.successors).length) {
      console.warn(`Flow ends: '${action}' not found in [${Object.keys(curr.successors)}]`);
    }
    return nxt;
  }

  _orch(shared, params = {}) {
    let curr = this.startNode;
    let lastAction = null;
    let p = { ...this.params, ...params };
    while (curr) {
      curr.setParams(p);
      lastAction = curr._run(shared);
      curr = this.getNextNode(curr, lastAction);
    }
    return lastAction;
  }

  _run(shared) {
    const prepRes = this.prep(shared);
    const out = this._orch(shared);
    return this.post(shared, prepRes, out);
  }

  post(shared, prepRes, execRes) {
    return execRes;
  }
}

class BatchFlow extends Flow {
  _run(shared) {
    const prepResults = this.prep(shared) || [];
    const results = [];
    for (const bp of prepResults) {
      results.push(this._orch(shared, { ...this.params, ...bp }));
    }
    return this.post(shared, prepResults, results);
  }
}

// ----------- ASYNC VERSIONS ------------

class AsyncNode extends Node {
  async prepAsync(shared) {}
  async execAsync(prepRes) {}
  async execFallbackAsync(prepRes, error) {
    throw error;
  }
  async postAsync(shared, prepRes, execRes) {}

  async _exec(prepRes) {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await this.execAsync(prepRes);
      } catch (e) {
        if (i === this.maxRetries - 1) return await this.execFallbackAsync(prepRes, e);
        if (this.wait > 0) await new Promise(resolve => setTimeout(resolve, this.wait * 1000));
      }
    }
  }

  async runAsync(shared) {
    if (Object.keys(this.successors).length) {
      console.warn("Node won't run successors. Use AsyncFlow.");
    }
    return await this._runAsync(shared);
  }

  async _runAsync(shared) {
    const prepRes = await this.prepAsync(shared);
    const execRes = await this._exec(prepRes);
    return await this.postAsync(shared, prepRes, execRes);
  }

  _run() {
    throw new Error("Use runAsync instead.");
  }
}

class AsyncBatchNode extends AsyncNode {
  async _exec(items) {
    const results = [];
    for (const item of items) {
      results.push(await super._exec(item));
    }
    return results;
  }
}

class AsyncParallelBatchNode extends AsyncNode {
  async _exec(items) {
    return await Promise.all(items.map(item => super._exec(item)));
  }
}

class AsyncFlow extends Flow {
  async prepAsync(shared) {}
  async postAsync(shared, prepRes, execRes) {
    return execRes;
  }

  async _orchAsync(shared, params = {}) {
    let curr = this.startNode;
    let lastAction = null;
    let p = { ...this.params, ...params };
    while (curr) {
      curr.setParams(p);
      lastAction = curr instanceof AsyncNode
        ? await curr._runAsync(shared)
        : curr._run(shared);
      curr = this.getNextNode(curr, lastAction);
    }
    return lastAction;
  }

  async _runAsync(shared) {
    const prepRes = await this.prepAsync(shared);
    const result = await this._orchAsync(shared);
    return await this.postAsync(shared, prepRes, result);
  }

  run() {
    throw new Error("Use runAsync instead.");
  }

  async runAsync(shared) {
    return await this._runAsync(shared);
  }
}

class AsyncBatchFlow extends AsyncFlow {
  async _runAsync(shared) {
    const prepResults = await this.prepAsync(shared) || [];
    const results = [];
    for (const bp of prepResults) {
      results.push(await this._orchAsync(shared, { ...this.params, ...bp }));
    }
    return await this.postAsync(shared, prepResults, results);
  }
}

class AsyncParallelBatchFlow extends AsyncFlow {
  async _runAsync(shared) {
    const prepResults = await this.prepAsync(shared) || [];
    const results = await Promise.all(prepResults.map(bp =>
      this._orchAsync(shared, { ...this.params, ...bp })
    ));
    return await this.postAsync(shared, prepResults, results);
  }
}

export {
  BaseNode,
  Node,
  BatchNode,
  Flow,
  BatchFlow,
  AsyncNode,
  AsyncBatchNode,
  AsyncParallelBatchNode,
  AsyncFlow,
  AsyncBatchFlow,
  AsyncParallelBatchFlow,
  ConditionalTransition
};
