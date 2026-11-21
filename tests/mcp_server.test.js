import { describe, expect, test } from 'bun:test';
import { Readable, Writable } from 'node:stream';
import { AsyncNode } from '../src/qflow.js';
import { QFlowMCPServer } from '../src/mcp/server.js';

class EchoNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: 'echo',
      description: 'Echoes the supplied text.',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
    };
  }

  async execAsync() {
    return { echo: this.params.text };
  }

  async postAsync() {
    return 'default';
  }
}

const makeServer = () => new QFlowMCPServer({ toolClasses: [EchoNode], version: '2.0.0-test' });

describe('QFlowMCPServer', () => {
  test('initialize advertises tools capability', async () => {
    const response = await makeServer().handleMessage({
      jsonrpc: '2.0', id: 1, method: 'initialize', params: {},
    });

    expect(response.result.serverInfo).toEqual({ name: 'qflow', version: '2.0.0-test' });
    expect(response.result.capabilities.tools).toBeDefined();
    expect(response.result.protocolVersion).toBe('2024-11-05');
  });

  test('tools/list exposes node definitions as MCP tools', async () => {
    const response = await makeServer().handleMessage({
      jsonrpc: '2.0', id: 2, method: 'tools/list', params: {},
    });

    expect(response.result.tools).toHaveLength(1);
    expect(response.result.tools[0].name).toBe('echo');
    expect(response.result.tools[0].inputSchema.required).toEqual(['text']);
  });

  test('tools/call executes a node and returns its exec result', async () => {
    const response = await makeServer().handleMessage({
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'echo', arguments: { text: 'hello' } },
    });

    expect(response.result.isError).toBeUndefined();
    expect(JSON.parse(response.result.content[0].text)).toEqual({ echo: 'hello' });
  });

  test('unknown tools return an MCP tool error', async () => {
    const response = await makeServer().handleMessage({
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: { name: 'missing', arguments: {} },
    });

    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toContain('Unknown tool');
  });

  test('unknown methods return a JSON-RPC method-not-found error', async () => {
    const response = await makeServer().handleMessage({
      jsonrpc: '2.0', id: 5, method: 'does/not/exist', params: {},
    });

    expect(response.error.code).toBe(-32601);
  });

  test('serves newline-delimited JSON-RPC over stdio', async () => {
    const request = JSON.stringify({ jsonrpc: '2.0', id: 6, method: 'ping', params: {} });
    const input = Readable.from([`${request}\n`]);
    let written = '';
    const output = new Writable({
      write(chunk, _encoding, callback) {
        written += chunk.toString();
        callback();
      },
    });

    await makeServer().start({ input, output });

    expect(JSON.parse(written.trim())).toMatchObject({ jsonrpc: '2.0', id: 6, result: {} });
  });
});
