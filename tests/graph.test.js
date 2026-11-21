import { describe, expect, test } from 'bun:test';
import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { FanInNode, FanOutNode } from '../src/graph.js';

class ValueNode extends AsyncNode {
  constructor(value) {
    super();
    this.value = value;
  }

  async execAsync() {
    return this.value;
  }

  async postAsync() {
    return 'default';
  }
}

class LoopNode extends AsyncNode {
  async execAsync() {
    return 'again';
  }

  async postAsync() {
    return 'default';
  }
}

class FailingNode extends AsyncNode {
  async execAsync() {
    throw new Error('bad thing');
  }

  async postAsync() {
    return 'default';
  }
}

class RecoveryNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    return shared.error?.message ?? 'no error';
  }

  async postAsync() {
    return 'default';
  }
}

class SlowNode extends AsyncNode {
  async execAsync() {
    await Bun.sleep(100);
    return 'slow';
  }

  async postAsync() {
    return 'default';
  }
}

describe('fan-out / fan-in', () => {
  test('runs branches in parallel and combines their results', async () => {
    const fanOut = new FanOutNode({
      branches: [new ValueNode(2), new ValueNode(3), new ValueNode(4)],
    });
    fanOut.next(new FanInNode({
      combine: results => results.reduce((total, value) => total + value, 0),
    }));

    const flow = new AsyncFlow(fanOut);
    const shared = {};
    const result = await flow.runAsync(shared);

    expect(result).toBe(9);
    expect(shared.fanOutResults).toEqual([2, 3, 4]);
    expect(shared.fanInResult).toBe(9);
  });

  test('supports sequential branches', async () => {
    const fanOut = new FanOutNode({
      branches: [new ValueNode('a'), new ValueNode('b')],
      parallel: false,
    });
    const result = await fanOut.runAsync({});

    expect(result).toEqual(['a', 'b']);
  });
});

describe('flow guards', () => {
  test('maxSteps stops a loop', async () => {
    const node = new LoopNode();
    node.next(node);
    const flow = new AsyncFlow(node, { maxSteps: 3 });

    await expect(flow.runAsync({})).rejects.toThrow('maxSteps');
  });

  test('onError routes a failed node to a recovery node', async () => {
    const flow = new AsyncFlow(new FailingNode(), { onError: new RecoveryNode() });
    const shared = {};

    const result = await flow.runAsync(shared);

    expect(result).toBe('bad thing');
    expect(shared.error.message).toBe('bad thing');
  });

  test('timeout rejects slow flows', async () => {
    const flow = new AsyncFlow(new SlowNode(), { timeout: 5 });

    await expect(flow.runAsync({})).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});
