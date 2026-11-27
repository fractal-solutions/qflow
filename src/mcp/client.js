import { AsyncNode } from '../qflow.js';

const encoder = new TextEncoder();

/**
 * Calls a tool on an external MCP server, launched as a child process.
 * Bun-only: uses Bun.spawn and stream-based stdio.
 */
export class MCPClientNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: 'mcp_tool',
      description: 'Calls a tool on an external MCP server.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Executable that starts the MCP server.' },
          args: { type: 'array', items: { type: 'string' }, description: 'Arguments passed to the MCP server command.' },
          tool: { type: 'string', description: 'Name of the MCP tool to call.' },
          toolArguments: { type: 'object', description: 'Arguments for the MCP tool.' },
          env: { type: 'object', description: 'Extra environment variables for the MCP server.' },
          cwd: { type: 'string', description: 'Working directory for the MCP server.' },
          timeout: { type: 'number', description: 'Per-request timeout in milliseconds. Defaults to 60000.' },
        },
        required: ['command', 'tool'],
      },
    };
  }

  async execAsync() {
    const {
      command,
      args = [],
      tool,
      toolArguments = {},
      env = {},
      cwd = process.cwd(),
      timeout = 60000,
    } = this.params;

    if (!command) throw new Error('MCPClientNode requires a `command`.');
    if (!tool) throw new Error('MCPClientNode requires a `tool`.');

    const child = Bun.spawn([command, ...args], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      cwd,
      env: { ...process.env, ...env },
    });

    const pending = new Map();
    const decoder = new TextDecoder();
    let nextId = 1;
    let buffer = '';
    let streamError = null;

    const readLoop = (async () => {
      const reader = child.stdout.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let index;
          while ((index = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, index).trim();
            buffer = buffer.slice(index + 1);
            if (!line) continue;

            let message;
            try {
              message = JSON.parse(line);
            } catch {
              continue;
            }
            if (message.id == null) continue;

            const entry = pending.get(message.id);
            if (!entry) continue;
            clearTimeout(entry.timer);
            pending.delete(message.id);

            if (message.error) entry.reject(new Error(message.error.message ?? 'MCP error'));
            else entry.resolve(message.result);
          }
        }
      } catch (error) {
        streamError = error;
      } finally {
        for (const entry of pending.values()) {
          clearTimeout(entry.timer);
          entry.reject(streamError ?? new Error('MCP server closed the connection'));
        }
        pending.clear();
      }
    })();

    const stdin = child.stdin;
    const writeLine = message => stdin.write(encoder.encode(JSON.stringify(message) + '\n'));

    const send = (method, params) => new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MCP request '${method}' timed out after ${timeout}ms`));
      }, timeout);

      pending.set(id, { resolve, reject, timer });
      try {
        writeLine({ jsonrpc: '2.0', id, method, params });
      } catch (error) {
        clearTimeout(timer);
        pending.delete(id);
        reject(error);
      }
    });

    const notify = (method, params) => writeLine({ jsonrpc: '2.0', method, params });

    try {
      await send('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'qflow', version: '2.0.0' },
      });
      await notify('notifications/initialized', {});

      const result = await send('tools/call', { name: tool, arguments: toolArguments });
      const content = result?.content ?? [];
      const text = content.filter(item => item.type === 'text').map(item => item.text).join('\n');

      let data = text;
      try {
        data = JSON.parse(text);
      } catch {
        // Non-JSON tool output is still returned as text.
      }

      return { content, text, data, isError: Boolean(result?.isError) };
    } finally {
      try {
        stdin.end();
      } catch {
        // The child may already have closed its stdin.
      }
      child.kill();
      await readLoop.catch(() => {});
      await child.exited.catch(() => {});
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.mcpResult = execRes;
    return 'default';
  }
}
