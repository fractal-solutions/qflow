import { describe, expect, test } from 'bun:test';
import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { AgentNode } from '../src/agent/agent.js';
import { RAORAgent } from '../src/agent/raor_agent.js';
import { OODAAgent } from '../src/agent/ooda_agent.js';
import { LPAVRLAgent } from '../src/agent/lpavrl_agent.js';
import { PEMAAgent } from '../src/agent/pema_agent.js';
import { listStrategies } from '../src/agent/strategies.js';

class ScriptedLLM extends AsyncNode {
  constructor(responses) {
    super();
    this.responses = [...responses];
    this.prompts = [];
  }

  async execAsync() {
    this.prompts.push(this.params.prompt);
    const next = this.responses.shift();
    if (!next) throw new Error('ScriptedLLM ran out of responses');
    return next;
  }

  async postAsync(shared, prepRes, execRes) {
    return execRes;
  }
}

class EchoTool extends AsyncNode {
  async execAsync() {
    return { echoed: this.params.value };
  }

  async postAsync() {
    return 'default';
  }
}

const toolCall = (tool, parameters) => JSON.stringify({ thought: `calling ${tool}`, tool_calls: [{ tool, parameters }] });
const thought = text => JSON.stringify({ thought: text });
const finish = output => toolCall('finish', { output });
const tools = () => ({ echo: new EchoTool() });

async function run(agent) {
  agent.setParams({ goal: agent.params.goal ?? 'test goal' });
  const shared = {};
  const result = await new AsyncFlow(agent).runAsync(shared);
  return { result, shared, history: agent.conversationHistory.map(entry => String(entry.content)) };
}

function includes(history, text) {
  return history.some(entry => entry.includes(text));
}

describe('AgentEngine', () => {
  test('all five legacy patterns are registered as strategies', () => {
    expect(listStrategies().map(s => s.id)).toEqual(['default', 'raor', 'ooda', 'lpavrl', 'pema']);
  });

  test('default agent executes a tool and finishes', async () => {
    const llm = new ScriptedLLM([
      toolCall('echo', { value: 'hello' }),
      finish('all good'),
    ]);
    const agent = new AgentNode(llm, tools(), null, {}, false);

    const { result, shared } = await run(agent);

    expect(result).toBe('all good');
    expect(shared.agentOutput).toBe('all good');
    expect(llm.prompts).toHaveLength(2);
  });

  test('RAOR runs Reason then Reflect', async () => {
    const llm = new ScriptedLLM([
      toolCall('echo', { value: 'x' }),
      thought('observation reviewed'),
      finish('raor done'),
    ]);
    const agent = new RAORAgent(llm, tools(), null, {}, false);

    const { result, history } = await run(agent);

    expect(result).toBe('raor done');
    expect(includes(history, 'Current Phase: REASON')).toBe(true);
    expect(includes(history, 'Current Phase: REFLECT')).toBe(true);
  });

  test('OODA runs Observe, Orient, Decide before acting', async () => {
    const llm = new ScriptedLLM([
      thought('observed'),
      thought('oriented'),
      toolCall('echo', { value: 'x' }),
      thought('observed again'),
      thought('oriented again'),
      finish('ooda done'),
    ]);
    const agent = new OODAAgent(llm, tools(), null, {}, false);

    const { result, history } = await run(agent);

    expect(result).toBe('ooda done');
    for (const phase of ['OBSERVE', 'ORIENT', 'DECIDE']) {
      expect(includes(history, `Current Phase: ${phase}`)).toBe(true);
    }
  });

  test('LPAVRL runs Visualize, Reflect and Learn after acting', async () => {
    const llm = new ScriptedLLM([
      thought('listened'),
      toolCall('echo', { value: 'x' }),
      thought('visualized'),
      thought('reflected'),
      thought('learned'),
      thought('listened again'),
      finish('lpavrl done'),
    ]);
    const agent = new LPAVRLAgent(llm, tools(), null, {}, false);

    const { result, history } = await run(agent);

    expect(result).toBe('lpavrl done');
    for (const phase of ['LISTEN', 'PLAN', 'VISUALIZE', 'REFLECT', 'LEARN']) {
      expect(includes(history, `Current Phase: ${phase}`)).toBe(true);
    }
  });

  test('PEMA runs Monitor and Adjust after acting', async () => {
    const llm = new ScriptedLLM([
      toolCall('echo', { value: 'x' }),
      thought('monitored'),
      thought('adjusted'),
      finish('pema done'),
    ]);
    const agent = new PEMAAgent(llm, tools(), null, {}, false);

    const { result, history } = await run(agent);

    expect(result).toBe('pema done');
    for (const phase of ['PLAN', 'MONITOR', 'ADJUST']) {
      expect(includes(history, `Current Phase: ${phase}`)).toBe(true);
    }
  });

  test('supports the options-object constructor with an explicit strategy', () => {
    const agent = new AgentNode({
      llmNode: new ScriptedLLM([]),
      availableTools: tools(),
      requireFinishConfirmation: false,
      strategy: 'pema',
    });

    expect(agent.strategy.id).toBe('pema');
    expect(() => new AgentNode({ llmNode: new ScriptedLLM([]), strategy: 'nope' })).toThrow('Unknown agent strategy');
  });

  test('rejects calls to unknown tools before executing them', async () => {
    const llm = new ScriptedLLM([toolCall('not_a_tool', {})]);
    const agent = new AgentNode(llm, tools(), null, {}, false);
    agent.maxSteps = 2;

    const { result, history } = await run(agent);

    expect(result).toContain('max steps');
    expect(includes(history, "Tool 'not_a_tool' is not a recognized tool")).toBe(true);
  });
});
