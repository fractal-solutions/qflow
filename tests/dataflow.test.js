import { describe, expect, test } from 'bun:test';
import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { defineState } from '../src/contracts.js';
import {
  BranchNode,
  CycleNode,
  JoinNode,
  MapNode,
  ReduceNode,
  describeGraph,
} from '../src/graph.js';
import { MockNode } from '../src/testing.js';

class IncrementNode extends AsyncNode {
  async execAsync(prepRes, shared = {}) {
    shared.cycleCount = (shared.cycleCount ?? 0) + 1;
    return shared.cycleCount;
  }

  async postAsync(shared, prepRes, execRes) {
    return execRes;
  }
}

describe('dataflow and graph nodes', () => {
  test('MapNode supports serial and parallel mapping with contracts', async () => {
    const serial = new MapNode({ mapper: value => value * 2 });
    expect(await new AsyncFlow(serial).runAsync({ items: [1, 2, 3] })).toEqual([2, 4, 6]);

    const parallel = new MapNode({
      mapper: async value => value + 1,
      parallel: true,
      concurrency: 2,
      inputContract: defineState({ fields: { items: { type: 'array', required: true } } }),
      outputContract: defineState({ fields: { mapResults: { type: 'array', required: true } } }),
    });
    expect(await new AsyncFlow(parallel).runAsync({ items: [1, 2, 3] })).toEqual([2, 3, 4]);
  });

  test('ReduceNode folds mapped values', async () => {
    const node = new ReduceNode({ reducer: (sum, value) => sum + value, initialValue: 0, inputKey: 'values' });
    expect(await new AsyncFlow(node).runAsync({ values: [1, 2, 3, 4] })).toBe(10);
  });

  test('JoinNode combines named shared values', async () => {
    const node = new JoinNode({ inputs: ['a', 'b', 'nested.value'] });
    const result = await new AsyncFlow(node).runAsync({ a: 1, b: 2, nested: { value: 3 } });
    expect(result).toEqual({ a: 1, b: 2, 'nested.value': 3 });
  });

  test('BranchNode routes to named successors', async () => {
    const branch = new BranchNode({
      cases: {
        even: shared => shared.value % 2 === 0,
        odd: shared => shared.value % 2 === 1,
      },
    });
    const even = new MockNode({ responses: ['even-path'], postAction: () => 'done' });
    const odd = new MockNode({ responses: ['odd-path'], postAction: () => 'done' });
    branch.next(even, 'even');
    branch.next(odd, 'odd');
    const shared = { value: 4 };

    const result = await new AsyncFlow(branch).runAsync(shared);

    expect(result).toBe('even-path');
    expect(shared.branchDecision).toBe('even');
    expect(even.calls).toHaveLength(1);
    expect(odd.calls).toHaveLength(0);
  });

  test('CycleNode enforces iteration budgets', async () => {
    const node = new CycleNode({ node: new IncrementNode(), maxIterations: 2, inputKey: 'items' });
    const shared = { items: ['a', 'b', 'c'] };

    const result = await new AsyncFlow(node).runAsync(shared);

    expect(result).toEqual({ results: [1, 2], iterations: 2, stoppedBy: 'maxIterations' });
    expect(shared.cycleResults).toEqual([1, 2]);
    expect(shared.cycleMeta).toEqual({ iterations: 2, stoppedBy: 'maxIterations' });
    expect(shared.cycleCount).toBe(2);
  });

  test('contracts reject invalid shared state and describeGraph lists edges', async () => {
    const contract = defineState({
      fields: { items: { type: 'array', required: true } },
      strict: true,
    });

    await expect(new AsyncFlow(new MapNode({ mapper: x => x, inputContract: contract })).runAsync({})).rejects.toThrow('items');
    expect(contract.validate({ items: [], extra: 1 }).errors).toContain('State.extra is not declared in a strict contract (input).');

    const start = new MapNode({ mapper: x => x });
    const next = new MockNode();
    start.next(next, 'default');
    const graph = describeGraph(start);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges[0]).toMatchObject({ action: 'default' });
  });
});
