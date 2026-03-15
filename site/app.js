const App = () => {
    const [hash, setHash] = React.useState(window.location.hash);

    React.useEffect(() => {
        const handleHashChange = () => {
            setHash(window.location.hash);
        };

        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    const renderPage = () => {
        switch (hash) {
            case '#getting-started':
                return <GettingStartedPage />;
            case '#docs':
                return <DocsPage />;
            case '#home':
            default:
                return <LandingPage />;
        }
    };

    return (
        <div className="relative min-h-screen">
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="glow-orb w-[520px] h-[520px] bg-teal-300/40 -top-48 -left-24 float-slow"></div>
                <div className="glow-orb w-[420px] h-[420px] bg-amber-300/30 top-40 -right-20 float-slow"></div>
                <div className="glow-orb w-[360px] h-[360px] bg-emerald-200/30 bottom-10 left-1/3 float-slow"></div>
            </div>
            <Navbar />
            <main className="relative">
                {renderPage()}
            </main>
            <Footer />
        </div>
    );
};

const Navbar = () => {
    const [open, setOpen] = React.useState(false);

    const navLinkClass = "text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors";

    return (
        <header className="sticky top-0 z-50">
            <nav className="glass shadow-soft">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <a href="#home" className="text-2xl font-semibold font-display tracking-tight text-slate-900">
                            qflow
                        </a>
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#home" className={navLinkClass}>Home</a>
                            <a href="#getting-started" className={navLinkClass}>Getting Started</a>
                            <a href="#docs" className={navLinkClass}>Docs</a>
                            <a href="https://github.com/fractal-code/qflow" target="_blank" rel="noopener noreferrer" className={navLinkClass}>GitHub</a>
                        </div>
                        <div className="hidden md:flex items-center space-x-3">
                            <a href="#getting-started" className="px-4 py-2 rounded-full bg-teal-700 text-white text-sm font-medium shadow-soft hover:bg-teal-800 transition-colors">
                                Start Building
                            </a>
                        </div>
                        <button
                            className="md:hidden text-slate-700"
                            onClick={() => setOpen(!open)}
                            aria-label="Toggle navigation"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M3 12h18"></path>
                                <path d="M3 18h18"></path>
                            </svg>
                        </button>
                    </div>
                    {open && (
                        <div className="mt-4 flex flex-col space-y-3 md:hidden">
                            <a href="#home" className={navLinkClass} onClick={() => setOpen(false)}>Home</a>
                            <a href="#getting-started" className={navLinkClass} onClick={() => setOpen(false)}>Getting Started</a>
                            <a href="#docs" className={navLinkClass} onClick={() => setOpen(false)}>Docs</a>
                            <a href="https://github.com/fractal-code/qflow" target="_blank" rel="noopener noreferrer" className={navLinkClass}>GitHub</a>
                            <a href="#getting-started" className="px-4 py-2 rounded-full bg-teal-700 text-white text-sm font-medium shadow-soft text-center" onClick={() => setOpen(false)}>
                                Start Building
                            </a>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
};

const Footer = () => {
    return (
        <footer className="mt-24 border-t border-teal-900/10">
            <div className="container mx-auto px-6 py-12">
                <div className="grid gap-8 md:grid-cols-4">
                    <div>
                        <h3 className="text-xl font-display text-slate-900">qflow</h3>
                        <p className="mt-3 text-sm text-slate-600">
                            Lightweight workflows and agents for ambitious builders.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Product</h4>
                        <div className="mt-3 flex flex-col space-y-2 text-sm text-slate-600">
                            <a href="#home" className="hover:text-slate-900">Overview</a>
                            <a href="#getting-started" className="hover:text-slate-900">Quickstart</a>
                            <a href="#docs" className="hover:text-slate-900">Docs</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Resources</h4>
                        <div className="mt-3 flex flex-col space-y-2 text-sm text-slate-600">
                            <a href="https://github.com/fractal-code/qflow" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">GitHub</a>
                            <a href="#docs" className="hover:text-slate-900">API Reference</a>
                            <a href="#getting-started" className="hover:text-slate-900">Examples</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">License</h4>
                        <p className="mt-3 text-sm text-slate-600">MIT License</p>
                        <p className="mt-2 text-xs text-slate-500">&copy; {new Date().getFullYear()} Fractal.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

const CodeBlock = ({ code, title, language }) => {
    const [copyText, setCopyText] = React.useState('Copy');
    const codeRef = React.useRef(null);

    React.useEffect(() => {
        if (codeRef.current && window.Prism) {
            window.Prism.highlightElement(codeRef.current);
        }
    }, [code]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopyText('Copied');
            setTimeout(() => setCopyText('Copy'), 2000);
        }, () => {
            setCopyText('Failed');
            setTimeout(() => setCopyText('Copy'), 2000);
        });
    };

    return (
        <div className="rounded-2xl overflow-hidden border border-emerald-900/10 bg-slate-950 text-slate-100 shadow-soft">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-emerald-700/20">
                <div className="flex items-center space-x-3 text-xs uppercase tracking-wide text-slate-300">
                    <span>{title || 'Code Example'}</span>
                    {language && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300">{language}</span>}
                </div>
                <button
                    onClick={handleCopy}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20 transition-colors"
                >
                    {copyText}
                </button>
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
                <code ref={codeRef} className={`language-${language || 'js'}`}>
                    {code}
                </code>
            </pre>
        </div>
    );
};

const LandingPage = () => {
    const installCode = `bunx create-qflow@latest my-qflow-project`;

    const featureCode = `import { AgentNode, AgentDeepSeekLLMNode } from '@fractal-solutions/qflow/nodes';
import { AsyncFlow } from '@fractal-solutions/qflow';

const llm = new AgentDeepSeekLLMNode({ apiKey: process.env.DEEPSEEK_API_KEY });
const availableTools = { /* ... */ };

const agent = new AgentNode(llm, availableTools);
agent.setParams({ goal: 'Summarize the top 5 stories on Hacker News.' });

const flow = new AsyncFlow(agent);
await flow.runAsync();`;

    return (
        <div className="container mx-auto px-6 py-16">
            <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
                <div className="space-y-6">
                    <div className="inline-flex items-center space-x-2 rounded-full border border-teal-900/10 bg-white/70 px-4 py-1 text-xs uppercase tracking-wide text-teal-800">
                        <span className="h-2 w-2 rounded-full bg-teal-600"></span>
                        <span>Agentic workflows without the weight</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display text-slate-900 leading-tight reveal reveal-1">
                        Orchestrate complex work with
                        <span className="text-teal-700"> simple primitives</span>
                    </h1>
                    <p className="text-lg text-slate-600 max-w-xl reveal reveal-2">
                        qflow gives you a lightweight core for chaining operations, managing shared state, and building autonomous agents that can reason, plan, and use tools.
                    </p>
                    <div className="flex flex-wrap gap-4 reveal reveal-3">
                        <a href="#getting-started" className="px-6 py-3 rounded-full bg-teal-700 text-white text-sm font-semibold shadow-soft hover:bg-teal-800 transition-colors">
                            Get Started
                        </a>
                        <a href="#docs" className="px-6 py-3 rounded-full border border-teal-900/20 text-sm font-semibold text-slate-800 hover:bg-white/80 transition-colors">
                            Explore Docs
                        </a>
                    </div>
                    <div className="grid grid-cols-3 gap-6 pt-4">
                        <div>
                            <p className="text-2xl font-display text-slate-900">40+</p>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Built-in nodes</p>
                        </div>
                        <div>
                            <p className="text-2xl font-display text-slate-900">3</p>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Agent cycles</p>
                        </div>
                        <div>
                            <p className="text-2xl font-display text-slate-900">Async-first</p>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Observability</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="glass rounded-3xl p-6 shadow-soft">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">Flow Console</p>
                                <p className="text-lg font-display text-slate-900">Agent Overview</p>
                            </div>
                            <span className="text-xs text-teal-700 bg-teal-100 px-3 py-1 rounded-full">Live</span>
                        </div>
                        <CodeBlock code={featureCode} title="Agent Definition" language="js" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { title: 'Composable', body: 'Build reusable nodes and plug them into any flow.' },
                            { title: 'Observable', body: 'Trace execution with detailed lifecycle events.' },
                            { title: 'Extensible', body: 'Register custom tools with JSON schema.' },
                            { title: 'Pragmatic', body: 'Small API surface, big leverage.' },
                        ].map((item) => (
                            <div key={item.title} className="glass rounded-2xl p-4">
                                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                <p className="text-xs text-slate-600 mt-2">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-20">
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
                    <span>Designed for builders</span>
                    <span className="h-px w-16 bg-slate-300"></span>
                    <div className="flex flex-wrap gap-2">
                        {['Automation', 'Data Pipelines', 'Agents', 'Observability', 'Integrations'].map((label) => (
                            <span key={label} className="px-3 py-1 rounded-full bg-white/70 border border-slate-200 text-slate-600">{label}</span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-20 grid gap-8 md:grid-cols-2">
                <div className="glass rounded-3xl p-8 shadow-soft">
                    <h2 className="text-3xl font-display text-slate-900">Workflow primitives that stay out of your way</h2>
                    <p className="mt-4 text-slate-600">
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
                                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                    <p className="text-sm text-slate-600">{item.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="glass rounded-3xl p-8 shadow-soft">
                    <h3 className="text-2xl font-display text-slate-900">Production-grade use cases</h3>
                    <div className="mt-6 grid gap-4">
                        {[
                            { title: 'Multi-tool agents', body: 'Search, scrape, execute, and summarize across services.' },
                            { title: 'Data automation', body: 'Validate, transform, and ship data on schedules.' },
                            { title: 'Infrastructure tasks', body: 'Run shell, git, and remote execution workflows.' },
                        ].map((item) => (
                            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                <p className="text-sm text-slate-600 mt-2">{item.body}</p>
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
                            <p className="text-xs uppercase tracking-wide text-teal-700">Pillar</p>
                            <h4 className="mt-2 text-xl font-display text-slate-900">{item.title}</h4>
                            <p className="mt-3 text-sm text-slate-600">{item.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-20">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-display text-slate-900">Example gallery</h2>
                    <a href="#getting-started" className="text-sm font-semibold text-teal-700 hover:text-teal-800">See more</a>
                </div>
                <div className="mt-8 grid gap-6 md:grid-cols-3">
                    {[
                        {
                            title: 'Interactive Webview Flow',
                            description: 'Build interactive dialogs and input capture with custom UI.',
                            snippet: `const dialog = new InteractiveWebviewNode();\ndialog.setParams({\n  mode: 'custom-dialog',\n  title: 'Agent Report',\n  html: '<div>...</div>'\n});`,
                        },
                        {
                            title: 'Browser Control',
                            description: 'Automate navigation, inputs, and screenshots reliably.',
                            snippet: `const browser = new BrowserControlNode();\nbrowser.setParams({\n  action: 'goto',\n  url: 'https://example.com'\n});`,
                        },
                        {
                            title: 'LLM + Tooling',
                            description: 'Combine LLM reasoning with structured tool calls.',
                            snippet: `const agent = new AgentNode(llm, tools);\nagent.setParams({ goal: 'Summarize HN' });`,
                        },
                    ].map((card) => (
                        <div key={card.title} className="glass rounded-2xl p-6 shadow-soft">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Example</p>
                            <h4 className="mt-2 text-lg font-display text-slate-900">{card.title}</h4>
                            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
                            <pre className="mt-4 rounded-xl bg-slate-950 text-slate-100 text-xs p-4 overflow-x-auto">
                                <code>{card.snippet}</code>
                            </pre>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-20">
                <div className="glass rounded-3xl p-10 shadow-soft grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                    <div>
                        <h2 className="text-3xl font-display text-slate-900">Start shipping durable workflows today</h2>
                        <p className="mt-4 text-slate-600">
                            Spin up a new project in minutes and grow into sophisticated agentic systems without changing foundations.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-4">
                            <a href="#getting-started" className="px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors">Launch Quickstart</a>
                            <a href="#docs" className="px-6 py-3 rounded-full border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-white/80 transition-colors">Read the Docs</a>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Install</p>
                        <CodeBlock code={installCode} title="Install qflow" language="bash" />
                    </div>
                </div>
            </section>
        </div>
    );
};

const GettingStartedPage = () => {
    const step1Code = `bunx create-qflow@latest my-weather-cli\ncd my-weather-cli`;

    const step2Code = `// weather-flow.js\nimport { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';\nimport { HttpRequestNode, UserInputNode } from '@fractal-solutions/qflow/nodes';`;

    const step3Code = `const getCity = new UserInputNode();\ngetCity.setParams({ prompt: 'Enter a city name: ' });\n\ngetCity.postAsync = async (shared, _, city) => {\n  shared.city = city.trim();\n  console.log('Fetching weather for ' + shared.city + '...');\n  return 'default';\n};`;

    const step4Code = `const fetchWeather = new HttpRequestNode();\n\nfetchWeather.prepAsync = async (shared) => {\n  if (!shared.city) throw new Error('City not provided!');\n  fetchWeather.setParams({\n    url: 'https://wttr.in/' + encodeURIComponent(shared.city) + '?format=j1',\n    method: 'GET',\n  });\n};\n\nfetchWeather.postAsync = async (shared, _, execRes) => {\n  if (execRes.status === 200) {\n    shared.weather = execRes.body;\n  } else {\n    throw new Error('Failed to fetch weather: ' + execRes.status);\n  }\n  return 'default';\n};`;

    const step5Code = `class DisplayWeatherNode extends AsyncNode {\n  async execAsync(prepRes, shared) {\n    const weather = shared.weather;\n    if (!weather) return;\n\n    const current = weather.current_condition[0];\n    const feelsLike = current.FeelsLikeC;\n    const temp = current.temp_C;\n    const description = current.weatherDesc[0].value;\n\n    console.log('--- Weather in ' + shared.city + ' ---');\n    console.log(description + ', ' + temp + '°C (Feels like ' + feelsLike + '°C)');\n  }\n}\n\nconst displayWeather = new DisplayWeatherNode();`;

    const step6Code = `getCity.next(fetchWeather);\nfetchWeather.next(displayWeather);\n\nconst weatherFlow = new AsyncFlow(getCity);\n\n(async () => {\n  try {\n    await weatherFlow.runAsync({});\n    console.log('Weather check complete!');\n  } catch (error) {\n    console.error('Flow failed:', error.message);\n  }\n})();`;

    const step7Code = `node weather-flow.js`;

    return (
        <div className="container mx-auto px-6 py-14">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                    <h1 className="text-4xl font-display text-slate-900">Getting Started</h1>
                    <p className="text-slate-600">
                        Build your first qflow application by wiring nodes together into a weather CLI. You will learn the core concepts in under 10 minutes.
                    </p>
                    <div className="glass rounded-2xl p-6 shadow-soft">
                        <p className="text-xs uppercase tracking-wide text-teal-700">Quick checklist</p>
                        <div className="mt-4 space-y-3 text-sm text-slate-600">
                            <div className="flex items-center space-x-2">
                                <span className="h-2 w-2 rounded-full bg-teal-600"></span>
                                <span>Install qflow with bunx or npm</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="h-2 w-2 rounded-full bg-teal-600"></span>
                                <span>Compose nodes in a single flow file</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="h-2 w-2 rounded-full bg-teal-600"></span>
                                <span>Run the flow and inspect shared state</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="glass rounded-3xl p-8 shadow-soft">
                    <CodeBlock code={step1Code} title="Step 1: Create Project" language="bash" />
                    <CodeBlock code={step2Code} title="Step 2: Imports" language="js" />
                </div>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
                <div className="glass rounded-2xl p-6 shadow-soft">
                    <h2 className="text-xl font-display text-slate-900">Step 3: Capture input</h2>
                    <p className="mt-2 text-sm text-slate-600">Ask the user for context and store it in shared state.</p>
                    <div className="mt-4">
                        <CodeBlock code={step3Code} title="User Input" language="js" />
                    </div>
                </div>
                <div className="glass rounded-2xl p-6 shadow-soft">
                    <h2 className="text-xl font-display text-slate-900">Step 4: Fetch data</h2>
                    <p className="mt-2 text-sm text-slate-600">Use the HTTP node to call an external API.</p>
                    <div className="mt-4">
                        <CodeBlock code={step4Code} title="HTTP Request" language="js" />
                    </div>
                </div>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
                <div className="glass rounded-2xl p-6 shadow-soft">
                    <h2 className="text-xl font-display text-slate-900">Step 5: Render output</h2>
                    <p className="mt-2 text-sm text-slate-600">Format data into a clear response.</p>
                    <div className="mt-4">
                        <CodeBlock code={step5Code} title="Display Result" language="js" />
                    </div>
                </div>
                <div className="glass rounded-2xl p-6 shadow-soft">
                    <h2 className="text-xl font-display text-slate-900">Step 6: Run the flow</h2>
                    <p className="mt-2 text-sm text-slate-600">Chain the nodes and run asynchronously.</p>
                    <div className="mt-4">
                        <CodeBlock code={step6Code} title="Run Flow" language="js" />
                        <div className="mt-4">
                            <CodeBlock code={step7Code} title="Execute" language="bash" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DocsPage = () => {
    const [activeTopic, setActiveTopic] = React.useState('core-concepts');

    const topics = {
        'core-concepts': {
            title: 'Core Concepts',
            content: `
                <p>qflow is built on a small set of primitives that scale from one-off scripts to production agents.</p>
                <h4 class="text-xl font-semibold text-teal-700 mt-6 mb-2">The shared object</h4>
                <p>State flows through every node as a mutable object. This keeps data propagation explicit and debuggable.</p>
                <h4 class="text-xl font-semibold text-teal-700 mt-6 mb-2">Node lifecycle</h4>
                <p>Nodes expose prep, exec, and post hooks. Async variants mirror this with prepAsync and execAsync.</p>
                <h4 class="text-xl font-semibold text-teal-700 mt-6 mb-2">Flow orchestration</h4>
                <p>Flows define the path between nodes, including conditional branching and async batch execution.</p>
            `
        },
        'agent-architecture': {
            title: 'Agent Architecture',
            content: `
                <p>AgentNode wraps the core runtime with structured reasoning cycles.</p>
                <h4 class="text-xl font-semibold text-teal-700 mt-6 mb-2">Tool definitions</h4>
                <p>Tools are just nodes with a JSON schema definition. This lets LLMs call tools safely.</p>
                <h4 class="text-xl font-semibold text-teal-700 mt-6 mb-2">Reasoning cycles</h4>
                <p>Choose RAOR, OODA, or PEMA depending on how structured you want the agent loop.</p>
            `
        },
        'node-shellcommand': {
            title: 'Node: ShellCommandNode',
            content: `
                <p>Execute shell commands from within a flow and capture stdout, stderr, and exit status.</p>
                <h4 class="text-xl font-semibold text-teal-700 mt-6 mb-2">Parameters</h4>
                <ul>
                    <li class="ml-4 my-2"><strong>command</strong> (string, required): The shell command to execute.</li>
                </ul>
            `
        },
        'node-httprequest': {
            title: 'Node: HttpRequestNode',
            content: `
                <p>Call any HTTP endpoint and parse JSON automatically.</p>
                <h4 class="text-xl font-semibold text-teal-700 mt-6 mb-2">Parameters</h4>
                <ul>
                    <li class="ml-4 my-2"><strong>url</strong> (string, required): The URL to request.</li>
                    <li class="ml-4 my-2"><strong>method</strong> (string): HTTP method (default GET).</li>
                    <li class="ml-4 my-2"><strong>headers</strong> (object): Request headers.</li>
                    <li class="ml-4 my-2"><strong>body</strong> (object | string): Request payload.</li>
                </ul>
            `
        },
    };

    const shellExample = `import { AsyncFlow } from '@fractal-solutions/qflow';\nimport { ShellCommandNode } from '@fractal-solutions/qflow/nodes';\n\nconst listFiles = new ShellCommandNode();\nlistFiles.setParams({ command: 'ls -la' });\n\nlistFiles.postAsync = async (shared, _, result) => {\n  console.log(result.stdout);\n};\n\nconst flow = new AsyncFlow(listFiles);\nawait flow.runAsync();`;

    const httpExample = `import { AsyncFlow } from '@fractal-solutions/qflow';\nimport { HttpRequestNode } from '@fractal-solutions/qflow/nodes';\n\nconst getNode = new HttpRequestNode();\ngetNode.setParams({ url: 'https://api.publicapis.org/entries' });\n\ngetNode.postAsync = async (shared, _, result) => {\n  console.log('Found ' + result.body.count + ' entries.');\n};\n\nconst flow = new AsyncFlow(getNode);\nawait flow.runAsync();`;

    const renderContent = () => {
        const topic = topics[activeTopic];
        if (!topic) return null;

        return (
            <div className="glass rounded-3xl p-8 shadow-soft">
                <h1 className="text-3xl font-display text-slate-900 mb-6">{topic.title}</h1>
                <div className="prose max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: topic.content }} />
                {activeTopic === 'node-shellcommand' && (
                    <div className="mt-6">
                        <CodeBlock code={shellExample} title="ShellCommandNode Example" language="js" />
                    </div>
                )}
                {activeTopic === 'node-httprequest' && (
                    <div className="mt-6">
                        <CodeBlock code={httpExample} title="HttpRequestNode Example" language="js" />
                    </div>
                )}
            </div>
        );
    };

    const SidebarLink = ({ topicId, children }) => (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); setActiveTopic(topicId); }}
            className={`block px-4 py-2 rounded-xl transition-colors ${activeTopic === topicId ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'}`}
        >
            {children}
        </a>
    );

    return (
        <div className="container mx-auto px-6 py-14">
            <div className="grid gap-8 md:grid-cols-[260px_1fr]">
                <aside className="space-y-6">
                    <div className="glass rounded-2xl p-5 shadow-soft">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Documentation</p>
                        <nav className="mt-4 space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Core</p>
                            <SidebarLink topicId="core-concepts">Core Concepts</SidebarLink>
                            <SidebarLink topicId="agent-architecture">Agent Architecture</SidebarLink>
                            <p className="pt-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Node Reference</p>
                            <SidebarLink topicId="node-shellcommand">ShellCommandNode</SidebarLink>
                            <SidebarLink topicId="node-httprequest">HttpRequestNode</SidebarLink>
                        </nav>
                    </div>
                    <div className="glass rounded-2xl p-5 shadow-soft">
                        <p className="text-xs uppercase tracking-wide text-teal-700">Quick Start</p>
                        <p className="mt-2 text-sm text-slate-600">Install qflow and run your first flow in minutes.</p>
                        <a href="#getting-started" className="mt-4 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-800">View Getting Started</a>
                    </div>
                </aside>
                <main>{renderContent()}</main>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
