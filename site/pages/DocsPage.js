window.DocsPage = () => {
    const CodeBlock = window.CodeBlock;
    const NODE_DOCS = window.NODE_DOCS || {};
    const [activeTopic, setActiveTopic] = React.useState('overview');
    const [nodeQuery, setNodeQuery] = React.useState('');
    const [activeNode, setActiveNode] = React.useState(null);
    const [navOpen, setNavOpen] = React.useState(false);

    const topics = {
        'overview': {
            title: 'Overview',
            content: `
                <p>qflow 2.0.0 is a Bun-only JavaScript library for building workflows and autonomous, tool-using agents. Install it with <code>bun add @fractal-solutions/qflow</code> and import from focused public subpaths.</p>
                <p>Use qflow to chain operations, automate systems, process data, and build agentic workflows that can reason, call tools, and react to real-time inputs.</p>
                <ul>
                    <li><strong>Minimal surface area:</strong> Nodes and flows are the core primitives.</li>
                    <li><strong>Async-first:</strong> AsyncNode and AsyncFlow are built in.</li>
                    <li><strong>Agent-ready:</strong> ToolSpec, ToolRegistry and five reasoning strategies.</li>
                    <li><strong>Durable:</strong> SQLite checkpoints, approvals, schedules and replay-safe effects.</li>
                    <li><strong>Bun-native:</strong> 2.0.0 runs on Bun only, with ESM subpath exports.</li>
                </ul>
            `
        },
        'core-primitives': {
            title: 'Core Primitives',
            content: `
                <p>qflow is built around a small, consistent runtime. You build Nodes, connect them in a Flow, and pass a shared state object through the graph. This keeps data movement explicit, debuggable, and easy to evolve as your workflow grows.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Shared state</h4>
                <p>A mutable object that flows through each node. It is the primary mechanism for passing context, accumulating results, and coordinating subflows.</p>
                <ul>
                    <li><strong>Single source of truth:</strong> treat <code>shared</code> as your workflow's memory.</li>
                    <li><strong>Predictable handoff:</strong> every node can read/write to shared.</li>
                    <li><strong>Low ceremony:</strong> no DTOs or heavy schemas unless you want them.</li>
                </ul>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Node lifecycle</h4>
                <p>Nodes implement <code>prep</code>, <code>exec</code>, and <code>post</code>. Async nodes mirror this with <code>prepAsync</code>, <code>execAsync</code>, and <code>postAsync</code>. Each stage can read and write shared state.</p>
                <ul>
                    <li><strong>prep:</strong> compute inputs, read shared, validate params.</li>
                    <li><strong>exec:</strong> do the actual work (IO, compute, tool call).</li>
                    <li><strong>post:</strong> write results to shared and choose next action.</li>
                </ul>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Flow orchestration</h4>
                <p>Flows connect nodes with <code>.next()</code>. You can branch on returned actions, invoke subflows, and chain batches for iterative work.</p>
                <ul>
                    <li><strong>Linear:</strong> node A -> node B -> node C.</li>
                    <li><strong>Conditional:</strong> return action strings to route to different nodes.</li>
                    <li><strong>Subflows:</strong> encapsulate complex logic and reuse it.</li>
                </ul>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Retries & fallback</h4>
                <p>AsyncNode supports retries and fallback handlers for resilient execution. This is ideal for flaky APIs and transient errors.</p>
                <ul>
                    <li><strong>Retries:</strong> configure retry count and backoff.</li>
                    <li><strong>Fallback:</strong> provide a graceful alternative when a node fails.</li>
                </ul>
            `
        },
        'async-and-batch': {
            title: 'Async and Batch',
            content: `
                <p>Asynchronous execution is first-class. Use AsyncNode and AsyncFlow for I/O-heavy tasks, and batch flows for iterating over collections. This keeps your workflows responsive while handling APIs, file systems, and external services.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">AsyncFlow</h4>
                <p>Run async nodes with <code>runAsync()</code> and capture outputs in shared state. This is the standard for networked tools and file I/O.</p>
                <ul>
                    <li><strong>Non-blocking:</strong> await I/O without freezing the pipeline.</li>
                    <li><strong>Composable:</strong> async nodes behave exactly like sync nodes in the graph.</li>
                    <li><strong>Observable:</strong> events include async durations and statuses.</li>
                </ul>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Batch flows</h4>
                <p>AsyncBatchFlow and AsyncParallelBatchFlow let you process lists sequentially or in parallel while reusing a subflow.</p>
                <ul>
                    <li><strong>Sequential batch:</strong> maintain ordering or rate limits.</li>
                    <li><strong>Parallel batch:</strong> maximize throughput when tasks are independent.</li>
                    <li><strong>Shared context:</strong> aggregate results into shared state.</li>
                </ul>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">IteratorNode</h4>
                <p>Use IteratorNode when you want to apply a subflow to each item in a collection with full shared context. It provides a clean way to reuse logic without custom loops.</p>
            `
        },
        'agents-and-tools': {
            title: 'Agents and Tools',
            content: `
                                <p>Agents use one <code>AgentEngine</code> with declarative strategies. Tools are defined once with <code>ToolSpec</code> and shared with agents, MCP, and LLM schemas.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">AgentNode</h4>
                <p>Use an options object with an <code>llmNode</code> and a <code>toolRegistry</code>. The agent chooses tools based on the goal and observes tool output.</p>
                <ul>
                    <li><strong>One engine:</strong> strategy is data, not duplicated loops.</li>
                    <li><strong>Tool contract:</strong> permissions, capabilities, and idempotency live on the ToolSpec.</li>
                    <li><strong>Memory-aware:</strong> pair with MemoryStoreNode or SemanticMemoryNode for context.</li>
                </ul>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Tool definitions</h4>
                <p><code>ToolSpec</code> and <code>toolSpecFromNode()</code> produce JSON schemas that inform and validate tool calls.</p>
                <ul>
                    <li><strong>Safe by design:</strong> parameters must match schema.</li>
                    <li><strong>Shared:</strong> the same spec feeds agents, MCP, and generated LLM tools.</li>
                    <li><strong>Composable:</strong> tools are reusable in any flow.</li>
                </ul>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Agent strategies</h4>
                <p>qflow ships five declarative reasoning strategies.</p>
                <ul>
                    <li><strong>default / RAOR:</strong> reason, act, observe, refine.</li>
                    <li><strong>OODA:</strong> observe, orient, decide, act.</li>
                    <li><strong>LPAVRL, PEMA:</strong> planning and adaptive loops for longer tasks.</li>
                </ul>
            `
        },
        'observability': {
            title: 'Observability',
            content: `
                <p>AsyncFlow emits detailed lifecycle events for tracing, metrics, and live monitoring.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Events</h4>
                <p>Listen to <code>flow:start</code>, <code>flow:end</code>, <code>node:start</code>, and <code>node:end</code> to capture durations, statuses, and errors.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Payloads</h4>
                <p>Each event includes timing, node class, status, and error metadata to help debug complex flows.</p>
            `
        },
        'logging': {
            title: 'Logging',
            content: `
                <p>qflow supports per-node logging configuration. You can direct logs to multiple backends and control verbosity globally.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Logging targets</h4>
                <p>Write to console, files, event emitters, or remote endpoints. Each node can override the logging destination.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Log levels</h4>
                <p>Set a global log level (DEBUG, INFO, WARN, ERROR) to control verbosity.</p>
            `
        },
        'create-qflow': {
            title: 'create-qflow',
            content: `
                <p>create-qflow is the official scaffolder for qflow projects. It prompts you to select a workflow style so you can start in the coding approach that fits your team.</p>
                <p>Every scaffolded project includes an <code>AGENTS.md</code> file that documents core principles, architecture, and best practices for qflow projects.</p>
                <p>Learn more about the library on the <a href="https://www.npmjs.com/package/@fractal-solutions/qflow" target="_blank" rel="noopener noreferrer">npm package</a> and the <a href="https://github.com/fractal-solutions/qflow" target="_blank" rel="noopener noreferrer">GitHub repository</a>.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Installation</h4>
                <p>Bun is required. Install qflow with <code>bun add @fractal-solutions/qflow</code>; use bunx to run the scaffolder:</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Usage</h4>
                <p>Replace the project name and follow the prompts to select a workflow style:</p>
            `
        },
        'workflow-styles': {
            title: 'Workflow Styles',
            content: `
                <p>create-qflow offers multiple coding styles to match your preferences and team habits.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Concise (Functional)</h4>
                <p>Create an <code>AsyncNode</code> and override methods directly. Best for quick scripts and small utilities.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Flexible (Object Spread)</h4>
                <p>Use object spread to extend an <code>AsyncNode</code> instance inline. Great for concise inline nodes.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Structured (Class-based)</h4>
                <p>Define a dedicated class that extends <code>AsyncNode</code> for encapsulation and reuse. Ideal for larger teams and shared libraries.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Agent (Generic LLM)</h4>
                <p>Scaffold a generic agent with a configurable base URL, API key, model, and tools. Useful for multi-tool, multi-step automation.</p>
            `
        },
        'custom-tools': {
            title: 'Custom Tools',
            content: `
                                <p>Extend qflow agents with a <code>ToolSpec</code>, then register it in a <code>ToolRegistry</code>.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Define a tool</h4>
                <p>Use <code>new ToolSpec({ name, description, parameters, execute })</code>. Add capabilities and permissions for fine-grained access.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Register the tool</h4>
                <p>Add it to a <code>ToolRegistry</code> and pass that registry to your agent or MCP server.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Design tips</h4>
                <ul>
                    <li><strong>Small surface area:</strong> keep parameters tight and explicit.</li>
                    <li><strong>Deterministic outputs:</strong> return structured data where possible.</li>
                    <li><strong>Shared state:</strong> store results in shared for downstream nodes.</li>
                </ul>
            `
        },
        'common-patterns': {
            title: 'Common Patterns',
            content: `
                <p>Practical recipes for everyday workflows. These patterns show how teams structure reusable flows, keep state predictable, and blend tools, data, and agents.</p>
                <p>Each pattern below is designed to be copy-paste friendly and modular. Swap nodes, change the shared state shape, or insert observability and logging nodes to match your stack.</p>
                <ul>
                    <li><strong>Data pipelines:</strong> ingest, validate, transform, and persist.</li>
                    <li><strong>Agent workflows:</strong> tools, memory, and multi-step reasoning.</li>
                    <li><strong>Automation loops:</strong> poll, compare, notify, and escalate.</li>
                    <li><strong>Batch processing:</strong> sequential or parallel item handling.</li>
                </ul>
            `
        },
        'stable-2': {
            title: "What's new in 2.0.0",
            content: `
                <p>qflow 2.0.0 is the stable release. It is <strong>Bun-only</strong> and ESM-only, published as one package with focused subpath exports.</p>
                <ul>
                    <li><strong>Install:</strong> <code>bun add @fractal-solutions/qflow</code>.</li>
                    <li><strong>Core stays familiar:</strong> Node/Flow and AsyncNode/AsyncFlow still work.</li>
                    <li><strong>New boundaries:</strong> <code>/durable</code>, <code>/llm</code>, <code>/agent</code>, <code>/mcp</code>, <code>/tool-spec</code>, <code>/graph</code>, <code>/eval</code>, <code>/bun</code>, <code>/approval</code>, <code>/schedule</code>, <code>/budget</code>, and <code>/memory</code>.</li>
                    <li><strong>Optional integrations:</strong> heavy packages are opt-in optional peer dependencies; qflow prints the exact <code>bun add</code> command when one is missing.</li>
                </ul>
                <p>Read the <a href="https://github.com/fractal-solutions/qflow/blob/main/MIGRATION.md" target="_blank" rel="noopener noreferrer">migration guide</a> before upgrading a 1.x project.</p>
            `
        },
        'mcp': {
            title: 'MCP',
            content: `
                <p>Expose registered qflow nodes as MCP tools over stdio, or call external MCP servers from a flow.</p>
                <ul>
                    <li><strong>QFlowMCPServer:</strong> <code>initialize</code>, <code>tools/list</code>, and <code>tools/call</code>.</li>
                    <li><strong>MCPClientNode:</strong> spawn an MCP server and dispatch tool calls.</li>
                    <li><strong>One contract:</strong> <code>ToolSpec</code> feeds agents, MCP, LLM schemas, and generated docs.</li>
                </ul>
            `
        },
        'durable': {
            title: 'Durable Flows',
            content: `
                <p><code>DurableFlow</code> and <code>SQLiteCheckpointer</code> persist steps, side effects, approvals, schedules, and traces so a run can resume after a restart.</p>
                <ul>
                    <li><strong>Caller-owned runId:</strong> reusing the same id resumes the same run.</li>
                    <li><strong>Status:</strong> <code>completed</code>, <code>suspended</code>, or <code>scheduled</code>.</li>
                    <li><strong>Version policy:</strong> <code>abort</code>, <code>migrate</code>, or <code>ignore</code>.</li>
                </ul>
            `
        },
        'llm': {
            title: 'Provider-neutral LLM',
            content: `
                <p><code>LLMNode</code> speaks one interface to OpenAI-compatible providers, Anthropic, Ollama, and Gemini.</p>
                <ul>
                    <li><strong>Adapters:</strong> register or negotiate capabilities per provider.</li>
                    <li><strong>Caching:</strong> deterministic replay with <code>cache</code>, <code>cacheKey</code>, and <code>cacheTtlMs</code>.</li>
                    <li><strong>Budgets:</strong> real token and cost accounting with <code>BudgetTracker</code>.</li>
                </ul>
            `
        },
        'tool-spec': {
            title: 'ToolSpec & ToolRegistry',
            content: `
                <p>Define each tool once. <code>ToolSpec</code> carries parameters, capabilities, permissions, timeout, and idempotency; <code>ToolRegistry</code> grants, filters, and executes it.</p>
                <ul>
                    <li><strong>Agent tools:</strong> consume the same definition as prompts.</li>
                    <li><strong>MCP tools:</strong> no second schema to maintain.</li>
                    <li><strong>LLM tools:</strong> generated JSON schemas stay in sync.</li>
                </ul>
            `
        },
        'graph-eval': {
            title: 'Graph, Contracts & Eval',
            content: `
                <p>Model routing explicitly, validate boundaries, then replay saved traces as regression tests.</p>
                <ul>
                    <li><strong>Graph:</strong> <code>MapNode</code>, <code>ReduceNode</code>, <code>JoinNode</code>, <code>BranchNode</code>, and <code>CycleNode</code>.</li>
                    <li><strong>Contracts:</strong> <code>defineState()</code> and <code>StateContract</code>.</li>
                    <li><strong>Eval:</strong> <code>AssertNode</code>, <code>ScoreNode</code>, <code>CompareNode</code>, and <code>ReplayNode</code>.</li>
                </ul>
            `
        },
        'bun-native': {
            title: 'Bun-native Nodes',
            content: `
                <p>No optional native package is required for local process, stream, file-watch, or SQLite work.</p>
                <ul>
                    <li><code>BunSpawnNode</code> for child processes.</li>
                    <li><code>StreamMapNode</code>, <code>StreamFilterNode</code>, and <code>StreamReduceNode</code>.</li>
                    <li><code>SQLiteQueryNode</code> and <code>FileWatchNode</code>.</li>
                </ul>
            `
        },
        'production-gaps': {
            title: 'Approval, Schedule, Budget & Memory',
            content: `
                <p>Four durable primitives close the production gaps in 2.0.0.</p>
                <ul>
                    <li><strong>Approval:</strong> suspend a run until a reviewer decides.</li>
                    <li><strong>Schedule:</strong> persist a due time and resume later.</li>
                    <li><strong>Budget:</strong> stop before cost, tokens, steps, or duration exceed a limit.</li>
                    <li><strong>Memory:</strong> per-tenant stores with add/search/get/delete/list/clear.</li>
                </ul>
                <p>Each path has a 1-2-3 tutorial in the repository's <code>documentation/tutorials</code> folder.</p>
            `
        },
        'node-catalog': {
            title: 'Node Catalog',
            content: `
                <p>qflow 2.0 ships built-in catalogs for data, system, web, agents, LLMs, graphs, evaluation, Bun-native work, and production-gap primitives. Use the search to filter and click a node for full documentation.</p>
            `
        }
    };

    const createQflowInstall = `bunx create-qflow@latest my-new-project`;
    const createQflowUsage = `bunx create-qflow@latest <project-name>`;

    const functionalExample = `const myNode = new AsyncNode();\nmyNode.execAsync = async (prepRes, shared) => {\n  console.log('Executing myNode');\n  shared.data = 'Hello from functional node!';\n};\nmyNode.postAsync = async (shared, prepRes, execRes) => {\n  return 'next';\n};`;

    const spreadExample = `const myNode = {\n  ...new AsyncNode(),\n  async execAsync(prepRes, shared) {\n    console.log('Executing myNode');\n    shared.data = 'Hello from object spread node!';\n  },\n  async postAsync(shared, prepRes, execRes) {\n    return 'next';\n  }\n};`;

    const classExample = `class MyCustomNode extends AsyncNode {\n  async execAsync(prepRes, shared) {\n    console.log('Executing MyCustomNode');\n    shared.data = 'Hello from class-based node!';\n  }\n  async postAsync(shared, prepRes, execRes) {\n    return 'next';\n  }\n}\nconst myNode = new MyCustomNode();`;

    const agentExample = `const agent = new AgentNode({ llmNode: llm, toolRegistry });\nagent.setParams({ goal: 'Summarize recent metrics.' });\nconst flow = new AsyncFlow(agent);\nawait flow.runAsync({});`;

    const coreDiagram = `Shared State\n    │\n    ▼\n[Node A] -> [Node B] -> [Node C]\n    │             │\n    └── event: node:start / node:end\n          flow:start / flow:end`;

    const coreSnippet = `class MyNode extends AsyncNode {\n  async execAsync(prepRes, shared) {\n    shared.value = (shared.value || 0) + 1;\n    return 'default';\n  }\n}\nconst a = new MyNode();\nconst b = new MyNode();\na.next(b);\nawait new AsyncFlow(a).runAsync({ value: 0 });`;

    const asyncSnippet = `const fetch = new HttpRequestNode();\nfetch.setParams({ url: 'https://api.example.com' });\nconst flow = new AsyncFlow(fetch);\nawait flow.runAsync({});`;

    const batchSnippet = `const iterator = new IteratorNode();\niterator.setParams({\n  items: ['a', 'b', 'c'],\n  flow: new AsyncFlow(processNode)\n});\nawait new AsyncFlow(iterator).runAsync({});`;

    const agentToolSnippet = `import { ToolSpec, ToolRegistry } from '@fractal-solutions/qflow/tool-spec';\n\nconst myTool = new ToolSpec({\n  name: 'my_tool',\n  description: 'Does a thing',\n  parameters: { type: 'object', properties: { input: { type: 'string' } }, required: ['input'] },\n  execute: async ({ input }) => ({ input }),\n});\nconst toolRegistry = new ToolRegistry({ tools: [myTool] });\nconst agent = new AgentNode({ llmNode: llm, toolRegistry });`;

    const observabilitySnippet = `const flow = new AsyncFlow(startNode);\nflow.on('flow:start', ({ flowId }) => console.log('Flow', flowId));\nflow.on('node:end', ({ nodeClass, duration }) => console.log(nodeClass, duration));\nawait flow.runAsync({});`;

    const loggingSnippet = `import { setLogLevel, LogLevel } from '@fractal-solutions/qflow/logger';\nsetLogLevel(LogLevel.INFO);\n\nconst node = new HttpRequestNode();\nnode.setParams({\n  url: 'https://api.example.com',\n  logging: { method: 'file', params: { filePath: './logs/http.log' } }\n});`;

    const customToolSnippet = `// my_tools/MyCustomTool.js\nimport { toolSpecFromNode } from '@fractal-solutions/qflow/tool-spec';\nimport { MyCustomToolNode } from './MyCustomToolNode.js';\n\nexport const myCustomTool = toolSpecFromNode(MyCustomToolNode, {\n  namespace: 'custom',\n  permissions: ['public'],\n});`;

    const toolRegistrySnippet = `// tools.js\nimport { ToolRegistry, toolSpecFromNode } from '@fractal-solutions/qflow/tool-spec';\nimport { MyCustomToolNode } from './my_nodes/MyCustomToolNode.js';\n\nconst tool = toolSpecFromNode(MyCustomToolNode, {\n  namespace: 'custom',\n  permissions: ['public'],\n});\n\nexport const toolRegistry = new ToolRegistry({ tools: [tool] });`;

    const commonPatterns = [
        {
            title: 'ETL + validation pipeline',
            description: 'Fetch data, validate with JSON schema, transform, and store in a database.',
            code: `const fetch = new HttpRequestNode();\nconst validate = new DataValidationNode();\nconst transform = new TransformNode();\nconst db = new DatabaseNode();\n\nfetch.next(validate).next(transform).next(db);\nconst flow = new AsyncFlow(fetch);\nawait flow.runAsync({});`
        },
        {
            title: 'Polling + alerting loop',
            description: 'Check an endpoint on a schedule, compare to thresholds, and alert.',
            code: `const poll = new HttpRequestNode();\npoll.setParams({ url: 'https://api.example.com/metrics' });\n\nconst transform = new TransformNode();\ntransform.setParams({\n  transform: (shared, _, execRes) => ({\n    value: execRes.body.value,\n    alert: execRes.body.value > 80\n  })\n});\n\nconst notify = new SystemNotificationNode();\nnotify.setParams({ title: 'Metric Alert', message: 'Threshold breached.' });\n\npoll.next(transform).next(notify);\nconst flow = new AsyncFlow(poll);\nawait flow.runAsync({});`
        },
        {
            title: 'Multi-step approval workflow',
            description: 'Collect approval, log decisions, and notify stakeholders.',
            code: `import { DurableFlow, SQLiteCheckpointer, WaitForApprovalNode } from '@fractal-solutions/qflow/durable';\n\nconst gate = new WaitForApprovalNode({\n  approvalId: 'req-1',\n  prompt: 'Approve deployment?',\n});\ngate.next(approvedNode, 'approve');\ngate.next(rejectedNode, 'reject');\n\nconst checkpointer = new SQLiteCheckpointer('./runs.db');\nconst flow = new DurableFlow(gate, { checkpointer, version: '1.0.0' });\n\nconst pending = await flow.runDurable({\n  runId: 'deploy-approval-1',\n  shared: { requestId: 'req-1' },\n});\n\ncheckpointer.approve('deploy-approval-1', { by: 'alice' }, 'approval:req-1');\nawait flow.runDurable({ runId: 'deploy-approval-1', resume: true });`
        },
        {
            title: 'Agent + tool registry',
            description: 'Expose tools as nodes and let an agent plan the workflow.',
            code: `import { ToolRegistry, ToolSpec } from '@fractal-solutions/qflow/tool-spec';\nimport { AgentNode } from '@fractal-solutions/qflow/agent';\n\nconst httpTool = new ToolSpec({\n  name: 'http_request',\n  description: 'Call an HTTP endpoint',\n  parameters: { type: 'object' },\n  execute: async input => input,\n});\nconst toolRegistry = new ToolRegistry({ tools: [httpTool] });\nconst agent = new AgentNode({ llmNode: llm, toolRegistry });\nawait new AsyncFlow(agent).runAsync({});`
        },
        {
            title: 'File processing batch',
            description: 'Iterate over files, parse content, and store summaries.',
            code: `const iterator = new IteratorNode();\niterator.setParams({\n  items: ['file1.txt', 'file2.txt'],\n  flow: new AsyncFlow(readNode)\n});\nawait new AsyncFlow(iterator).runAsync({});`
        },
        {
            title: 'Batch + parallel fan-out',
            description: 'Process many items concurrently and merge results.',
            code: `const parallel = new AsyncParallelBatchFlow(processNode, { concurrency: 4 });\nconst batchNode = new BatchFlowNode(parallel);\nbatchNode.setParams({ items: [1, 2, 3, 4] });\n\nconst flow = new AsyncFlow(batchNode);\nawait flow.runAsync({});`
        },
        {
            title: 'RAG prep flow',
            description: 'Chunk files, embed them, and write to semantic memory.',
            code: `const list = new ListDirectoryNode();\nlist.setParams({ directoryPath: './docs' });\n\nconst iterator = new IteratorNode();\niterator.setParams({\n  items: ['file1.md', 'file2.md'],\n  flow: new AsyncFlow(readNode)\n});\n\nconst embed = new EmbeddingNode();\nconst memory = new SemanticMemoryNode();\n\nlist.next(iterator).next(embed).next(memory);\nconst flow = new AsyncFlow(list);\nawait flow.runAsync({});`
        },
        {
            title: 'Webhook to ETL',
            description: 'Receive webhooks, enrich, and store results.',
            code: `const webhook = new WebHookNode();\nwebhook.setParams({ port: 8080, path: '/events' });\n\nconst enrich = new HttpRequestNode();\nenrich.setParams({ url: 'https://api.example.com/enrich' });\n\nconst store = new DatabaseNode();\nstore.setParams({ adapter: 'sqlite', connection: ':memory:', action: 'insert', table: 'events' });\n\nwebhook.next(enrich).next(store);\nconst flow = new AsyncFlow(webhook);\nawait flow.runAsync({});`
        },
        {
            title: 'Interactive webview flow',
            description: 'Collect user input and present a summary via a webview.',
            code: `const input = new InteractiveWebviewNode();\ninput.setParams({ mode: 'custom-input', title: 'Feedback' });\nconst summary = new InteractiveWebviewNode();\nsummary.setParams({ mode: 'notification', title: 'Summary' });\ninput.next(summary);\nawait new AsyncFlow(input).runAsync({});`
        }
    ];

    const nodeCatalog = [
        {
            category: 'Data',
            description: 'Processing, storage, validation, and transformation utilities.',
            params: 'Input data, schema definitions, and transformation functions.',
            returns: 'Structured results, transformed data, or validation outcomes.',
            nodes: [
                { name: 'CodeInterpreterNode', docKey: 'code_interpreter', summary: 'Execute Python snippets and capture output.', uses: 'Data science, quick calculations, plotting.' },
                { name: 'DataExtractorNode', docKey: 'data_extractor', summary: 'Extract structured data from HTML, JSON, or text.', uses: 'Scraping, parsing logs, converting HTML to JSON.' },
                { name: 'DatabaseNode', docKey: 'database', summary: 'Run SQL queries and manage database connections.', uses: 'CRUD operations, reporting, ETL targets.' },
                { name: 'EmbeddingNode', docKey: 'embedding', summary: 'Generate vector embeddings for semantic workflows.', uses: 'RAG, semantic search, clustering.' },
                { name: 'MemoryNode', docKey: 'memory', summary: 'Store and retrieve memories via keyword search.', uses: 'Agent memory, lightweight caching.' },
                { name: 'SemanticMemoryNode', docKey: 'semantic_memory', summary: 'Store and retrieve memories with semantic search.', uses: 'Long-term context, semantic retrieval.' },
                { name: 'TransformNode', docKey: 'transform', summary: 'Transform input data using JavaScript functions.', uses: 'Mapping, formatting, normalization.' },
                { name: 'PDFProcessorNode', docKey: 'pdf_processor', summary: 'Extract text and images from PDFs.', uses: 'Document ingestion, extraction pipelines.' },
                { name: 'SpreadsheetNode', docKey: 'spreadsheet', summary: 'Read and write CSV/XLSX files.', uses: 'Data export/import, reporting.' },
                { name: 'DataValidationNode', docKey: 'data_validation', summary: 'Validate data against JSON Schema.', uses: 'Input validation, data quality checks.' },
                { name: 'SummarizeNode', docKey: 'summarize', summary: 'Summarize text using an LLM node.', uses: 'Tool output compression, briefings.' },
            ]
        },
        {
            category: 'System',
            description: 'Local machine interaction, IO, and media processing.',
            params: 'File paths, commands, multimedia settings, device configs.',
            returns: 'File contents, command output, or system side effects.',
            nodes: [
                { name: 'ShellCommandNode', docKey: 'shell_command', summary: 'Execute shell commands and capture stdout/stderr.', uses: 'Automation, CLI integration.' },
                { name: 'ReadFileNode', docKey: 'read_file', summary: 'Read file contents into shared state.', uses: 'Ingest local data.' },
                { name: 'WriteFileNode', docKey: 'write_file', summary: 'Write content to a file.', uses: 'Reporting, exports.' },
                { name: 'AppendFileNode', docKey: 'append_file', summary: 'Append content to a file.', uses: 'Logs, incremental output.' },
                { name: 'ListDirectoryNode', docKey: 'list_directory', summary: 'List files and subdirectories.', uses: 'Discovery, file batch jobs.' },
                { name: 'SystemNotificationNode', docKey: 'system_notification', summary: 'Send OS-level notifications.', uses: 'User alerts, monitoring.' },
                { name: 'DisplayImageNode', docKey: 'display_image', summary: 'Open an image in the default viewer.', uses: 'Image preview pipelines.' },
                { name: 'HardwareInteractionNode', docKey: 'hardware_interaction', summary: 'Communicate with hardware via serial ports.', uses: 'IoT, device control.' },
                { name: 'ImageGalleryNode', docKey: 'image_gallery', summary: 'Generate an HTML image gallery.', uses: 'Batch image review.' },
                { name: 'SpeechSynthesisNode', docKey: 'speech_synthesis', summary: 'Convert text into spoken audio.', uses: 'Voice alerts, accessibility.' },
                { name: 'MultimediaProcessingNode', docKey: 'multimedia_processing', summary: 'Process audio/video with ffmpeg.', uses: 'Media conversion, clip creation.' },
                { name: 'RemoteExecutionNode', docKey: 'remote_execution', summary: 'Execute commands via SSH.', uses: 'Remote automation.' },
            ]
        },
        {
            category: 'Interaction',
            description: 'User input and interactive UI nodes.',
            params: 'Prompt text, dialog titles, UI configuration.',
            returns: 'User input or interaction results.',
            nodes: [
                { name: 'UserInputNode', docKey: 'user_input', summary: 'Prompt the user in the terminal.', uses: 'CLI interactions, quick prompts.' },
                { name: 'InteractiveInputNode', docKey: 'interactive_input', summary: 'Cross-platform GUI input prompt.', uses: 'Desktop prompts, confirmations.' },
                { name: 'InteractiveWebviewNode', docKey: 'interactive_webview', summary: 'Interactive dialogs and input collection.', uses: 'Rich UI forms, reviews.' },
                { name: 'WebviewNode', docKey: 'webview', summary: 'Render HTML in a desktop webview.', uses: 'Dashboards, local UI.' },
            ]
        },
        {
            category: 'Web',
            description: 'HTTP, scraping, browser control, and realtime connectivity.',
            params: 'URLs, headers, selectors, and browser actions.',
            returns: 'HTTP responses, scraped content, screenshots, or socket data.',
            nodes: [
                { name: 'HttpRequestNode', docKey: 'http_request', summary: 'Make HTTP requests with headers and body.', uses: 'APIs, webhooks, data fetching.' },
                { name: 'ScrapeURLNode', docKey: 'web_scraper', summary: 'Fetch and parse HTML content.', uses: 'Scraping, content extraction.' },
                { name: 'DuckDuckGoSearchNode', docKey: 'duckduckgo_search', summary: 'Run web search queries.', uses: 'Research, discovery.' },
                { name: 'GoogleSearchNode', docKey: 'google_search', summary: 'Search via Google Custom Search API.', uses: 'Curated web search.' },
                { name: 'BrowserControlNode', docKey: 'browser_control', summary: 'Drive Playwright to interact with pages.', uses: 'Form automation, testing.' },
                { name: 'NavigatorNode', docKey: 'navigator', summary: 'Control PinchTab instances for advanced navigation.', uses: 'Advanced browsing, snapshots.' },
                { name: 'WebSocketsNode', docKey: 'websockets', summary: 'Open and manage websocket connections.', uses: 'Realtime streams.' },
                { name: 'WebHookNode', docKey: 'webhook', summary: 'Expose a webhook endpoint and trigger flows.', uses: 'Inbound web events.' },
                { name: 'HttpServerNode', docKey: 'http_server', summary: 'Run a server and dispatch flows.', uses: 'Local APIs, mock servers.' },
            ]
        },
        {
            category: 'Flow Control',
            description: 'Compose flows and manage execution patterns.',
            params: 'Flow instances, iteration items, scheduling config.',
            returns: 'Flow outputs and orchestration results.',
            nodes: [
                { name: 'SubFlowNode', docKey: 'sub_flow', summary: 'Execute a nested flow inside another flow.', uses: 'Reusable workflows.' },
                { name: 'IteratorNode', docKey: 'iterator', summary: 'Iterate items and run a subflow.', uses: 'Batch processing.' },
                { name: 'SchedulerNode', docKey: 'scheduler', summary: 'Schedule flows on cron or delay.', uses: 'Recurring automation.' },
            ]
        },
        {
            category: 'Agents',
            description: 'Agent runtimes and reasoning helpers.',
            params: 'LLM nodes, tool registry, and agent goals.',
            returns: 'Agent decisions, tool outputs, and final responses.',
            nodes: [
                { name: 'AgentNode', docKey: 'agent', summary: 'Runs a tool-using reasoning loop.', uses: 'Autonomous workflows, multi-step tasks.' },
            ]
        },
        {
            category: 'Integrations',
            description: 'Popular service integrations and APIs.',
            params: 'API keys, resource IDs, and request payloads.',
            returns: 'Service responses and operation results.',
            nodes: [
                { name: 'GitNode', docKey: 'git', summary: 'Run Git operations inside workflows.', uses: 'Repo automation.' },
                { name: 'GitHubNode', docKey: 'github', summary: 'Create or manage GitHub issues.', uses: 'Issue automation.' },
                { name: 'HackerNewsNode', docKey: 'hackernews', summary: 'Fetch top stories and item details.', uses: 'Content aggregation.' },
                { name: 'StripeNode', docKey: 'stripe', summary: 'Create charges or retrieve balances.', uses: 'Payments automation.' },
                { name: 'GISNode', docKey: 'gis', summary: 'Run geocoding and reverse geocoding.', uses: 'Location workflows.' },
                { name: 'S3CloudStorageNode', docKey: 's3', summary: 'Interact with S3-compatible storage.', uses: 'Backups, object storage.' },
            ]
        },
        {
            category: 'LLMs',
            description: 'Hosted and local LLM integrations.',
            params: 'Prompt, API key, model name, and generation controls.',
            returns: 'Generated text or structured responses.',
            nodes: [
                { name: 'DeepSeekLLMNode', docKey: 'deepseek_llm', summary: 'DeepSeek API integration.', uses: 'Reasoning, summarization.' },
                { name: 'OpenAILLMNode', docKey: 'openai_llm', summary: 'OpenAI chat completion API.', uses: 'General LLM tasks.' },
                { name: 'GeminiLLMNode', docKey: 'gemini_llm', summary: 'Google Gemini API integration.', uses: 'Multimodal or text generation.' },
                { name: 'OllamaLLMNode', docKey: 'ollama_llm', summary: 'Local Ollama model inference.', uses: 'Private/local models.' },
                { name: 'HuggingFaceLLMNode', docKey: 'huggingface_llm', summary: 'HuggingFace inference API.', uses: 'Hosted model access.' },
                { name: 'OpenRouterLLMNode', docKey: 'openrouter_llm', summary: 'OpenRouter API integration.', uses: 'Multi-provider routing.' },
                { name: 'AgentDeepSeekLLMNode', docKey: 'agent_llm', summary: 'Agent-optimized DeepSeek adapter.', uses: 'Agent reasoning.' },
                { name: 'AgentOpenAILLMNode', docKey: 'agent_llm', summary: 'Agent-optimized OpenAI adapter.', uses: 'Agent reasoning.' },
                { name: 'AgentGeminiLLMNode', docKey: 'agent_llm', summary: 'Agent-optimized Gemini adapter.', uses: 'Agent reasoning.' },
            ]
        },
        {
            category: 'Bun-native',
            description: 'Process, stream, file-watch, and SQLite nodes backed by Bun built-ins.',
            params: 'Commands, streams, SQL, watch paths, and transform functions.',
            returns: 'Process results, transformed chunks, query rows, and watch events.',
            nodes: [
                { name: 'BunSpawnNode', docKey: 'bun_spawn', summary: 'Run a child process with Bun.spawn.', uses: 'Shell tasks, CLI wrappers.' },
                { name: 'SQLiteQueryNode', docKey: 'sqlite_query', summary: 'Query SQLite through bun:sqlite.', uses: 'Local persistence, reporting.' },
                { name: 'StreamMapNode / StreamFilterNode / StreamReduceNode', docKey: 'stream_map', summary: 'Compose Web Stream transforms.', uses: 'Streaming ingest, aggregation.' },
            ]
        },
        {
            category: 'Durability and Production Gaps',
            description: 'Resumable runs, human gates, schedules, budgets, and tenant memory.',
            params: 'Checkpointer, runId, approval ids, due times, limits, and tenants.',
            returns: 'Run status, suspended decisions, usage snapshots, and stored memories.',
            nodes: [
                { name: 'DurableFlow', docKey: 'durable_flow', summary: 'Persist steps and resume runs after restart.', uses: 'Checkout, long-lived jobs.' },
                { name: 'WaitForApprovalNode', docKey: 'approval_node', summary: 'Suspend for reviewer approval or rejection.', uses: 'Deploy gates, manual review.' },
                { name: 'ScheduleNode', docKey: 'schedule_node', summary: 'Persist a due time without a cron package.', uses: 'Reminders, nightly jobs.' },
                { name: 'BudgetNode', docKey: 'budget_node', summary: 'Enforce cost, token, step, and duration limits.', uses: 'LLM cost control.' },
                { name: 'MemoryStoreNode', docKey: 'memory_store', summary: 'Per-tenant add, search, get, delete, list, clear.', uses: 'Agent context, recall.' },
            ]
        },
        {
            category: 'LLM, Agents and MCP',
            description: 'Provider-neutral models, one tool contract, and MCP stdio tooling.',
            params: 'Provider config, prompts, ToolSpec definitions, and registries.',
            returns: 'Completions, agent decisions, tool results, and MCP responses.',
            nodes: [
                { name: 'LLMNode', docKey: 'llm_node', summary: 'One interface for OpenAI, Anthropic, Ollama, and Gemini.', uses: 'Generation, extraction, routing.' },
                { name: 'AgentNode', docKey: 'agent_engine', summary: 'Tool-using engine with five strategies.', uses: 'Autonomous workflows.' },
                { name: 'QFlowMCPServer', docKey: 'mcp_server', summary: 'Expose tools over MCP stdio.', uses: 'Editor and agent integrations.' },
                { name: 'ToolSpec / ToolRegistry', docKey: 'tool_spec', summary: 'Define a tool once for agents, MCP, and LLM schemas.', uses: 'Tool governance, docs.' },
            ]
        },
        {
            category: 'Graph and Eval',
            description: 'Explicit routing, state contracts, and trace-based regression tests.',
            params: 'Items, routes, fields, expected values, and saved traces.',
            returns: 'Aggregated results, validation errors, scores, and replay outcomes.',
            nodes: [
                { name: 'MapNode / ReduceNode / BranchNode', docKey: 'graph_nodes', summary: 'Explicit dataflow routing primitives.', uses: 'Pipelines, triage.' },
                { name: 'AssertNode / ReplayNode', docKey: 'eval_nodes', summary: 'Assert and replay saved traces.', uses: 'CI gates, regression tests.' },
            ]
        }
    ];

    const getNodeDoc = (docKey) => NODE_DOCS[docKey] || {};

    const renderTokenized = (text) => {
        if (!text) return null;
        const parts = text.split(/(`[^`]+`)/g).filter(Boolean);
        return parts.map((part, idx) => {
            if (part.startsWith('`') && part.endsWith('`')) {
                const token = part.slice(1, -1);
                return <code key={`${token}-${idx}`} className="param-token">{token}</code>;
            }
            return <span key={`${part}-${idx}`}>{part}</span>;
        });
    };

    const toListItems = (text) => {
        if (!text) return [];
        const lines = text.split('\n').map((line) => line.trim());
        const bullets = lines.filter((line) => line.startsWith('*') || line.startsWith('-'))
            .map((line) => line.replace(/^[-*]\s+/, '').trim());
        if (bullets.length > 0) return bullets;
        return lines.filter(Boolean);
    };

    const parseMarkdownTable = (text) => {
        if (!text) return null;
        const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
        const tableLines = lines.filter((line) => line.includes('|'));
        if (tableLines.length < 2) return null;
        const header = tableLines[0];
        const separator = tableLines[1];
        if (!separator.match(/^\|?\s*-+/)) return null;
        const parseRow = (row) =>
            row
                .split('|')
                .map((cell) => cell.trim())
                .filter((cell) => cell.length);
        const headers = parseRow(header);
        const rows = tableLines.slice(2).map(parseRow).filter((row) => row.length);
        if (!headers.length) return null;
        return { headers, rows };
    };

    const renderTable = (table) => {
        const headers = table.headers;
        const rows = table.rows.map((row) => {
            const obj = {};
            headers.forEach((header, idx) => {
                obj[header] = row[idx] || '';
            });
            return obj;
        });

        return (
            <div className="mt-3 space-y-2">
                {rows.map((row, idx) => (
                    <div key={`${row[headers[0]] || 'row'}-${idx}`} className="rounded-lg surface p-2 text-xs text-muted">
                        {headers.map((header) => (
                            <div key={`${header}-${idx}`} className="grid grid-cols-[96px_1fr] gap-2 py-0.5">
                                <div className="font-semibold text-ink">{header}</div>
                                <div className="break-words">{row[header]}</div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    };

    const renderList = (items, { tokenize } = { tokenize: false }) => (
        <ul className="mt-2 space-y-1 text-xs text-muted">
            {items.map((item, idx) => (
                <li key={`${item}-${idx}`} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent"></span>
                    <span className="space-x-2">{tokenize ? renderTokenized(item) : item}</span>
                </li>
            ))}
        </ul>
    );

    const renderNodeModal = () => {
        if (!activeNode) return null;
        const doc = getNodeDoc(activeNode.docKey);
        const parameters = toListItems(doc.parameters);
        const returns = toListItems(doc.returns);
        const parameterTable = parseMarkdownTable(doc.parameters);
        const returnsTable = parseMarkdownTable(doc.returns);
        const description = doc.description || activeNode.summary;
        const notes = toListItems(doc.notes);
        const requirements = toListItems(doc.requirements);

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6">
                <div className="max-w-3xl w-full glass rounded-3xl p-6 shadow-soft overflow-y-auto max-h-[85vh]">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-muted">{activeNode.category}</p>
                            <h2 className="text-2xl font-display text-ink">{activeNode.name}</h2>
                            <p className="mt-2 text-sm text-muted">{description}</p>
                        </div>
                        <button
                            onClick={() => setActiveNode(null)}
                            className="px-3 py-1 rounded-full surface text-xs font-semibold text-ink hover:border-accent hover:shadow-soft transition"
                        >
                            Close
                        </button>
                    </div>

                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="surface rounded-2xl p-4">
                            <p className="text-xs uppercase tracking-wide text-muted">Use cases</p>
                            <p className="mt-2 text-sm text-muted">{activeNode.uses}</p>
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <p className="text-xs uppercase tracking-wide text-muted">Specification</p>
                            <p className="mt-2 text-sm text-muted">Key parameters and outputs below.</p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="surface rounded-2xl p-4">
                            <h3 className="text-sm font-semibold text-ink">Parameters</h3>
                            {parameterTable
                                ? renderTable(parameterTable)
                                : parameters.length > 0
                                    ? renderList(parameters, { tokenize: true })
                                    : <p className="mt-2 text-xs text-muted">Parameters not specified in docs.</p>}
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <h3 className="text-sm font-semibold text-ink">Returns / Output</h3>
                            {returnsTable
                                ? renderTable(returnsTable)
                                : returns.length > 0
                                    ? renderList(returns, { tokenize: true })
                                    : <p className="mt-2 text-xs text-muted">Returns not specified in docs.</p>}
                        </div>
                    </div>

                    {(notes.length > 0 || requirements.length > 0) && (
                        <div className="mt-6 grid gap-6 md:grid-cols-2">
                            {notes.length > 0 && (
                                <div className="surface rounded-2xl p-4">
                                    <h3 className="text-sm font-semibold text-ink">Notes</h3>
                                    {renderList(notes, { tokenize: false })}
                                </div>
                            )}
                            {requirements.length > 0 && (
                                <div className="surface rounded-2xl p-4">
                                    <h3 className="text-sm font-semibold text-ink">Requirements</h3>
                                    {renderList(requirements, { tokenize: false })}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-6">
                        <h3 className="text-sm font-semibold text-ink">Usage</h3>
                        {(doc.example || doc.examplesText) ? (
                            <div className="mt-2">
                                <CodeBlock code={doc.example || doc.examplesText.replace(/^```(?:javascript|js)?\n|\n```$/g, '')} title="Example" language="js" />
                            </div>
                        ) : (
                            <p className="mt-2 text-xs text-muted">Example not available for this node.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        const topic = topics[activeTopic];
        if (!topic) return null;

        return (
            <div className="glass rounded-3xl p-8 shadow-soft">
                <h1 className="text-3xl font-display text-ink mb-6">{topic.title}</h1>
                <div className="prose max-w-none text-muted" dangerouslySetInnerHTML={{ __html: topic.content }} />

                {topicSnippets[activeTopic] && (
                    <div className="mt-6">
                        <div className="surface rounded-2xl p-4">
                            <CodeBlock code={topicSnippets[activeTopic]} title="2.0 Example" language="js" />
                        </div>
                    </div>
                )}

                {activeTopic === 'overview' && (
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Hello World Flow</p>
                            <p className="mt-2 text-sm text-muted">A minimal flow that increments shared state.</p>
                            <div className="mt-4">
                                <CodeBlock code={coreSnippet} title="Core Flow" language="js" />
                            </div>
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Runtime diagram</p>
                            <p className="mt-2 text-sm text-muted">How data and events move through a flow.</p>
                            <div className="mt-4">
                                <CodeBlock code={coreDiagram} title="Flow Diagram" language="text" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTopic === 'core-primitives' && (
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Node lifecycle in practice</p>
                            <p className="mt-2 text-sm text-muted">prep/exec/post with shared state updates.</p>
                            <div className="mt-4">
                                <CodeBlock code={coreSnippet} title="Node Lifecycle" language="js" />
                            </div>
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Flow graph</p>
                            <p className="mt-2 text-sm text-muted">Branching and action-based transitions.</p>
                            <div className="mt-4">
                                <CodeBlock code={coreDiagram} title="Flow Graph" language="text" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTopic === 'async-and-batch' && (
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Async flow</p>
                            <div className="mt-4">
                                <CodeBlock code={asyncSnippet} title="AsyncFlow" language="js" />
                            </div>
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Batch iteration</p>
                            <div className="mt-4">
                                <CodeBlock code={batchSnippet} title="Iterator" language="js" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTopic === 'agents-and-tools' && (
                    <div className="mt-6">
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Tool schema example</p>
                            <div className="mt-4">
                                <CodeBlock code={agentToolSnippet} title="Tool Definition" language="js" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTopic === 'observability' && (
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Flow event hooks</p>
                            <p className="mt-2 text-sm text-muted">Capture lifecycle events for tracing and metrics.</p>
                            <div className="mt-4">
                                <CodeBlock code={observabilitySnippet} title="Event Listeners" language="js" />
                            </div>
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Structured node telemetry</p>
                            <p className="mt-2 text-sm text-muted">Record node timings and errors into shared state.</p>
                            <div className="mt-4">
                                <CodeBlock code={`const shared = {};\nconst flow = new AsyncFlow(startNode);\nflow.on('node:end', ({ nodeClass, duration, status }) => {\n  shared.metrics = shared.metrics || [];\n  shared.metrics.push({ nodeClass, duration, status });\n});\nawait flow.runAsync(shared);`} title="Telemetry Capture" language="js" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTopic === 'logging' && (
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Logging configuration</p>
                            <p className="mt-2 text-sm text-muted">Route logs to files, emitters, or remote sinks.</p>
                            <div className="mt-4">
                                <CodeBlock code={loggingSnippet} title="Logging" language="js" />
                            </div>
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Per-node log settings</p>
                            <p className="mt-2 text-sm text-muted">Disable or redirect logging at node level.</p>
                            <div className="mt-4">
                                <CodeBlock code={`const silentNode = new HttpRequestNode();\nsilentNode.setParams({\n  url: 'https://api.example.com',\n  logging: { type: 'none' }\n});`} title="Per-node Logging" language="js" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTopic === 'custom-tools' && (
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Define a ToolSpec from a node</p>
                            <p className="mt-2 text-sm text-muted">toolSpecFromNode() adapts an existing node with a schema.</p>
                            <div className="mt-4">
                                <CodeBlock code={customToolSnippet} title="Custom Tool Node" language="js" />
                            </div>
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Register in a ToolRegistry</p>
                            <p className="mt-2 text-sm text-muted">Share the registry with agents and MCP servers.</p>
                            <div className="mt-4">
                                <CodeBlock code={toolRegistrySnippet} title="Tool Registry" language="js" />
                            </div>
                        </div>
                    </div>
                )}
                {activeTopic === 'create-qflow' && (
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <CodeBlock code={createQflowInstall} title="Install" language="bash" />
                        <CodeBlock code={createQflowUsage} title="Usage" language="bash" />
                    </div>
                )}

                {activeTopic === 'workflow-styles' && (
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Concise (Functional)</p>
                            <p className="mt-2 text-sm text-muted">Best for quick scripts and simple flows.</p>
                            <div className="mt-4 text-xs text-muted">
                                <p className="font-semibold text-ink">When to choose</p>
                                <ul className="mt-2 list-disc list-inside space-y-1">
                                    <li>Prototyping or validating a new workflow.</li>
                                    <li>Small nodes with 1-2 behaviors.</li>
                                    <li>Rapid iteration without extra files.</li>
                                </ul>
                            </div>
                            <div className="mt-4">
                                <CodeBlock code={functionalExample} title="Functional Style" language="js" />
                            </div>
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Flexible (Object Spread)</p>
                            <p className="mt-2 text-sm text-muted">Inline customization with minimal boilerplate.</p>
                            <div className="mt-4 text-xs text-muted">
                                <p className="font-semibold text-ink">When to choose</p>
                                <ul className="mt-2 list-disc list-inside space-y-1">
                                    <li>Inline nodes inside a single module.</li>
                                    <li>Quickly overriding one or two methods.</li>
                                    <li>Keeping node definition close to flow setup.</li>
                                </ul>
                            </div>
                            <div className="mt-4">
                                <CodeBlock code={spreadExample} title="Object Spread Style" language="js" />
                            </div>
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Structured (Class-based)</p>
                            <p className="mt-2 text-sm text-muted">Reusable nodes and clear architecture.</p>
                            <div className="mt-4 text-xs text-muted">
                                <p className="font-semibold text-ink">When to choose</p>
                                <ul className="mt-2 list-disc list-inside space-y-1">
                                    <li>Nodes reused across multiple workflows.</li>
                                    <li>Complex behavior or internal state.</li>
                                    <li>Team projects needing clear structure.</li>
                                </ul>
                            </div>
                            <div className="mt-4">
                                <CodeBlock code={classExample} title="Class-based Style" language="js" />
                            </div>
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Agent (Generic LLM)</p>
                            <p className="mt-2 text-sm text-muted">Multi-tool automation with configurable models.</p>
                            <div className="mt-4 text-xs text-muted">
                                <p className="font-semibold text-ink">When to choose</p>
                                <ul className="mt-2 list-disc list-inside space-y-1">
                                    <li>Goal-driven workflows with tool use.</li>
                                    <li>Multi-step tasks needing reasoning.</li>
                                    <li>LLM routing across a tool registry.</li>
                                </ul>
                            </div>
                            <div className="mt-4">
                                <CodeBlock code={agentExample} title="Agent Style" language="js" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTopic === 'common-patterns' && (
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        {commonPatterns.map((pattern) => (
                            <div key={pattern.title} className="surface rounded-2xl p-4">
                                <p className="text-sm font-semibold text-ink">{pattern.title}</p>
                                <p className="mt-2 text-sm text-muted">{pattern.description}</p>
                                <div className="mt-4">
                                    <CodeBlock code={pattern.code} title="Recipe" language="js" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTopic === 'node-catalog' && (
                    <div className="mt-8 space-y-8">
                        <div className="surface rounded-2xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-ink">Search nodes</p>
                                <p className="text-xs text-muted">Filter by name, description, or use case.</p>
                            </div>
                            <input
                                value={nodeQuery}
                                onChange={(e) => setNodeQuery(e.target.value)}
                                placeholder="Search nodes"
                                className="input-field w-full md:w-64 rounded-xl px-3 py-2 text-sm"
                            />
                        </div>
                        {nodeCatalog.map((section) => {
                            const filteredNodes = section.nodes.filter((node) => {
                                const query = nodeQuery.trim().toLowerCase();
                                if (!query) return true;
                                return (
                                    node.name.toLowerCase().includes(query) ||
                                    node.summary.toLowerCase().includes(query) ||
                                    node.uses.toLowerCase().includes(query)
                                );
                            });

                            if (filteredNodes.length === 0) return null;

                            return (
                                <div key={section.category} className="surface rounded-2xl p-6">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <h3 className="text-xl font-display text-ink">{section.category}</h3>
                                            <p className="text-sm text-muted mt-2">{section.description}</p>
                                        </div>
                                    <div className="rounded-2xl surface px-4 py-3 text-xs text-muted min-w-0">
                                            <p className="break-words"><strong>Parameters:</strong> {section.params}</p>
                                            <p className="mt-2 break-words"><strong>Returns:</strong> {section.returns}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                        {filteredNodes.map((node) => (
                                            <button
                                                key={node.name}
                                                onClick={() => setActiveNode({ ...node, category: section.category })}
                                                className="text-left rounded-xl surface px-4 py-3 hover:border-accent hover:shadow-soft transition min-w-0"
                                            >
                                                <p className="text-sm font-semibold text-ink break-words">{node.name}</p>
                                                <p className="text-xs text-muted mt-1 break-words">{node.summary}</p>
                                                <p className="text-xs text-muted mt-2 break-words">Use cases: {node.uses}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const SidebarLink = ({ topicId, children, onClick }) => (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); setActiveTopic(topicId); if (onClick) onClick(); }}
            className={`block px-4 py-2 rounded-xl transition-colors ${activeTopic === topicId ? 'bg-accent text-white' : 'text-muted hover:bg-white/70 hover:text-ink'}`}
        >
            {children}
        </a>
    );

    const topicSnippets = {
        'stable-2': "import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';\nimport { DurableFlow } from '@fractal-solutions/qflow/durable';\nimport { LLMNode } from '@fractal-solutions/qflow/llm';\n\n// One package, focused subpaths, Bun-only runtime.\nawait new AsyncFlow(new AsyncNode()).runAsync({});",
        'mcp': "import { QFlowMCPServer } from '@fractal-solutions/qflow/mcp';\n\nconst server = new QFlowMCPServer({ name: 'qflow', version: '2.0.0' });\nawait server.start();",
        'durable': "import { DurableFlow, SQLiteCheckpointer } from '@fractal-solutions/qflow/durable';\n\nconst checkpointer = new SQLiteCheckpointer('./runs.db');\nconst flow = new DurableFlow(startNode, { checkpointer, version: '1.0.0' });\nconst { runId, status } = await flow.runDurable({ runId: 'run-1', shared: {} });",
        'llm': "import { LLMNode } from '@fractal-solutions/qflow/llm';\n\nconst llm = new LLMNode({ provider: 'openai', model: 'gpt-4o-mini', apiKey: Bun.env.OPENAI_API_KEY });\nconst answer = await llm.execAsync({ prompt: 'Hello' });",
        'tool-spec': "import { ToolRegistry, ToolSpec } from '@fractal-solutions/qflow/tool-spec';\n\nconst tool = new ToolSpec({\n  name: 'echo',\n  description: 'Echo input',\n  parameters: { type: 'object' },\n  execute: async input => input,\n});\nconst registry = new ToolRegistry({ tools: [tool] });",
        'graph-eval': "import { BranchNode, MapNode, ReduceNode } from '@fractal-solutions/qflow/graph';\nimport { defineState } from '@fractal-solutions/qflow/contracts';\nimport { AssertNode, ReplayNode } from '@fractal-solutions/qflow/eval';\n\nconst State = defineState({ name: 'State', fields: { items: { type: 'array', required: true } } });",
        'bun-native': "import { BunSpawnNode, SQLiteQueryNode, StreamMapNode } from '@fractal-solutions/qflow/bun';\n\nconst spawn = new BunSpawnNode();\nspawn.setParams({ command: 'echo', args: ['hello'] });\nconst map = new StreamMapNode();\nspawn.next(map).next(new SQLiteQueryNode());",
        'production-gaps': "import { WaitForApprovalNode } from '@fractal-solutions/qflow/approval';\nimport { ScheduleNode } from '@fractal-solutions/qflow/schedule';\nimport { BudgetTracker, BudgetNode } from '@fractal-solutions/qflow/budget';\nimport { SQLiteMemoryStore } from '@fractal-solutions/qflow/memory';"
    };

    const sections = [
        {
            title: 'Getting Oriented',
            items: [
                { id: 'stable-2', label: 'What is new in 2.0.0' },
                { id: 'overview', label: 'Overview' },
                { id: 'core-primitives', label: 'Core Primitives' },
                { id: 'async-and-batch', label: 'Async and Batch' },
                { id: 'create-qflow', label: 'create-qflow' },
            ]
        },
        {
            title: 'Node Reference',
            items: [
                { id: 'node-catalog', label: 'Node Catalog' },
                { id: 'bun-native', label: 'Bun-native Nodes' },
            ]
        },
        {
            title: 'Agents, Tools and Models',
            items: [
                { id: 'agents-and-tools', label: 'Agents and Tools' },
                { id: 'tool-spec', label: 'ToolSpec and ToolRegistry' },
                { id: 'llm', label: 'Provider-neutral LLM' },
                { id: 'mcp', label: 'MCP' },
                { id: 'custom-tools', label: 'Custom Tools' },
            ]
        },
        {
            title: 'Durability and Operations',
            items: [
                { id: 'durable', label: 'Durable Flows' },
                { id: 'production-gaps', label: 'Approval, Schedule, Budget and Memory' },
                { id: 'graph-eval', label: 'Graph, Contracts and Eval' },
                { id: 'observability', label: 'Observability' },
                { id: 'logging', label: 'Logging' },
            ]
        },
        {
            title: 'Patterns',
            items: [
                { id: 'common-patterns', label: 'Common Patterns' },
            ]
        },
        {
            title: 'Workflow Styles',
            items: [
                { id: 'workflow-styles', label: 'Workflow Styles' },
            ]
        }
    ];

    return (
        <div className="container mx-auto px-6 py-14">
            <div className="mb-6 md:hidden">
                <button
                    onClick={() => setNavOpen(true)}
                    className="w-full rounded-2xl surface px-4 py-3 text-left text-sm font-semibold text-ink"
                >
                    Open Contents
                </button>
            </div>
            <div className="grid gap-8 md:grid-cols-[260px_1fr] min-w-0">
                <aside className="space-y-6 min-w-0 hidden md:block">
                    <div className="glass rounded-2xl p-5 shadow-soft">
                        <p className="text-xs uppercase tracking-wide text-muted">Contents</p>
                        <nav className="mt-4 space-y-4">
                            {sections.map((section) => (
                                <div key={section.title} className="space-y-2">
                                    <p className="text-xs font-semibold text-muted uppercase tracking-wide">{section.title}</p>
                                    <div className="space-y-1">
                                        {section.items.map((item) => (
                                            <SidebarLink key={item.id} topicId={item.id}>
                                                {item.label}
                                            </SidebarLink>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </div>
                    <div className="glass rounded-2xl p-5 shadow-soft">
                        <p className="text-xs uppercase tracking-wide text-accent">Need a starter?</p>
                        <p className="mt-2 text-sm text-muted">Use create-qflow to scaffold a new project with your preferred workflow style.</p>
                        <a href="#getting-started" className="mt-4 inline-flex text-sm font-semibold text-accent hover:opacity-80">Open Getting Started</a>
                    </div>
                </aside>
                <main className="min-w-0">{renderContent()}</main>
            </div>
            {navOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setNavOpen(false)}
                    ></div>
                    <div className="absolute inset-x-4 top-6 bottom-6 glass rounded-3xl p-5 shadow-soft overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-wide text-muted">Contents</p>
                            <button
                                onClick={() => setNavOpen(false)}
                                className="px-3 py-1 rounded-full surface text-xs font-semibold text-ink hover:border-accent hover:shadow-soft transition"
                            >
                                Close
                            </button>
                        </div>
                        <nav className="mt-4 space-y-4">
                            {sections.map((section) => (
                                <div key={section.title} className="space-y-2">
                                    <p className="text-xs font-semibold text-muted uppercase tracking-wide">{section.title}</p>
                                    <div className="space-y-1">
                                        {section.items.map((item) => (
                                            <SidebarLink
                                                key={item.id}
                                                topicId={item.id}
                                                onClick={() => setNavOpen(false)}
                                            >
                                                {item.label}
                                            </SidebarLink>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </div>
                </div>
            )}
            {renderNodeModal()}
        </div>
    );
};
