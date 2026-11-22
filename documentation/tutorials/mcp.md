# Tutorial: MCP tool servers and clients

MCP (Model Context Protocol) is a small JSON-RPC protocol over newline-delimited JSON. qflow can be both sides:

- `QFlowMCPServer` exposes qflow tools to an MCP client (Claude Desktop, an IDE, another agent).
- `MCPClientNode` lets a qflow agent call an external MCP server by launching it as a child process.

The point of doing this in 2.0 is that neither side needs its own tool definition. `ToolSpec` is the single source of truth for the agent prompt, MCP `tools/list`, LLM tool schemas, and generated docs.

## 1. Define tools once

```javascript
import { ToolSpec, ToolRegistry, generateToolDocs } from '@fractal-solutions/qflow/tool-spec';

const echo = new ToolSpec({
  name: 'echo',                       // MCP name: 'echo'
  namespace: 'demo',                  // qualified name: 'demo.echo'
  description: 'Echo a value back to the caller.',
  parameters: {
    type: 'object',
    properties: { value: { type: 'string' } },
    required: ['value'],
  },
  capabilities: ['read'],
  permissions: ['public'],
  idempotencyKey: '{{value}}',        // repeated calls with the same value are cached
  execute: async ({ value }) => ({ echoed: value }),
});

const registry = new ToolRegistry({
  tools: [echo],
  grantedCapabilities: ['read'],
  grantedPermissions: ['public'],
});

console.log(registry.mcpTools());     // [{ name, description, inputSchema }]
console.log(registry.llmTools());     // OpenAI-style function definitions
console.log(generateToolDocs(registry)); // Markdown for humans
```

`ToolRegistry.list()` filters out tools the current capability/permission grant does not allow. A tool that needs `write` or `internal` simply never appears in `tools/list` for a read-only grant.

## 2. Serve those tools over stdio

```javascript
import { QFlowMCPServer } from '@fractal-solutions/qflow/mcp';

const server = new QFlowMCPServer({ toolRegistry: registry, name: 'qflow-demo', version: '2.0.0' });
await server.start(); // reads stdin line by line, writes one JSON response per line
```

Run it from a checkout with `bun src/mcp/stdio.js`, or from an installed package with `qflow-mcp` (the default server discovers tools from registered node classes instead of a custom registry).

Talk to it by writing one JSON object per line:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"demo.echo","arguments":{"value":"hello"}}}
```

The responses look like this:

```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":false}},"serverInfo":{"name":"qflow-demo","version":"2.0.0"}}}
{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"demo.echo","description":"Echo a value back to the caller.","inputSchema":{"type":"object","properties":{"value":{"type":"string"}},"required":["value"]}}]}}
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"{\n  \"echoed\": \"hello\"\n}"}]}}
```

Notes:

- Notifications (`id` omitted) produce **no** response line.
- Unknown methods return JSON-RPC error `-32601`.
- Tool failures return `isError: true` with the message in `content[0].text`; they do not crash the server.
- For tests, skip stdio and call `await server.handleMessage({ id: 1, method: 'tools/list', params: {} })` directly.

## 3. Call an external MCP server from a flow

`MCPClientNode` handles the handshake, request IDs, timeouts and child-process cleanup for you.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { MCPClientNode } from '@fractal-solutions/qflow/mcp';

const client = new MCPClientNode();
client.setParams({
  command: process.execPath,                  // bun when the flow runs under bun
  args: ['./src/mcp/stdio.js'],               // or ['node_modules/.bin/qflow-mcp']
  tool: 'echo',
  toolArguments: { value: 'hello from a flow' },
  timeout: 10_000,
});

const result = await new AsyncFlow(client).runAsync({});
// result = { content, text, data, isError }
// result.data = { echoed: 'hello from a flow' }
```

`data` is the JSON-parsed tool text when possible; otherwise it is the raw string. Check `isError` before trusting `data`.

## 4. Make the registry safe to expose

```javascript
import { ToolSpec, ToolRegistry } from '@fractal-solutions/qflow/tool-spec';

const refund = new ToolSpec({
  name: 'refund',
  description: 'Issue a refund.',
  parameters: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] },
  capabilities: ['write'],
  permissions: ['internal'],
  idempotencyKey: '{{orderId}}',
  execute: async ({ orderId }) => refundApi.issue(orderId),
});

const publicRegistry = new ToolRegistry({
  tools: [echo, refund],
  grantedCapabilities: ['read'],
  grantedPermissions: ['public'],
});

publicRegistry.list().map(spec => spec.qualifiedName); // ['demo.echo'] — refund is hidden
```

Practical rules:

- Grant the minimum capabilities. A capability grant requires **all** of a tool's capabilities; a permission grant requires **at least one** matching permission.
- Use stable `idempotencyKey` templates for anything that writes. The MCP server calls `registry.execute()` without per-request grants, so set grants on the registry itself.
- Set `timeoutMs` on tools that can hang, and use `dryRun` for previews.
- Mark internal tools `hidden: true` if they should not appear in docs or `tools/list` at all.

## 5. Where to go next

- [Provider-neutral LLM nodes](provider-neutral-llm.md) — pass `registry.llmTools()` straight into an LLM request.
- [Agent strategies as flows](agent-flows.md) — give the same registry to `AgentEngine`.
- The working example: `bun examples/v2/unified-tool-contract.js`.
