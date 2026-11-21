import { describe, expect, test } from 'bun:test';
import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { normalizeTrace } from '../src/trace.js';
import { MockNode, recordFlow } from '../src/testing.js';
import { AssertNode, CompareNode, ReplayNode, ScoreNode, deepDiff } from '../src/eval.js';

class TextNode extends AsyncNode {
  async execAsync(prepRes, shared = {}) {
    return shared.text ?? 'ok';
  }

  async postAsync(shared, prepRes, execRes) {
    return execRes;
  }
}

describe('evaluation nodes', () => {
  test('AssertNode supports operators and routes pass/fail actions', async () => {
    const node = new AssertNode({ operator: 'contains', expected: 'flow', actualKey: 'output' });
    const passed = new MockNode({ responses: ['passed'], postAction: () => 'done' });
    const failed = new MockNode({ responses: ['failed'], postAction: () => 'done' });
    node.next(passed, 'pass');
    node.next(failed, 'fail');

    const result = await new AsyncFlow(node).runAsync({ output: 'a flow result' });

    expect(result).toBe('passed');
    expect(passed.calls).toHaveLength(1);
    expect(failed.calls).toHaveLength(0);
  });

  test('ScoreNode records scores and thresholds', async () => {
    const node = new ScoreNode({
      scorer: actual => actual.length / 10,
      threshold: 0.5,
    });
    const shared = { actual: 'abcdefg' };
    const result = await new AsyncFlow(node).runAsync(shared);

    expect(shared.score.passed).toBe(true);
    expect(shared.score.score).toBeCloseTo(0.7);
    expect(result.score).toBeCloseTo(0.7);
  });

  test('CompareNode diffs traces while ignoring volatile fields', async () => {
    const left = normalizeTrace({
      runId: 'run-1',
      events: [
        { event: 'flow:start', flowId: 'a', startTime: 1 },
        { event: 'flow:end', flowId: 'a', endTime: 2, status: 'success' },
      ],
    });
    const right = normalizeTrace({
      runId: 'run-1',
      events: [
        { event: 'flow:start', flowId: 'b', startTime: 99 },
        { event: 'flow:end', flowId: 'b', endTime: 100, status: 'success' },
      ],
    });

    const compare = new CompareNode({ expected: left, actual: right });
    const shared = {};
    await new AsyncFlow(compare).runAsync(shared);

    expect(shared.comparison.equal).toBe(true);
    expect(deepDiff({ a: 1 }, { a: 2 })[0].path).toBe('a');
  });

  test('ReplayNode reruns a saved trace against a fresh flow and compares it', async () => {
    const makeFlow = () => new AsyncFlow(new TextNode());
    const sourceFlow = makeFlow();
    const sourceRecorder = recordFlow(sourceFlow);
    await sourceFlow.runAsync({ text: 'replayable' });
    const trace = normalizeTrace({
      events: sourceRecorder.events,
      checkpoints: [{ shared: { text: 'replayable' } }],
    });

    const replay = new ReplayNode({ trace, flowFactory: () => makeFlow() });
    const shared = {};
    await new AsyncFlow(replay).runAsync(shared);

    expect(shared.replay.comparison.equal).toBe(true);
    expect(shared.replay.result).toBe('replayable');
  });
});
