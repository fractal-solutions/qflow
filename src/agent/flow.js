import { AsyncFlow, AsyncNode } from '../qflow.js';
import { getStrategy } from './strategies.js';
import { describeGraph } from '../graph.js';

class AgentFlowFinishNode extends AsyncNode {
  constructor() {
    super();
    this.output = null;
  }

  async prepAsync(shared = {}) {
    return shared.finalOutput ?? this.output ?? '';
  }

  async execAsync(prepRes) {
    return prepRes;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.finalOutput = execRes;
    return execRes;
  }
}

/** One node per declarative strategy phase; each node delegates to AgentEngine. */
export class AgentPhaseNode extends AsyncNode {
  constructor({ agent, phase, role = 'phase' }) {
    super();
    this.agent = agent;
    this.phase = phase;
    this.role = role;
  }

  async prepAsync(shared = {}) {
    const goal = this.params.goal ?? shared.goal ?? this.agent.params?.goal;
    if (!goal) throw new Error('Agent flow requires a goal in shared state or node params.');
    if (this.agent.currentGoal !== goal) {
      this.agent.initialize(goal);
      this.agent.currentGoal = goal;
    }
    shared.agentFlowSteps = (shared.agentFlowSteps ?? 0) + 1;
    return { goal };
  }

  async execAsync(_prepRes, shared = {}, observer = {}) {
    if (shared.agentFlowSteps > this.agent.maxSteps) {
      return { done: true, output: 'Agent step budget exhausted.', phase: this.phase.name ?? 'budget' };
    }

    this.agent.currentObserver = observer;
    this.agent.currentShared = shared;
    const parsed = await this.agent.runPhase(this.phase, observer);
    if (parsed.invalid) return { done: false, invalid: true, phase: this.phase.name ?? this.phase.kind };

    if (this.phase.kind !== 'action') {
      return { done: false, parsed, phase: this.phase.name ?? this.phase.kind };
    }

    const finishCall = parsed.toolCalls.find(call => call.tool === 'finish');
    if (finishCall) {
      const output = finishCall.parameters?.output ?? '';
      if (this.agent.requireFinishConfirmation && !(await this.agent.confirmFinish(output))) {
        return { done: false, phase: 'finish_denied' };
      }
      return { done: true, output, phase: 'finish' };
    }

    if (!parsed.toolCalls.length) {
      const prompt = this.agent.strategy.noToolCallsPrompt?.(this.phase);
      if (prompt) this.agent.conversationHistory.push({ role: 'user', content: prompt });
      return { done: false, phase: this.phase.name ?? this.phase.kind };
    }

    const validationErrors = parsed.toolCalls
      .map(call => this.agent.validateToolParameters(call))
      .filter(Boolean);
    if (validationErrors.length) {
      this.agent.conversationHistory.push({
        role: 'user',
        content: `Tool parameter validation failed: ${validationErrors.join('; ')}. Correct the calls.`,
      });
      return { done: false, phase: this.phase.name ?? this.phase.kind };
    }

    const observations = await this.agent.executeToolCalls(parsed.toolCalls, parsed.parallel, shared);
    this.agent.conversationHistory.push({ role: 'user', content: `Observation: ${JSON.stringify(observations)}` });
    const toolErrors = observations.filter(observation => observation.success === false);
    if (toolErrors.length && this.agent.strategy.onToolError) {
      const errors = toolErrors
        .map(error => `Tool: ${error.tool}, Error: ${error.error}`)
        .join('\n');
      this.agent.conversationHistory.push({ role: 'system', content: this.agent.strategy.onToolError(errors) });
    }
    if (typeof this.agent.strategy.afterTools === 'string') {
      this.agent.conversationHistory.push({ role: 'system', content: this.agent.strategy.afterTools });
    }

    return { done: false, observations, phase: this.phase.name ?? this.phase.kind };
  }

  async postAsync(shared, prepRes, execRes) {
    shared.agentPhase = execRes.phase;
    if (execRes.done) shared.finalOutput = execRes.output;
    return execRes.done ? 'finish' : 'continue';
  }
}

/**
 * Turn a declarative strategy into a runnable, inspectable AsyncFlow.
 * The engine still owns reasoning/tool semantics; the flow makes each phase a
 * checkpointable, traceable node.
 */
export function buildAgentFlow(agent, options = {}) {
  if (!agent || typeof agent.runPhase !== 'function') {
    throw new Error('buildAgentFlow requires an AgentEngine instance.');
  }

  const strategy = options.strategy
    ? (typeof options.strategy === 'string' ? getStrategy(options.strategy) : options.strategy)
    : agent.strategy;
  const phases = [
    ...(strategy.phases ?? []).map(phase => ({ phase, role: 'phase' })),
    ...(strategy.postPhases ?? []).map(phase => ({ phase, role: 'postPhase' })),
  ];
  if (!phases.length) throw new Error(`Strategy '${strategy.id ?? strategy.label}' has no phases.`);

  const nodes = phases.map(({ phase, role }) => new AgentPhaseNode({ agent, phase, role }));
  const finish = new AgentFlowFinishNode();
  for (let index = 0; index < nodes.length; index += 1) {
    const next = nodes[index + 1] ?? nodes[0];
    nodes[index].next(next, 'continue');
    nodes[index].next(finish, 'finish');
  }

  const flow = new AsyncFlow(nodes[0], {
    maxSteps: options.maxSteps ?? Math.max(10, (agent.maxSteps ?? 70) * phases.length),
    timeout: options.timeout,
    onError: options.onError,
  });
  flow.agent = agent;
  flow.strategy = strategy;
  flow.graph = describeGraph(nodes[0]);
  return flow;
}

/** Metadata-only view of a strategy, suitable for docs or visual editors. */
export function strategyGraph(strategyId = 'default') {
  const strategy = typeof strategyId === 'string' ? getStrategy(strategyId) : strategyId;
  const phases = [
    ...(strategy.phases ?? []).map(phase => ({ ...phase, role: 'phase' })),
    ...(strategy.postPhases ?? []).map(phase => ({ ...phase, role: 'postPhase' })),
  ];
  return {
    id: strategy.id ?? 'custom',
    label: strategy.label ?? '',
    phases,
    edges: phases.map((phase, index) => ({
      from: phase.name ?? `phase-${index + 1}`,
      to: phase.name ?? `phase-${((index + 1) % phases.length) + 1}`,
      action: 'continue',
    })),
  };
}
