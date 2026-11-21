import { describe, expect, test } from 'bun:test';
import { AsyncNode } from '../src/qflow.js';
import {
  ToolRegistry,
  ToolSpec,
  generateToolDocs,
  toolSpecFromNode,
} from '../src/tool_spec.js';
import { QFlowMCPServer } from '../src/mcp/server.js';

class EchoNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: 'echo',
      description: 'Echoes a value.',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          mode: { type: 'string', enum: ['short', 'long'] },
        },
        required: ['value'],
      },
    };
  }

  async execAsync() {
    return `echo:${this.params.value}`;
  }

  async postAsync() {
    return 'default';
  }
}

describe('ToolSpec and ToolRegistry', () => {
  test('derives a spec from getToolDefinition() and validates arguments', () => {
    const spec = toolSpecFromNode(EchoNode);
    expect(spec).toBeInstanceOf(ToolSpec);
    expect(spec.validate({})).toEqual(["Missing required parameter: 'value'."]);
    expect(spec.validate({ value: 'x', mode: 'nope' })).toHaveLength(1);
    expect(spec.validate({ value: 'x', mode: 'short' })).toEqual([]);
    expect(spec.toMCPTool().inputSchema).toEqual(spec.parameters);
    expect(spec.toLLMTool().function.name).toBe('echo');
  });

  test('filters by granted capabilities and permissions, and supports namespaces', () => {
    const registry = new ToolRegistry({
      tools: [
        new ToolSpec({ name: 'read', description: 'read', parameters: { type: 'object' }, capabilities: ['read'] }),
        new ToolSpec({ name: 'write', description: 'write', parameters: { type: 'object' }, capabilities: ['write'], permissions: ['fs'] }),
        new ToolSpec({ name: 'search', namespace: 'web', description: 'search', parameters: { type: 'object' } }),
      ],
    });

    expect(registry.list({ grantedCapabilities: ['read'] }).map(spec => spec.name)).toEqual(['read', 'search']);
    expect(registry.list({ grantedCapabilities: ['read', 'write'], grantedPermissions: ['fs'] })).toHaveLength(3);
    expect(registry.list({ namespace: 'web' })[0].qualifiedName).toBe('web.search');
    expect(registry.get('web.search')).toBe(registry.get('search'));
  });

  test('executes nodes, honours dry-run, idempotency keys and timeouts', async () => {
    let calls = 0;
    const registry = new ToolRegistry({
      tools: [
        toolSpecFromNode(EchoNode, { idempotencyKey: '{{value}}' }),
        new ToolSpec({
          name: 'slow',
          description: 'slow',
          parameters: { type: 'object' },
          timeoutMs: 20,
          execute: async () => {
            calls += 1;
            await new Promise(resolve => setTimeout(resolve, 100));
            return 'done';
          },
        }),
      ],
    });

    const first = await registry.execute('echo', { value: 'x' });
    const second = await registry.execute('echo', { value: 'x' });
    expect(first.result).toBe('echo:x');
    expect(second.replayed).toBe(true);

    const dry = await registry.execute('echo', { value: 'y' }, { dryRun: true });
    expect(dry.dryRun).toBe(true);
    expect(dry.result).toBeUndefined();

    await expect(registry.execute('slow', {})).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(calls).toBe(1);
  });

  test('generates MCP tools and docs from the same specs', () => {
    const registry = new ToolRegistry({ tools: [toolSpecFromNode(EchoNode)] });
    const server = new QFlowMCPServer({ toolRegistry: registry });

    expect(registry.llmTools()[0].type).toBe('function');
    expect(generateToolDocs(registry)).toContain('`echo`');
    expect(server.definitions[0].name).toBe('echo');
  });

  test('MCP tools/call uses the registry execute path', async () => {
    const registry = new ToolRegistry({
      tools: [new ToolSpec({
        name: 'double',
        description: 'Doubles a number.',
        parameters: { type: 'object', properties: { value: { type: 'number' } }, required: ['value'] },
        execute: async args => args.value * 2,
      })],
    });
    const server = new QFlowMCPServer({ toolRegistry: registry });

    const listed = await server.handleMessage({ id: 1, method: 'tools/list' });
    expect(listed.result.tools[0].name).toBe('double');

    const called = await server.handleMessage({
      id: 2,
      method: 'tools/call',
      params: { name: 'double', arguments: { value: 21 } },
    });
    expect(called.result.content[0].text).toBe('42');
  });
});
