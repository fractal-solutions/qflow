class BaseNode {
  constructor() {
    this.params = {};
    this.successors = {};
  }

  setParams(params) {
    this.params = { ...this.params, ...params };
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
    const execRes = this._exec(prepRes, shared);
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

  _exec(prepRes, shared) {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return this.exec(prepRes, shared);
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
  async prepAsync(shared, observer = {}) {}
  async execAsync(prepRes, shared, observer = {}) {}
  async execFallbackAsync(prepRes, error) {
    throw error;
  }
  async postAsync(shared, prepRes, execRes, observer = {}) {}

  async _exec(prepRes, shared, observer = {}) {
    const { emit, flowId } = observer;
    const nodeClass = this.constructor.name;
    const nodeStartTime = performance.now();

    if (emit) {
        emit('node:start', {
            flowId,
            nodeClass,
            startTime: Date.now(),
            params: this.params
        });
    }

    let finalResult;
    let finalError = null;

    try {
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                finalResult = await this.execAsync(prepRes, shared, observer);
                finalError = null; // Succeeded, clear any error from previous attempt
                break; // Exit retry loop
            } catch (e) {
                finalError = e;
                if (emit) {
                    emit('node:retry', {
                        flowId,
                        nodeClass,
                        attempt: i + 1,
                        maxRetries: this.maxRetries,
                        error: { message: e.message }
                    });
                }
                if (i >= this.maxRetries - 1) {
                    // On the last attempt, let fallback handle it.
                    // The fallback is expected to throw if it cannot recover.
                    finalResult = await this.execFallbackAsync(prepRes, e);
                    finalError = null; // If fallback doesn't throw, it "succeeded" in recovering
                }
                if (this.wait > 0) await new Promise(resolve => setTimeout(resolve, this.wait * 1000));
            }
        }
    } catch (e) {
        finalError = e;
        // Re-throw to stop the flow execution in _orchAsync
        throw e;
    } finally {
        if (emit) {
            const nodeEndTime = performance.now();
            emit('node:end', {
                flowId,
                nodeClass,
                endTime: Date.now(),
                duration: nodeEndTime - nodeStartTime,
                status: finalError ? 'error' : 'success',
                error: finalError ? { message: finalError.message, stack: finalError.stack } : null,
                result: finalResult
            });
        }
    }
    return finalResult;
  }

  async runAsync(shared, observer = {}) {
    if (Object.keys(this.successors).length) {
      console.warn("Node won't run successors. Use AsyncFlow.");
    }
    return await this._runAsync(shared, observer);
  }

  async _runAsync(shared, observer = {}) {
    const prepRes = await this.prepAsync(shared, observer);
    const execRes = await this._exec(prepRes, shared, observer);
    return await this.postAsync(shared, prepRes, execRes, observer);
  }

  _run() {
    throw new Error("Use runAsync instead.");
  }
}

class AsyncBatchNode extends AsyncNode {
  async _exec(items, shared, observer = {}) {
    const results = [];
    for (const item of items) {
      results.push(await super._exec(item, shared, observer));
    }
    return results;
  }
}

class AsyncParallelBatchNode extends AsyncNode {
  async _exec(items, shared, observer = {}) {
    return await Promise.all(items.map(item => super._exec(item, shared, observer)));
  }
}

class AsyncFlow extends Flow {
  constructor(start = null) {
    super(start);
    this.listeners = {};
  }

  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
    return this;
  }

  /** Listen to every event; callbacks receive `{ event, payload }`. */
  onAny(callback) {
    return this.on('*', callback);
  }

  emit(eventName, payload) {
    for (const callback of this.listeners[eventName] ?? []) {
      try {
        callback(payload);
      } catch (e) {
        console.error(`Error in event listener for '${eventName}':`, e);
      }
    }

    if (eventName !== '*') {
      for (const callback of this.listeners['*'] ?? []) {
        try {
          callback({ event: eventName, payload });
        } catch (e) {
          console.error(`Error in event listener for '*':`, e);
        }
      }
    }
  }

  _createFlowObserver(flowId, parentObserver = {}) {
    const emit = (eventName, payload) => {
      const event = { ...payload, flowId: payload?.flowId ?? flowId };
      this.emit(eventName, event);

      if (typeof parentObserver.emit === 'function') {
        parentObserver.emit(eventName, {
          ...event,
          parentFlowId: parentObserver.flowId ?? null,
          nested: true,
        });
      }
    };

    return {
      emit,
      flowId,
      parentFlowId: parentObserver.flowId ?? null,
    };
  }

  async prepAsync(shared, observer = {}) {}
  async postAsync(shared, prepRes, execRes, observer = {}) {
    return execRes;
  }

  async _orchAsync(flowId, shared, params = {}, initialNode = this.startNode, observer = {}) {
    let curr = initialNode;
    let lastAction = null;
    let lastExecRes = null;
    let p = { ...this.params, ...params };
    const observerContext = {
      ...observer,
      emit: typeof observer.emit === 'function' ? observer.emit : this.emit.bind(this),
      flowId: observer.flowId ?? flowId,
    };

    while (curr) {
      curr.setParams(p);

      const prepRes = curr instanceof AsyncNode ? await curr.prepAsync(shared, observerContext) : curr.prep(shared);
      const execRes = curr instanceof AsyncNode ? await curr._exec(prepRes, shared, observerContext) : curr._exec(prepRes, shared);
      lastAction = curr instanceof AsyncNode ? await curr.postAsync(shared, prepRes, execRes, observerContext) : curr.post(shared, prepRes, execRes);
      lastExecRes = execRes;
      
      curr = this.getNextNode(curr, lastAction);
    }
    return lastExecRes;
  }

  async _runAsync(shared, parentObserver = {}) {
    const flowObserver = this._createFlowObserver(crypto.randomUUID(), parentObserver);
    const flowId = flowObserver.flowId;
    const flowStartTime = performance.now();
    flowObserver.emit('flow:start', { flowId, startTime: Date.now(), parentFlowId: flowObserver.parentFlowId });

    let result;
    let flowError = null;

    try {
      const prepRes = await this.prepAsync(shared, flowObserver);
      result = await this._orchAsync(flowId, shared, {}, this.startNode, flowObserver);
      return await this.postAsync(shared, prepRes, result, flowObserver);
    } catch (e) {
      flowError = e;
      throw e; // Re-throw so the caller knows the flow failed
    } finally {
      const flowEndTime = performance.now();
      flowObserver.emit('flow:end', {
        flowId,
        endTime: Date.now(),
        duration: flowEndTime - flowStartTime,
        status: flowError ? 'error' : 'success',
        error: flowError ? { message: flowError.message, stack: flowError.stack } : null,
      });
    }
  }

  run() {
    throw new Error("Use runAsync instead.");
  }

  async runAsync(shared = {}, observer = {}) {
    return await this._runAsync(shared, observer);
  }
}

class AsyncBatchFlow extends AsyncFlow {
  async _runAsync(shared, parentObserver = {}) {
    const flowObserver = this._createFlowObserver(crypto.randomUUID(), parentObserver);
    const prepResults = await this.prepAsync(shared, flowObserver) || [];
    const results = [];
    for (const bp of prepResults) {
      results.push(await this._orchAsync(flowObserver.flowId, shared, { ...this.params, ...bp }, this.startNode, flowObserver));
    }
    return await this.postAsync(shared, prepResults, results, flowObserver);
  }
}

class AsyncParallelBatchFlow extends AsyncFlow {
  async _runAsync(shared, parentObserver = {}) {
    const flowObserver = this._createFlowObserver(crypto.randomUUID(), parentObserver);
    const prepResults = await this.prepAsync(shared, flowObserver) || [];
    const results = await Promise.all(prepResults.map(bp => {
      const newStartNode = new this.startNode.constructor();
      Object.assign(newStartNode.successors, this.startNode.successors);
      return this._orchAsync(flowObserver.flowId, shared, { ...this.params, ...bp }, newStartNode, flowObserver);
    }));
    return await this.postAsync(shared, prepResults, results, flowObserver);
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