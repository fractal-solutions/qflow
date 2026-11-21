import { AsyncFlow, AsyncNode } from './qflow.js';
import { assertState } from './contracts.js';

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

async function mapWithConcurrency(items, mapper, concurrency = Infinity) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const limit = Math.max(1, Math.min(concurrency === 0 ? Infinity : concurrency, items.length || 1));

  const worker = async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function runMapper(mapper, item, index, shared, observer) {
  if (typeof mapper === 'function') {
    return await mapper(item, index, shared, observer);
  }
  const target = mapper instanceof AsyncFlow ? mapper : new AsyncFlow(mapper);
  const context = { ...shared, item, index };
  return await target.runAsync(context, observer);
}

/** Parallel/serial collection mapping with explicit input and output contracts. */
export class MapNode extends AsyncNode {
  constructor({
    mapper = null,
    inputKey = 'items',
    outputKey = 'mapResults',
    parallel = false,
    concurrency = 4,
    inputContract = null,
    outputContract = null,
    onError = 'throw',
  } = {}) {
    super();
    this.mapper = mapper;
    this.inputKey = inputKey;
    this.outputKey = outputKey;
    this.parallel = parallel;
    this.concurrency = concurrency;
    this.inputContract = inputContract;
    this.outputContract = outputContract;
    this.onError = onError;
  }

  async prepAsync(shared = {}) {
    assertState(shared, this.inputContract, { phase: `${this.constructor.name}:input` });
    const items = this.params.items ?? shared[this.inputKey] ?? [];
    if (!Array.isArray(items)) throw new Error(`${this.constructor.name} expects an array from '${this.inputKey}'.`);
    return items;
  }

  async execAsync(items, shared = {}, observer = {}) {
    const mapper = this.params.mapper ?? this.mapper;
    if (!mapper) throw new Error(`${this.constructor.name} requires a mapper function or node.`);

    const mapOne = async (item, index) => {
      try {
        return await runMapper(mapper, item, index, shared, observer);
      } catch (error) {
        observer.emit?.('map:item_error', { index, item, error: { message: error.message } });
        if (this.onError === 'skip') return undefined;
        if (this.onError === 'record') return { error: { message: error.message }, item, index };
        throw error;
      }
    };

    const results = this.parallel
      ? await mapWithConcurrency(items, mapOne, this.concurrency)
      : await mapWithConcurrency(items, mapOne, 1);

    if (this.onError === 'skip') return results.filter(value => value !== undefined);
    return results;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.outputKey] = execRes;
    assertState(shared, this.outputContract, { phase: `${this.constructor.name}:output` });
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}

/** Fold a collection into a single value. */
export class ReduceNode extends AsyncNode {
  constructor({
    reducer = null,
    initialValue = undefined,
    inputKey = 'mapResults',
    outputKey = 'reduceResult',
    inputContract = null,
    outputContract = null,
  } = {}) {
    super();
    this.reducer = reducer;
    this.initialValue = initialValue;
    this.inputKey = inputKey;
    this.outputKey = outputKey;
    this.inputContract = inputContract;
    this.outputContract = outputContract;
  }

  async prepAsync(shared = {}) {
    assertState(shared, this.inputContract, { phase: `${this.constructor.name}:input` });
    const items = this.params.items ?? shared[this.inputKey] ?? [];
    if (!Array.isArray(items)) throw new Error(`${this.constructor.name} expects an array from '${this.inputKey}'.`);
    return {
      items,
      initialValue: this.params.initialValue ?? shared[this.params.initialKey ?? 'reduceInitial'] ?? this.initialValue,
    };
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    const reducer = this.params.reducer ?? this.reducer;
    if (typeof reducer !== 'function') throw new Error(`${this.constructor.name} requires a reducer function.`);

    let accumulator = prepRes.initialValue;
    for (let index = 0; index < prepRes.items.length; index += 1) {
      accumulator = await reducer(accumulator, prepRes.items[index], index, shared, observer);
      observer.emit?.('reduce:step', { index, value: accumulator });
    }
    return accumulator;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.outputKey] = execRes;
    assertState(shared, this.outputContract, { phase: `${this.constructor.name}:output` });
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}

/** Combine several named shared-state values into one object/array. */
export class JoinNode extends AsyncNode {
  constructor({ inputs = [], strategy = 'object', outputKey = 'joined', join = null, inputContract = null } = {}) {
    super();
    this.inputs = [...inputs];
    this.strategy = strategy;
    this.outputKey = outputKey;
    this.join = join;
    this.inputContract = inputContract;
  }

  async prepAsync(shared = {}) {
    assertState(shared, this.inputContract, { phase: `${this.constructor.name}:input` });
    const inputs = this.params.inputs ?? this.inputs;
    const values = {};
    for (const entry of Array.isArray(inputs) ? inputs : Object.entries(inputs)) {
      const [key, path] = Array.isArray(entry) ? entry : [String(entry), String(entry)];
      values[key] = path.split('.').reduce((value, part) => value?.[part], shared);
    }
    return values;
  }

  async execAsync(values, shared = {}, observer = {}) {
    if (typeof this.join === 'function') return await this.join(values, shared, observer);
    if (this.strategy === 'array') return Object.values(values);
    if (this.strategy === 'merge') return Object.assign({}, ...Object.values(values));
    return values;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.outputKey] = execRes;
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}

/** Route to a named successor based on predicates or a condition function. */
export class BranchNode extends AsyncNode {
  constructor({
    cases = {},
    condition = null,
    defaultAction = 'default',
    decisionKey = 'branchDecision',
    inputContract = null,
  } = {}) {
    super();
    this.cases = { ...cases };
    this.condition = condition;
    this.defaultAction = defaultAction;
    this.decisionKey = decisionKey;
    this.inputContract = inputContract;
  }

  async prepAsync(shared = {}) {
    assertState(shared, this.inputContract, { phase: `${this.constructor.name}:input` });
    return shared;
  }

  async execAsync(shared, _sharedRef, observer = {}) {
    const evaluate = async value => {
      if (typeof value === 'function') return await value(shared, observer);
      return value;
    };

    const condition = this.params.condition ?? this.condition;
    if (typeof condition === 'function') {
      const result = await condition(shared, observer);
      if (typeof result === 'string') return result;
      return result ? 'true' : 'false';
    }

    const cases = this.params.cases ?? this.cases;
    for (const [name, predicate] of Object.entries(cases)) {
      if (await evaluate(predicate)) return name;
    }
    return this.params.defaultAction ?? this.defaultAction;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.decisionKey] = execRes;
    return Object.keys(this.successors).length ? execRes : execRes;
  }
}

/** Run a nested node/flow under explicit iteration and item budgets. */
export class CycleNode extends AsyncNode {
  constructor({
    node = null,
    flow = null,
    until = null,
    maxIterations = 10,
    maxItems = 1000,
    inputKey = 'items',
    outputKey = 'cycleResults',
    metaKey = 'cycleMeta',
    collect = true,
  } = {}) {
    super();
    this.node = node;
    this.flow = flow;
    this.until = until;
    this.maxIterations = maxIterations;
    this.maxItems = maxItems;
    this.inputKey = inputKey;
    this.outputKey = outputKey;
    this.metaKey = metaKey;
    this.collect = collect;
  }

  async prepAsync(shared = {}) {
    const items = this.params.items ?? shared[this.inputKey] ?? [];
    if (!Array.isArray(items)) throw new Error(`${this.constructor.name} expects an array from '${this.inputKey}'.`);
    return [...items].slice(0, this.params.maxItems ?? this.maxItems);
  }

  async execAsync(items, shared = {}, observer = {}) {
    const target = this.params.flow ?? this.flow ?? this.params.node ?? this.node;
    if (!target && typeof this.params.run !== 'function') {
      throw new Error(`${this.constructor.name} requires a node, flow, or run function.`);
    }

    const runner = typeof this.params.run === 'function'
      ? this.params.run
      : async (item, index, context) => {
          if (target instanceof AsyncFlow) return await target.runAsync(context, observer);
          return await new AsyncFlow(target).runAsync(context, observer);
        };

    const results = [];
    let iterations = 0;
    let stoppedBy = 'complete';

    for (const item of items) {
      if (iterations >= (this.params.maxIterations ?? this.maxIterations)) {
        stoppedBy = 'maxIterations';
        break;
      }
      shared.cycleInput = item;
      shared.cycleIndex = iterations;
      const result = await runner(item, iterations, shared);
      iterations += 1;
      if (this.collect) results.push(result);
      observer.emit?.('cycle:iteration', { index: iterations, item, result });

      if (typeof this.until === 'function' && await this.until(result, shared, iterations)) {
        stoppedBy = 'until';
        break;
      }
    }

    if (items.length > (this.params.maxItems ?? this.maxItems)) stoppedBy = 'maxItems';
    return { results, iterations, stoppedBy };
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.outputKey] = execRes.results;
    shared[this.metaKey] = { iterations: execRes.iterations, stoppedBy: execRes.stoppedBy };
    return Object.keys(this.successors).length ? 'default' : execRes.results;
  }
}

/** Describe a flow as JSON nodes/edges for visual authoring or docs. */
export function describeGraph(startNode) {
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const ids = new Map();
  const queue = startNode ? [startNode] : [];

  while (queue.length) {
    const node = queue.shift();
    if (!node || seen.has(node)) continue;
    seen.add(node);
    const id = `node-${nodes.length + 1}`;
    ids.set(node, id);

    nodes.push({
      id,
      label: node.constructor?.name ?? 'Node',
      params: node.params ?? {},
      successors: Object.keys(node.successors ?? {}),
    });

    for (const [action, successor] of Object.entries(node.successors ?? {})) {
      edges.push({ from: id, to: ids.get(successor) ?? `node-${seen.size + 1}`, action });
      if (!seen.has(successor)) queue.push(successor);
    }
  }

  return { nodes, edges };
}
