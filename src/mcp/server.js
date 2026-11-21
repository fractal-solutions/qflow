import readline from 'node:readline';
import { getToolClasses, getToolDefinitions } from '../agent/tools.js';
import { AsyncFlow } from '../qflow.js';

const PROTOCOL_VERSION = '2024-11-05';

class RpcError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function toMCPTool(definition) {
  return {
    name: definition.name,
    description: definition.description,
    inputSchema: definition.parameters ?? { type: 'object', properties: {} },
  };
}

/**
 * Exposes qflow's registered nodes as MCP tools over newline-delimited JSON-RPC
 * on stdin/stdout. Intended to be launched by an MCP client as a child process.
 */
export class QFlowMCPServer {
  constructor(options = {}) {
    const { name = 'qflow', version = '2.0.0-canary', toolClasses } = options;

    this.name = name;
    this.version = version;
    this.toolClasses = toolClasses ?? getToolClasses();
    this.definitions = toolClasses ? this.toolClasses.filter(c => typeof c.getToolDefinition === 'function').map(c => c.getToolDefinition()) : getToolDefinitions();

    this.classByName = new Map();
    for (const ToolClass of this.toolClasses) {
      if (typeof ToolClass.getToolDefinition !== 'function') continue;
      this.classByName.set(ToolClass.getToolDefinition().name, ToolClass);
    }
  }

  async callTool({ name, arguments: args = {} }) {
    const ToolClass = this.classByName.get(name);

    if (!ToolClass) {
      if (name === 'finish') {
        return { content: [{ type: 'text', text: String(args?.output ?? '') }] };
      }
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }

    try {
      const node = new ToolClass();
      node.setParams(args ?? {});
      const result = await new AsyncFlow(node).runAsync({});
      const text = typeof result === 'string' ? result : JSON.stringify(result ?? null, null, 2);
      return { content: [{ type: 'text', text: text ?? '' }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool '${name}' failed: ${error.message}` }],
        isError: true,
      };
    }
  }

  async handleMessage(message) {
    const { id, method, params = {} } = message;
    const isNotification = id === undefined;

    try {
      let result;
      switch (method) {
        case 'initialize':
          result = {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: this.name, version: this.version },
          };
          break;
        case 'notifications/initialized':
        case 'notifications/cancelled':
          return null;
        case 'ping':
          result = {};
          break;
        case 'tools/list':
          result = { tools: this.definitions.map(toMCPTool) };
          break;
        case 'tools/call':
          result = await this.callTool(params);
          break;
        case 'resources/list':
          result = { resources: [] };
          break;
        case 'prompts/list':
          result = { prompts: [] };
          break;
        default:
          throw new RpcError(-32601, `Method not found: ${method}`);
      }
      return isNotification ? null : { jsonrpc: '2.0', id, result };
    } catch (error) {
      if (isNotification) return null;
      return {
        jsonrpc: '2.0',
        id,
        error: { code: error instanceof RpcError ? error.code : -32603, message: error.message },
      };
    }
  }

  async start({ input = process.stdin, output = process.stdout } = {}) {
    const lines = readline.createInterface({ input, crlfDelay: Infinity });

    for await (const line of lines) {
      if (!line.trim()) continue;

      let message;
      try {
        message = JSON.parse(line);
      } catch {
        output.write(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        }) + '\n');
        continue;
      }

      const response = await this.handleMessage(message);
      if (response) output.write(JSON.stringify(response) + '\n');
    }
  }
}

export function createMCPServer(options) {
  return new QFlowMCPServer(options);
}
