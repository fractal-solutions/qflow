import { AsyncFlow, AsyncNode } from '../qflow.js';
import { UserInputNode } from '../nodes/user.js';

function parseResponse(response) {
  if (typeof response !== 'string') {
    const message = response?.choices?.[0]?.message ?? response?.message ?? null;
    if (message && typeof message.content === 'string') return parseResponse(message.content);
    if (message?.tool_calls?.length) {
      const call = message.tool_calls[0];
      try {
        return JSON.parse(call.function?.arguments ?? '{}');
      } catch {
        return { text: call.function?.arguments ?? '' };
      }
    }
    return response ?? {};
  }

  const firstBrace = response.indexOf('{');
  const lastBrace = response.lastIndexOf('}');
  const candidate = firstBrace !== -1 && lastBrace > firstBrace
    ? response.slice(firstBrace, lastBrace + 1)
    : response;
  try {
    return JSON.parse(candidate);
  } catch {
    return { text: response };
  }
}

/** Shared base for LLM-backed control phases used by composable agent flows. */
export class AgentControlNode extends AsyncNode {
  constructor({
    llmNode = null,
    prompt = '',
    outputKey = 'agentControlResult',
    action = 'default',
    parse = true,
    maxContextChars = 20_000,
  } = {}) {
    super();
    this.llmNode = llmNode;
    this.prompt = prompt;
    this.outputKey = outputKey;
    this.action = action;
    this.parse = parse;
    this.maxContextChars = maxContextChars;
  }

  buildContext(shared = {}) {
    return {
      goal: shared.goal ?? this.params.goal ?? null,
      plan: shared.plan ?? null,
      critique: shared.critique ?? null,
      reflection: shared.reflection ?? null,
      history: (shared.conversationHistory ?? this.params.history ?? []).slice(-10),
      ...(shared.agentContext ?? {}),
    };
  }

  buildPrompt(shared = {}) {
    const context = JSON.stringify(this.buildContext(shared), null, 2).slice(0, this.maxContextChars);
    return `${this.params.prompt ?? this.prompt}\n\nContext:\n${context}`;
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    if (!this.llmNode) throw new Error(`${this.constructor.name} requires an llmNode.`);
    this.llmNode.setParams({ prompt: this.buildPrompt(shared) });
    const response = await new AsyncFlow(this.llmNode).runAsync({}, observer);
    return this.parse ? parseResponse(response) : response;
  }

  resolveAction(execRes) {
    return typeof this.action === 'function' ? this.action(execRes) : this.action;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.outputKey] = execRes;
    return this.resolveAction(execRes);
  }
}

export class PlanNode extends AgentControlNode {
  constructor(options = {}) {
    super({
      prompt: 'Create a concise, ordered plan for the goal. Return JSON: {"plan": ["step 1", "step 2"]}.',
      outputKey: 'planResult',
      ...options,
    });
  }

  async execAsync(prepRes, shared, observer) {
    const result = await super.execAsync(prepRes, shared, observer);
    if (Array.isArray(result)) return { plan: result };
    if (typeof result?.plan === 'string') return { plan: result.split(/\n+/).map(step => step.trim()).filter(Boolean) };
    return { plan: result.plan ?? result.text ?? String(result) };
  }

  async postAsync(shared, prepRes, execRes) {
    shared.plan = execRes.plan;
    shared.planResult = execRes;
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}

export class CriticNode extends AgentControlNode {
  constructor(options = {}) {
    super({
      prompt: 'Critique the plan and decide whether it is ready. Return JSON: {"approved": true|false, "critique": "..."}.',
      outputKey: 'critiqueResult',
      ...options,
    });
  }

  async postAsync(shared, prepRes, execRes) {
    const approved = execRes.approved === true || execRes.approved === 'true';
    shared.critique = execRes.critique ?? execRes.text ?? '';
    shared.approved = approved;
    shared.critiqueResult = execRes;
    return Object.keys(this.successors).length ? (approved ? 'approve' : 'reject') : execRes;
  }
}

export class ReflectNode extends AgentControlNode {
  constructor(options = {}) {
    super({
      prompt: 'Reflect on the latest observations. Return JSON: {"reflection": "...", "nextAction": "..."}.',
      outputKey: 'reflectionResult',
      ...options,
    });
  }

  async postAsync(shared, prepRes, execRes) {
    shared.reflection = execRes.reflection ?? execRes.text ?? String(execRes);
    shared.nextAction = execRes.nextAction ?? null;
    shared.reflectionResult = execRes;
    return Object.keys(this.successors).length ? 'default' : execRes;
  }
}

/** Terminal node that records the agent's final answer. */
export class FinishNode extends AsyncNode {
  constructor({ outputKey = 'finalOutput', action = 'finish' } = {}) {
    super();
    this.outputKey = outputKey;
    this.action = action;
  }

  async prepAsync(shared = {}) {
    return shared[this.outputKey] ?? this.params.output ?? shared.agentOutput ?? null;
  }

  async execAsync(prepRes) {
    return prepRes;
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.outputKey] = execRes;
    return Object.keys(this.successors).length ? this.action : execRes;
  }
}

/** Approval gate that routes to `approve` or `reject`. */
export class HumanApprovalNode extends AsyncNode {
  constructor({ prompt = 'Approve this action? (yes/no): ', approvalKey = 'approval' } = {}) {
    super();
    this.prompt = prompt;
    this.approvalKey = approvalKey;
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    const node = new UserInputNode();
    node.setParams({
      prompt: this.params.prompt ?? this.prompt,
      logging: this.params.logging,
    });
    const answer = this.params.answer ?? await new AsyncFlow(node).runAsync({}, observer);
    const approved = /^(yes|y|approve|approved|ok)$/i.test(String(answer).trim());
    observer.emit?.('agent:approval', { approved, answer });
    return { approved, answer };
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.approvalKey] = execRes;
    return Object.keys(this.successors).length ? (execRes.approved ? 'approve' : 'reject') : execRes;
  }
}
