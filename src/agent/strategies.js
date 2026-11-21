/**
 * Reasoning strategies for AgentEngine.
 *
 * A strategy is a declarative description of the phases in one agent cycle:
 *  - `phases`      run before tool execution; exactly one must be `kind: 'action'`
 *  - `postPhases`  run after tool execution (thought-only reflection phases)
 */

function toolErrorPrompt(errors) {
  return `
IMPORTANT: One or more tool calls failed. Analyze the following errors carefully:
${errors}

Explain *why* these tools failed. Propose an alternative tool or a revised plan to achieve the goal without these tools, or suggest how to fix the underlying issue. Do NOT generate irrelevant code, random thoughts, or go off-topic. Focus solely on addressing these errors and getting back on track to achieve the user's goal. If you are stuck, consider using the 'user_input' or 'interactive_input' tool to ask the user for clarification.
`;
}

function noToolCallsPrompt(actionPhase) {
  const name = actionPhase?.name ?? 'REASON';
  return `Current Phase: ${name}. Your previous response did not include any tool calls. If you intend to take action, you MUST include at least one tool call in your JSON response. Re-evaluate your plan and provide tool calls.`;
}

export const agentStrategies = {
  default: {
    id: 'default',
    label: 'Direct thought → action',
    strictParsing: true,
    initialMessages: [
      {
        role: 'system',
        content: "You are now at the 'Understand & Explore' phase. Analyze the user's request and the directory/codebase, then formulate a plan.",
      },
    ],
    phases: [{ kind: 'action' }],
    postPhases: [],
    afterTools: 'You have just received an observation from your tools. Analyze the result and proceed to the next step in your plan. If the observation was an error, you must adjust your plan to fix the error.',
    noToolCallsPrompt: () => "Your last step resulted in no action. Re-evaluate your plan. If you are stuck, consider using a different tool or asking the user for clarification with the 'interactive_input' tool.",
    onToolError: toolErrorPrompt,
  },

  raor: {
    id: 'raor',
    label: 'Reason → Act → Reflect',
    strictParsing: false,
    phases: [
      {
        name: 'REASON',
        prompt: "Current Phase: REASON. Analyze the user's request and formulate a plan.",
        kind: 'action',
      },
    ],
    postPhases: [
      {
        name: 'REFLECT',
        prompt: 'Current Phase: REFLECT. Evaluate if the result moves toward the goal and adjust plan if needed.',
        kind: 'thought',
        when: 'success',
      },
    ],
    noToolCallsPrompt,
    onToolError: toolErrorPrompt,
  },

  ooda: {
    id: 'ooda',
    label: 'Observe → Orient → Decide → Act',
    strictParsing: false,
    phases: [
      {
        name: 'OBSERVE',
        prompt: 'Current Phase: OBSERVE. Summarize the latest data from the environment.',
        kind: 'thought',
      },
      {
        name: 'ORIENT',
        prompt: 'Current Phase: ORIENT. Interpret data in context of history and goal.',
        kind: 'thought',
      },
      {
        name: 'DECIDE',
        prompt: 'Current Phase: DECIDE. Select the best action now.',
        kind: 'action',
      },
    ],
    postPhases: [],
    noToolCallsPrompt,
    onToolError: toolErrorPrompt,
  },

  lpavrl: {
    id: 'lpavrl',
    label: 'Listen → Plan → Act → Visualize → Reflect → Learn',
    strictParsing: false,
    phases: [
      {
        name: 'LISTEN',
        prompt: 'Current Phase: LISTEN. Understand the user’s current request and context.',
        kind: 'thought',
      },
      {
        name: 'PLAN',
        prompt: 'Current Phase: PLAN. Break it into steps with rationale.',
        kind: 'action',
      },
    ],
    postPhases: [
      {
        name: 'VISUALIZE',
        prompt: 'Current Phase: VISUALIZE. Present progress or results in an understandable form.',
        kind: 'thought',
        promptOnlyOnSuccess: true,
      },
      {
        name: 'REFLECT',
        prompt: 'Current Phase: REFLECT. Judge results and align with the original intent.',
        kind: 'thought',
      },
      {
        name: 'LEARN',
        prompt: 'Current Phase: LEARN. Update knowledge or strategy for future tasks.',
        kind: 'thought',
      },
    ],
    noToolCallsPrompt,
    onToolError: toolErrorPrompt,
  },

  pema: {
    id: 'pema',
    label: 'Plan → Execute → Monitor → Adjust',
    strictParsing: false,
    phases: [
      {
        name: 'PLAN',
        prompt: 'Current Phase: PLAN. Define actions needed to reach the goal.',
        kind: 'action',
      },
    ],
    postPhases: [
      {
        name: 'MONITOR',
        prompt: 'Current Phase: MONITOR. Check current status against the plan.',
        kind: 'thought',
        when: 'success',
      },
      {
        name: 'ADJUST',
        prompt: 'Current Phase: ADJUST. Modify the plan if deviations are detected.',
        kind: 'thought',
        when: 'success',
      },
    ],
    noToolCallsPrompt,
    onToolError: toolErrorPrompt,
  },
};

export function getStrategy(id = 'default') {
  const strategy = agentStrategies[id];
  if (!strategy) {
    throw new Error(`Unknown agent strategy '${id}'. Available: ${Object.keys(agentStrategies).join(', ')}`);
  }
  return strategy;
}

export function listStrategies() {
  return Object.values(agentStrategies).map(({ id, label }) => ({ id, label }));
}
