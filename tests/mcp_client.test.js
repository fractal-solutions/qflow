import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import { AsyncFlow } from '../src/qflow.js';
import { MCPClientNode } from '../src/mcp/client.js';

const stdioEntry = path.resolve(import.meta.dir, '../src/mcp/stdio.js');

describe('MCPClientNode', () => {
  test('requires a command and a tool', async () => {
    const node = new MCPClientNode();
    expect(node.execAsync()).rejects.toThrow('command');

    node.setParams({ command: 'bun' });
    expect(node.execAsync()).rejects.toThrow('tool');
  });

  test('calls a tool on a live qflow MCP server', async () => {
    const node = new MCPClientNode();
    node.setParams({
      command: process.execPath,
      args: [stdioEntry],
      tool: 'transform_node',
      toolArguments: {
        input: { n: 21 },
        transformFunction: '(data) => data.n * 2',
      },
      timeout: 30000,
    });

    const result = await new AsyncFlow(node).runAsync({});

    expect(result.isError).toBe(false);
    expect(result.text).toContain('42');
  }, 60000);
});
