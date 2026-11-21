import { describe, expect, test } from 'bun:test';
import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { AgentNode } from '../src/agent/agent.js';
import {
  AgentControlNode,
  CriticNode,
  FinishNode,
  HumanApprovalNode,
  PlanNode,
  ReflectNode,
} from '../src/agent/control_nodes.js';
import { strategyGraph } from '../src/agent/flow.js';
import { MockNode } from '../src/testing.js';

class ScriptedLLM extends AsyncNode {
  constructor(responses) {
    super();
    this.responses = [...responses];
    this.prompts = [];
  }

  async execAsync() {
    this.prompts.push(this.params.prompt);
    return this.responses.shift() ?? '{}';
  }

  async postAsync(shared, prepRes, execRes) {
    return execRes;
  }
}

const toolCall = (tool, params) => JSON.stringify({ thought: 'calling', tool_calls: [{ tool, parameters: params }] });
const finish = output => toolCall('finish', { output });
const thought = text => JSON.stringify({ thought: text });

describe('agent-native control nodes', () => {
  test('PlanNode parses a JSON plan', async () => {
    const llm = new ScriptedLLM([JSON.stringify({ plan: ['research', 'act'] })]);
    const node = new PlanNode({ llmNode: llm });
    const shared = { goal: 'ship' };

    const result = await new AsyncFlow(node).runAsync(shared);

    expect(shared.plan).toEqual(['research', 'act']);
    expect(result.plan).toEqual(['research', 'act']);
    expect(llm.prompts[0]).toContain('Create a concise, ordered plan');
  });

  test('CriticNode routes to approve or reject successors', async () => {
    const llm = new ScriptedLLM([JSON.stringify({ approved: true, critique: 'looks good' })]);
    const node = new CriticNode({ llmNode: llm });
    const approved = new MockNode({ responses: ['yes-branch'], postAction: () => 'approved' });
    const rejected = new MockNode({ responses: ['no-branch'], postAction: () => 'rejected' });
    node.next(approved, 'approve');
    node.next(rejected, 'reject');

    const result = await new AsyncFlow(node).runAsync({ goal: 'ship', plan: ['a'] });

    expect(result).toBe('yes-branch');
    expect(approved.calls).toHaveLength(1);
    expect(rejected.calls).toHaveLength(0);
  });

  test('ReflectNode and FinishNode write shared state', async () => {
    const llm = new ScriptedLLM([JSON.stringify({ reflection: 'needs one more step', nextAction: 'retry' })]);
    const reflect = new ReflectNode({ llmNode: llm });
    await new AsyncFlow(reflect).runAsync({ goal: 'ship' });

    const finishNode = new FinishNode();
    const result = await new AsyncFlow(finishNode).runAsync({ finalOutput: 'done via finish node' });

    expect(result).toBe('done via finish node');
  });

  test('HumanApprovalNode supports programmatic answers for tests and automations', async () => {
    const node = new HumanApprovalNode();
    node.setParams({ answer: 'yes' });
    const shared = {};

    const flow = new AsyncFlow(node);
    const events = [];
    flow.on('agent:approval', payload => events.push(payload));
    const result = await flow.runAsync(shared);

    expect(result.approved).toBe(true);
    expect(shared.approval.answer).toBe('yes');
    expect(events[0].approved).toBe(true);
  });

  test('AgentNode.asFlow exposes a runnable strategy graph', async () => {
    const llm = new ScriptedLLM([
      toolCall('echo', { value: 'x' }),
      thought('reviewed'),
      finish('flow done'),
    ]);
    const echo = new MockNode({ responses: ['ok'], postAction: () => 'default' });
    const agent = new AgentNode({
      llmNode: llm,
      availableTools: { echo },
      requireFinishConfirmation: false,
      strategy: 'raor',
    });
    const flow = agent.asFlow();
    const shared = { goal: 'run as graph' };

    const result = await flow.runAsync(shared);

    expect(result).toBe('flow done');
    expect(shared.finalOutput).toBe('flow done');
    expect(flow.graph.nodes.length).toBeGreaterThan(1);
    expect(flow.graph.edges.some(edge => edge.action === 'finish')).toBe(true);
    expect(strategyGraph('raor').phases.map(phase => phase.name)).toContain('REFLECT');
  });

  test('base control node still validates its LLM dependency', async () => {
    const node = new AgentControlNode({ prompt: 'x' });
    await expect(new AsyncFlow(node).runAsync({})).rejects.toThrow('requires an llmNode');
  });
});
