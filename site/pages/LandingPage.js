window.LandingPage = () => {
    const CodeBlock = window.CodeBlock;

    const installCode = `bunx create-qflow@latest my-qflow-project`;

    const featureCode = `import { AgentNode, AgentDeepSeekLLMNode } from '@fractal-solutions/qflow/nodes';
import { AsyncFlow } from '@fractal-solutions/qflow';

const llm = new AgentDeepSeekLLMNode({ apiKey: process.env.DEEPSEEK_API_KEY });
const availableTools = { /* ... */ };

const agent = new AgentNode(llm, availableTools);
agent.setParams({ goal: 'Summarize the top 5 stories on Hacker News.' });

const flow = new AsyncFlow(agent);
await flow.runAsync();`;

    const showcaseItems = [
        {
            title: 'Interactive webview workflows',
            file: 'examples/interactive_webview_test.js',
            description: 'Build dialogs, prompts, and custom UI flows for collecting user input with themed webviews.',
            tags: ['UI', 'Interactive', 'Webview']
        },
        {
            title: 'Browser automation',
            file: 'examples/browser_control_test.js',
            description: 'Drive Playwright to navigate pages, fill forms, validate DOM state, and capture screenshots.',
            tags: ['Browser', 'Automation', 'Playwright']
        },
        {
            title: 'Data visualization',
            file: 'examples/webview_data_visualization.js',
            description: 'Generate data and render interactive charts inside a WebviewNode using Chart.js.',
            tags: ['Charts', 'Webview', 'Reporting']
        },
        {
            title: 'Agent reasoning loop',
            file: 'examples/agent_ooda_test.js',
            description: 'Run an OODA agent with a tool registry for search, shell, and data processing.',
            tags: ['Agents', 'OODA', 'Tools']
        },
        {
            title: 'Observability tracing',
            file: 'examples/observability_test.js',
            description: 'Inspect flow and node lifecycle events to monitor and debug asynchronous runs.',
            tags: ['Observability', 'Events', 'Async']
        },
        {
            title: 'RAG from files',
            file: 'examples/rag_agent_from_files.js',
            description: 'Turn local documents into a retrievable knowledge base for agent workflows.',
            tags: ['RAG', 'Files', 'Embeddings']
        },
    ];

    return (
        <div className="container mx-auto px-4 sm:px-6 py-16">
            <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
                <div className="space-y-6 min-w-0">
                    <div className="inline-flex items-center space-x-2 rounded-full chip-accent px-4 py-1 text-xs uppercase tracking-wide">
                        <span className="h-2 w-2 rounded-full bg-accent"></span>
                        <span>Agentic workflows without the weight</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display text-ink leading-tight reveal reveal-1">
                        Orchestrate complex work with
                        <span className="text-accent"> simple primitives</span>
                    </h1>
                    <p className="text-lg text-muted max-w-xl reveal reveal-2">
                        qflow gives you a lightweight core for chaining operations, managing shared state, and building autonomous agents that can reason, plan, and use tools.
                    </p>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 reveal reveal-3">
                        <a href="#getting-started" className="w-full sm:w-auto text-center px-6 py-3 rounded-full bg-accent text-white text-sm font-semibold shadow-soft hover:opacity-90 transition-colors">
                            Get Started
                        </a>
                        <a href="#docs" className="w-full sm:w-auto text-center px-6 py-3 rounded-full border border-slate-300 text-sm font-semibold text-ink hover:bg-white/80 transition-colors">
                            Explore Docs
                        </a>
                        <a href="#examples" className="w-full sm:w-auto text-center px-6 py-3 rounded-full border border-slate-300 text-sm font-semibold text-ink hover:bg-white/80 transition-colors">
                            Browse Examples
                        </a>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-4">
                        <div>
                            <p className="text-2xl font-display text-ink">40+</p>
                            <p className="text-xs uppercase tracking-wide text-muted">Built-in nodes</p>
                        </div>
                        <div>
                            <p className="text-2xl font-display text-ink">3</p>
                            <p className="text-xs uppercase tracking-wide text-muted">Agent cycles</p>
                        </div>
                        <div>
                            <p className="text-2xl font-display text-ink">Async-first</p>
                            <p className="text-xs uppercase tracking-wide text-muted">Observability</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-6 min-w-0">
                    <div className="glass rounded-3xl p-6 shadow-soft min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted">Flow Console</p>
                                <p className="text-lg font-display text-ink">Agent Overview</p>
                            </div>
                            <span className="text-xs text-accent bg-teal-100 px-3 py-1 rounded-full">Live</span>
                        </div>
                        <CodeBlock code={featureCode} title="Agent Definition" language="js" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { title: 'Composable', body: 'Build reusable nodes and plug them into any flow.' },
                            { title: 'Observable', body: 'Trace execution with detailed lifecycle events.' },
                            { title: 'Extensible', body: 'Register custom tools with JSON schema.' },
                            { title: 'Pragmatic', body: 'Small API surface, big leverage.' },
                        ].map((item) => (
                            <div key={item.title} className="glass rounded-2xl p-4 min-w-0">
                                <p className="text-sm font-semibold text-ink">{item.title}</p>
                                <p className="text-xs text-muted mt-2">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-20">
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-muted">
                    <span>Designed for builders</span>
                    <span className="h-px w-16 bg-slate-300"></span>
                    <div className="flex flex-wrap gap-2">
                        {['Automation', 'Data Pipelines', 'Agents', 'Observability', 'Integrations'].map((label) => (
                            <span key={label} className="px-3 py-1 rounded-full chip text-xs">{label}</span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-20 grid gap-8 md:grid-cols-2">
                <div className="glass rounded-3xl p-8 shadow-soft">
                    <h2 className="text-3xl font-display text-ink">Workflow primitives that stay out of your way</h2>
                    <p className="mt-4 text-muted">
                        Define nodes, connect flows, and let the shared state carry context. qflow keeps you close to the metal while handling orchestration and reliability.
                    </p>
                    <div className="mt-6 space-y-4">
                        {[
                            { title: 'Node lifecycle', body: 'Predictable prep, exec, post phases for sync or async tasks.' },
                            { title: 'Shared state', body: 'Mutable, centralized context that flows through every node.' },
                            { title: 'Batch modes', body: 'Run iterative, async, or parallel flows without glue code.' },
                            { title: 'Flow registry', body: 'Promote subflows into reusable building blocks.' },
                        ].map((item) => (
                            <div key={item.title} className="flex items-start space-x-3">
                                <span className="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                                <div>
                                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                                    <p className="text-sm text-muted">{item.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="glass rounded-3xl p-8 shadow-soft">
                    <h3 className="text-2xl font-display text-ink">Production-grade use cases</h3>
                    <div className="mt-6 grid gap-4">
                        {[
                            { title: 'Multi-tool agents', body: 'Search, scrape, execute, and summarize across services.' },
                            { title: 'Data automation', body: 'Validate, transform, and ship data on schedules.' },
                            { title: 'Infrastructure tasks', body: 'Run shell, git, and remote execution workflows.' },
                        ].map((item) => (
                            <div key={item.title} className="surface rounded-2xl p-4">
                                <p className="text-sm font-semibold text-ink">{item.title}</p>
                                <p className="text-sm text-muted mt-2">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-20">
                <div className="grid gap-8 lg:grid-cols-3">
                    {[
                        { title: 'Observability', body: 'Listen to flow and node events for full execution traces.' },
                        { title: 'Tool registry', body: 'Expose your own integrations with JSON schema definitions.' },
                        { title: 'Node catalog', body: 'LLMs, web, files, databases, agents, and more included.' },
                    ].map((item) => (
                        <div key={item.title} className="glass rounded-2xl p-6 shadow-soft">
                            <p className="text-xs uppercase tracking-wide text-accent">Pillar</p>
                            <h4 className="mt-2 text-xl font-display text-ink">{item.title}</h4>
                            <p className="mt-3 text-sm text-muted">{item.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-20">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-display text-ink">Showcase</h2>
                    <a href="#examples" className="text-sm font-semibold text-accent hover:opacity-80">Browse all examples</a>
                </div>
                <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {showcaseItems.map((item) => (
                        <div key={item.title} className="glass rounded-2xl p-6 shadow-soft">
                            <p className="text-xs uppercase tracking-wide text-muted">{item.file}</p>
                            <h4 className="mt-3 text-lg font-display text-ink">{item.title}</h4>
                            <p className="mt-2 text-sm text-muted">{item.description}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {item.tags.map((tag) => (
                                    <span key={tag} className="px-2 py-1 rounded-full chip text-xs">{tag}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-20">
                <div className="glass rounded-3xl p-8 sm:p-10 shadow-soft grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="min-w-0">
                        <h2 className="text-3xl font-display text-ink">Start shipping durable workflows today</h2>
                        <p className="mt-4 text-muted">
                            Spin up a new project in minutes and grow into sophisticated agentic systems without changing foundations.
                        </p>
                        <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
                            <a href="#getting-started" className="w-full sm:w-auto text-center px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:opacity-90 transition-colors">Launch Quickstart</a>
                            <a href="#docs" className="w-full sm:w-auto text-center px-6 py-3 rounded-full border border-slate-300 text-sm font-semibold text-ink hover:bg-white/80 transition-colors">Read the Docs</a>
                        </div>
                    </div>
                    <div className="space-y-4 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted">Install</p>
                        <CodeBlock code={installCode} title="Install qflow" language="bash" />
                    </div>
                </div>
            </section>
        </div>
    );
};
