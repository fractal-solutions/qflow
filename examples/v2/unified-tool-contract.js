/**
 * WHY THIS EXISTS
 * ---------------
 * A tool is usually re-described four times: in the agent prompt, the MCP
 * server, the LLM tool schema, and the docs. Each copy drifts. This demo
 * defines each tool once with ToolSpec, then drives a scripted LLM agent,
 * an MCP server, capability-filtered registries, idempotency, and generated
 * Markdown from that single definition.
 *
 * Run: bun examples/v2/unified-tool-contract.js
 */
import { AsyncNode } from '../../src/qflow.js';
import { AgentEngine } from '../../src/agent/engine.js';
import { LLMNode } from '../../src/llm/index.js';
import { QFlowMCPServer } from '../../src/mcp/server.js';
import { ToolRegistry, ToolSpec, generateToolDocs, toolSpecFromNode } from '../../src/tool_spec.js';

const docs = [
  { title: 'Replay-safe side effects', tags: ['qflow', 'durable', 'replay'], score: 0.92 },
  { title: 'Portable tool specs', tags: ['qflow', 'tools', 'mcp'], score: 0.88 },
  { title: 'Trace-driven evaluation', tags: ['qflow', 'eval', 'traces'], score: 0.81 },
];
const savedNotes = [];

const search = new ToolSpec({
  name: 'search',
  namespace: 'catalog',
  description: 'Search the internal documentation catalog.',
  parameters: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  capabilities: ['read'],
  permissions: ['public'],
  idempotencyKey: '{{query}}',
  execute: async ({ query }) => {
    const tokens = query.toLowerCase().split(/[\s.]+/).filter(Boolean);
    return docs.filter(doc =>
      tokens.some(token =>
        doc.title.toLowerCase().includes(token) ||
        doc.tags.some(tag => tag.includes(token) || token.includes(tag))
      )
    );
  },
});

const saveNote = new ToolSpec({
  name: 'save',
  namespace: 'notes',
  description: 'Save a research note.',
  parameters: {
    type: 'object',
    properties: { title: { type: 'string' }, body: { type: 'string' } },
    required: ['title', 'body'],
  },
  capabilities: ['write'],
  permissions: ['internal'],
  sideEffect: 'write',
  idempotencyKey: '{{title}}',
  execute: async args => {
    savedNotes.push(args);
    return { saved: savedNotes.length, title: args.title };
  },
});

// Existing nodes don't need to be rewritten: derive a spec from them.
class SummarizeNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: 'summarize',
      description: 'Summarize a piece of text.',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
    };
  }

  async prepAsync() {
    return this.params.text;
  }

  async execAsync(text) {
    return text.slice(0, 60);
  }
}
const summarize = toolSpecFromNode(SummarizeNode, {
  namespace: 'research',
  capabilities: ['read'],
  permissions: ['public'],
});

const registry = new ToolRegistry({
  tools: [search, saveNote, summarize],
  grantedCapabilities: ['read', 'write'],
  grantedPermissions: ['public', 'internal'],
});

// --- One spec, several consumers -------------------------------------------------
const mcp = new QFlowMCPServer({ toolRegistry: registry });
const listed = await mcp.handleMessage({ id: 1, method: 'tools/list', params: {} });
console.log('MCP tools:', listed.result.tools.map(tool => tool.name).join(', '));

const called = await mcp.handleMessage({
  id: 2,
  method: 'tools/call',
  params: { name: 'catalog.search', arguments: { query: 'qflow 2.0' } },
});
console.log('MCP call returned:', JSON.parse(called.result.content[0].text).length, 'docs');
console.log('LLM tool schemas:', registry.llmTools().map(tool => tool.function.name).join(', '));
console.log('Docs preview:', generateToolDocs(registry).split('\n').slice(0, 4).join(' | '));

// --- Capability grants hide tools before an agent can see them -------------------
const readOnly = new ToolRegistry({
  tools: [search, saveNote, summarize],
  grantedCapabilities: ['read'],
  grantedPermissions: ['public'],
});
console.log('Read-only tools:', readOnly.list().map(tool => tool.qualifiedName).join(', '));
try {
  await readOnly.execute('notes.save', { title: 'blocked', body: 'nope' });
} catch (error) {
  console.log('Blocked write:', error.message);
}

// --- Idempotency -----------------------------------------------------------------
const firstSave = await registry.execute('notes.save', { title: 'release', body: 'canary.3' });
const secondSave = await registry.execute('notes.save', { title: 'release', body: 'canary.3' });
console.log('Idempotent save:', firstSave.result.saved, 'stored /', secondSave.replayed ? 'replayed' : 'executed');

// --- The agent is also a flow -----------------------------------------------------
/** Adapter with a fixed script: search, reflect, finish. No API key required. */
class ScriptedAdapter {
  id = 'scripted';

  capabilities = {
    streaming: false,
    toolCalls: true,
    structuredOutput: false,
    reasoning: false,
    tokenUsage: true,
    cost: false,
  };

  async complete(request) {
    const history = JSON.parse(request.prompt);
    const lastUser = [...history].reverse().find(message => message.role === 'user')?.content ?? '';
    const observations = history.filter(message =>
      typeof message.content === 'string' && message.content.startsWith('Observation:')
    ).length;

    if (lastUser.includes('Current Phase: REFLECT')) {
      return {
        text: JSON.stringify({ thought: 'The observation moves us toward the goal.', tool_calls: [] }),
        usage: { prompt_tokens: 120, completion_tokens: 20 },
      };
    }
    if (observations === 0) {
      return {
        text: JSON.stringify({
          thought: 'Search the catalog first.',
          tool_calls: [{ tool: 'catalog.search', parameters: { query: 'qflow 2.0' } }],
        }),
        usage: { prompt_tokens: 100, completion_tokens: 25 },
      };
    }
    if (observations === 1) {
      return {
        text: JSON.stringify({
          thought: 'Persist a short note before finishing.',
          tool_calls: [{
            tool: 'notes.save',
            parameters: {
              title: 'agent-summary',
              body: 'Three qflow 2.0 docs are relevant to this goal.',
            },
          }],
        }),
        usage: { prompt_tokens: 150, completion_tokens: 30 },
      };
    }
    return {
      text: JSON.stringify({
        thought: 'Report the result.',
        tool_calls: [{
          tool: 'finish',
          parameters: { output: '3 qflow 2.0 docs found; note saved.' },
        }],
      }),
      usage: { prompt_tokens: 180, completion_tokens: 20 },
    };
  }
}

// AgentEngine expects the raw JSON text from a completion, so unwrap LLMNode's
// normalized result while keeping its adapters, events and usage accounting.
class AgentLLM extends LLMNode {
  async postAsync(shared, prepRes, execRes, observer) {
    await super.postAsync(shared, prepRes, execRes, observer);
    return execRes.text;
  }
}

const llmNode = new AgentLLM({
  provider: 'scripted',
  adapter: new ScriptedAdapter(),
  model: 'scripted-1',
});

const agent = new AgentEngine({
  llmNode,
  toolRegistry: registry,
  strategy: 'raor',
  requireFinishConfirmation: false,
  grantedCapabilities: ['read', 'write'],
  grantedPermissions: ['public', 'internal'],
  maxSteps: 8,
});

const flow = agent.asFlow();
console.log('Agent phases:', [...flow.strategy.phases, ...flow.strategy.postPhases]
  .map(phase => phase.name ?? phase.kind)
  .join(' -> '));
console.log('Agent graph:', `${flow.graph.nodes.length} nodes, ${flow.graph.edges.length} edges`);
flow.on('llm:usage', ({ usage }) => {
  console.log(`   llm:usage ${usage.prompt}+${usage.completion} tokens`);
});

const answer = await flow.runAsync({ goal: 'Find qflow 2.0 docs and save a note.' });
console.log('Agent output:', answer);
console.log('Agent-triggered note saved:', savedNotes.some(note => note.title === 'agent-summary'));
