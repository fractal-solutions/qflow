window.DocsPage = () => {
    const CodeBlock = window.CodeBlock;
    const NODE_DOCS = window.NODE_DOCS || {};
    const [activeTopic, setActiveTopic] = React.useState('overview');
    const [nodeQuery, setNodeQuery] = React.useState('');
    const [activeNode, setActiveNode] = React.useState(null);

    const topics = {
        'overview': {
            title: 'Overview',
            content: `
                <p>qflow is a lightweight JavaScript library for building workflows and autonomous, tool-using agents. It gives you a compact set of primitives to orchestrate synchronous and asynchronous tasks with shared state, observability, and a growing catalog of integrations.</p>
                <p>Use qflow to chain operations, automate systems, process data, and build agentic workflows that can reason, call tools, and react to real-time inputs.</p>
                <ul>
                    <li><strong>Minimal surface area:</strong> Nodes and flows are the core primitives.</li>
                    <li><strong>Async-first:</strong> AsyncNode and AsyncFlow are built in.</li>
                    <li><strong>Agent-ready:</strong> Tools are nodes with JSON schema definitions.</li>
                    <li><strong>Composable:</strong> Subflows and batch flows let you reuse logic across tasks.</li>
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
                <p>Agents wrap the qflow runtime with a tool-using reasoning loop. Tools are nodes with JSON schema definitions that make them callable by the LLM.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">AgentNode</h4>
                <p>Provide an LLM node plus a map of tool nodes. The agent chooses tools based on the goal, then observes tool output.</p>
                <ul>
                    <li><strong>Goal-driven:</strong> set a single goal and let the agent plan actions.</li>
                    <li><strong>Tool registry:</strong> tools are simply node instances in a map.</li>
                    <li><strong>Memory-aware:</strong> pair with MemoryNode/SemanticMemoryNode for context.</li>
                </ul>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Tool definitions</h4>
                <p>Tool nodes expose a static <code>getToolDefinition()</code> JSON schema. This schema informs and validates tool calls.</p>
                <ul>
                    <li><strong>Safe by design:</strong> parameters must match schema.</li>
                    <li><strong>Readable:</strong> descriptions become the agent’s tool guide.</li>
                    <li><strong>Composable:</strong> tools are reusable in any flow.</li>
                </ul>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Agent cycles</h4>
                <p>qflow ships with multiple reasoning cycles (RAOR, OODA, PEMA) to structure the loop.</p>
                <ul>
                    <li><strong>RAOR:</strong> Reflect, Act, Observe, Refine.</li>
                    <li><strong>OODA:</strong> Observe, Orient, Decide, Act.</li>
                    <li><strong>PEMA:</strong> Plan, Execute, Monitor, Adapt.</li>
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
                <p>Bun is required. Use bunx to run the scaffolder:</p>
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
                <p>Extend qflow agents by adding your own tool nodes.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Define a tool node</h4>
                <p>Extend <code>AsyncNode</code> and provide a <code>getToolDefinition()</code> JSON schema.</p>
                <h4 class="text-xl font-semibold text-accent mt-6 mb-2">Register the node</h4>
                <p>Add your node path to <code>qflow.config.js</code> so agents can discover it automatically.</p>
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
                <p>Practical recipes for everyday workflows.</p>
            `
        },
        'node-catalog': {
            title: 'Node Catalog',
            content: `
                <p>qflow ships with built-in nodes covering data, system, web, flow control, LLMs, and integrations. Use the search to filter and click a node for full documentation.</p>
            `
        }
    };

    const createQflowInstall = `bunx create-qflow@latest my-new-project`;
    const createQflowUsage = `bunx create-qflow@latest <project-name>`;

    const functionalExample = `const myNode = new AsyncNode();\nmyNode.execAsync = async (prepRes, shared) => {\n  console.log('Executing myNode');\n  shared.data = 'Hello from functional node!';\n};\nmyNode.postAsync = async (shared, prepRes, execRes) => {\n  return 'next';\n};`;

    const spreadExample = `const myNode = {\n  ...new AsyncNode(),\n  async execAsync(prepRes, shared) {\n    console.log('Executing myNode');\n    shared.data = 'Hello from object spread node!';\n  },\n  async postAsync(shared, prepRes, execRes) {\n    return 'next';\n  }\n};`;

    const classExample = `class MyCustomNode extends AsyncNode {\n  async execAsync(prepRes, shared) {\n    console.log('Executing MyCustomNode');\n    shared.data = 'Hello from class-based node!';\n  }\n  async postAsync(shared, prepRes, execRes) {\n    return 'next';\n  }\n}\nconst myNode = new MyCustomNode();`;

    const agentExample = `const agent = new AgentNode(llm, tools);\nagent.setParams({ goal: 'Summarize recent metrics.' });\nconst flow = new AsyncFlow(agent);\nawait flow.runAsync({});`;

    const coreDiagram = `Shared State\n    │\n    ▼\n[Node A] -> [Node B] -> [Node C]\n    │             │\n    └── event: node:start / node:end\n          flow:start / flow:end`;

    const coreSnippet = `class MyNode extends AsyncNode {\n  async execAsync(prepRes, shared) {\n    shared.value = (shared.value || 0) + 1;\n    return 'default';\n  }\n}\nconst a = new MyNode();\nconst b = new MyNode();\na.next(b);\nawait new AsyncFlow(a).runAsync({ value: 0 });`;

    const asyncSnippet = `const fetch = new HttpRequestNode();\nfetch.setParams({ url: 'https://api.example.com' });\nconst flow = new AsyncFlow(fetch);\nawait flow.runAsync({});`;

    const batchSnippet = `const iterator = new IteratorNode();\niterator.setParams({\n  items: ['a', 'b', 'c'],\n  flow: new AsyncFlow(processNode)\n});\nawait new AsyncFlow(iterator).runAsync({});`;

    const agentToolSnippet = `class MyTool extends AsyncNode {\n  static getToolDefinition() {\n    return {\n      name: 'my_tool',\n      description: 'Does a thing',\n      parameters: { type: 'object', properties: { input: { type: 'string' } }, required: ['input'] }\n    };\n  }\n}\nconst tools = { my_tool: new MyTool() };\nconst agent = new AgentNode(llm, tools);`;

    const observabilitySnippet = `const flow = new AsyncFlow(startNode);\nflow.on('flow:start', ({ flowId }) => console.log('Flow', flowId));\nflow.on('node:end', ({ nodeClass, duration }) => console.log(nodeClass, duration));\nawait flow.runAsync({});`;

    const loggingSnippet = `import { setLogLevel, LogLevel } from '@fractal-solutions/qflow/logger';\nsetLogLevel(LogLevel.INFO);\n\nconst node = new HttpRequestNode();\nnode.setParams({\n  url: 'https://api.example.com',\n  logging: { method: 'file', params: { filePath: './logs/http.log' } }\n});`;

    const customToolSnippet = `// my_nodes/MyCustomToolNode.js\nimport { AsyncNode } from '@fractal-solutions/qflow';\n\nexport class MyCustomToolNode extends AsyncNode {\n  static getToolDefinition() {\n    return {\n      name: 'my_custom_tool',\n      description: 'Greets a user with a custom message.',\n      parameters: {\n        type: 'object',\n        properties: {\n          name: { type: 'string', description: 'Name to greet.' },\n          greeting: { type: 'string', description: 'Optional greeting.' }\n        },\n        required: ['name']\n      }\n    };\n  }\n\n  async execAsync() {\n    const { name, greeting = 'Hello' } = this.params;\n    return { message: \`\${greeting}, \${name}!\` };\n  }\n\n  async postAsync(shared, _, execRes) {\n    shared.customToolOutput = execRes.message;\n    return 'default';\n  }\n}`;

    const customToolConfigSnippet = `// qflow.config.js\n/** @type {import('./src/types').QFlowConfig} */\nconst qflowConfig = {\n  customNodePaths: [\n    './my_nodes/MyCustomToolNode.js'\n  ]\n};\n\nexport default qflowConfig;`;

    const commonPatterns = [
        {
            title: 'ETL + validation pipeline',
            description: 'Fetch data, validate with JSON schema, transform, and store in a database.',
            code: `const fetch = new HttpRequestNode();\nconst validate = new DataValidationNode();\nconst transform = new TransformNode();\nconst db = new DatabaseNode();\n\nfetch.next(validate).next(transform).next(db);\nconst flow = new AsyncFlow(fetch);\nawait flow.runAsync({});`
        },
        {
            title: 'Agent + tool registry',
            description: 'Expose tools as nodes and let an agent plan the workflow.',
            code: `const tools = {\n  http_request: new HttpRequestNode(),\n  shell_command: new ShellCommandNode(),\n  web_scraper: new WebScraperNode(),\n};\nconst agent = new AgentNode(llm, tools);\nconst flow = new AsyncFlow(agent);\nawait flow.runAsync({});`
        },
        {
            title: 'File processing batch',
            description: 'Iterate over files, parse content, and store summaries.',
            code: `const iterator = new IteratorNode();\niterator.setParams({\n  items: ['file1.txt', 'file2.txt'],\n  flow: new AsyncFlow(readNode)\n});\nawait new AsyncFlow(iterator).runAsync({});`
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
                { name: 'WebScraperNode', docKey: 'web_scraper', summary: 'Fetch and parse HTML content.', uses: 'Scraping, content extraction.' },
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
                            {parameters.length > 0 ? renderList(parameters, { tokenize: true }) : (
                                <p className="mt-2 text-xs text-muted">Parameters not specified in docs.</p>
                            )}
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <h3 className="text-sm font-semibold text-ink">Returns / Output</h3>
                            {returns.length > 0 ? renderList(returns, { tokenize: true }) : (
                                <p className="mt-2 text-xs text-muted">Returns not specified in docs.</p>
                            )}
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
                        {doc.example ? (
                            <div className="mt-2">
                                <CodeBlock code={doc.example} title="Example" language="js" />
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
                                <CodeBlock code={`const flow = new AsyncFlow(startNode);\nflow.on('node:end', ({ nodeClass, duration, status }) => {\n  shared.metrics = shared.metrics || [];\n  shared.metrics.push({ nodeClass, duration, status });\n});\nawait flow.runAsync({});`} title="Telemetry Capture" language="js" />
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
                            <p className="text-sm font-semibold text-ink">Define a custom tool node</p>
                            <p className="mt-2 text-sm text-muted">Expose a JSON schema so agents can call it safely.</p>
                            <div className="mt-4">
                                <CodeBlock code={customToolSnippet} title="Custom Tool Node" language="js" />
                            </div>
                        </div>
                        <div className="surface rounded-2xl p-4">
                            <p className="text-sm font-semibold text-ink">Register in qflow.config.js</p>
                            <p className="mt-2 text-sm text-muted">Add your tool path so agents discover it automatically.</p>
                            <div className="mt-4">
                                <CodeBlock code={customToolConfigSnippet} title="Tool Registry" language="js" />
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

    const SidebarLink = ({ topicId, children }) => (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); setActiveTopic(topicId); }}
            className={`block px-4 py-2 rounded-xl transition-colors ${activeTopic === topicId ? 'bg-accent text-white' : 'text-muted hover:bg-white/70 hover:text-ink'}`}
        >
            {children}
        </a>
    );

    const sections = [
        {
            title: 'Essentials',
            items: [
                { id: 'overview', label: 'Overview' },
                { id: 'core-primitives', label: 'Core Primitives' },
                { id: 'async-and-batch', label: 'Async and Batch' },
            ]
        },
        {
            title: 'Agents',
            items: [
                { id: 'agents-and-tools', label: 'Agents and Tools' },
                { id: 'custom-tools', label: 'Custom Tools' },
            ]
        },
        {
            title: 'Operations',
            items: [
                { id: 'observability', label: 'Observability' },
                { id: 'logging', label: 'Logging' },
            ]
        },
        {
            title: 'Scaffolding',
            items: [
                { id: 'create-qflow', label: 'create-qflow' },
                { id: 'workflow-styles', label: 'Workflow Styles' },
            ]
        },
        {
            title: 'Patterns',
            items: [
                { id: 'common-patterns', label: 'Common Patterns' },
            ]
        },
        {
            title: 'Reference',
            items: [
                { id: 'node-catalog', label: 'Node Catalog' },
            ]
        }
    ];

    return (
        <div className="container mx-auto px-6 py-14">
            <div className="grid gap-8 md:grid-cols-[260px_1fr] min-w-0">
                <aside className="space-y-6 min-w-0">
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
            {renderNodeModal()}
        </div>
    );
};
