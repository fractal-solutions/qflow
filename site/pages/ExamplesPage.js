window.ExamplesPage = () => {
    const examples = [
        {
            title: 'Interactive Webview Test',
            file: 'examples/interactive_webview_test.js',
            description: 'Dialog and input flows, including custom webview content and long-form input.',
            category: 'UI + Webview'
        },
        {
            title: 'Browser Control Test',
            file: 'examples/browser_control_test.js',
            description: 'Playwright automation for navigation, typing, clicking, evaluating, and screenshots.',
            category: 'Automation'
        },
        {
            title: 'Webview Data Visualization',
            file: 'examples/webview_data_visualization.js',
            description: 'Render Chart.js inside a WebviewNode using generated data.',
            category: 'Visualization'
        },
        {
            title: 'Observability Test',
            file: 'examples/observability_test.js',
            description: 'Subscribe to flow and node lifecycle events for tracing and telemetry.',
            category: 'Observability'
        },
        {
            title: 'RAG Agent from Files',
            file: 'examples/rag_agent_from_files.js',
            description: 'Build retrieval-augmented generation from local documents.',
            category: 'RAG'
        },
        {
            title: 'Multi-Agent (OpenRouter)',
            file: 'examples/multi_agent_openrouter_example.js',
            description: 'Coordinate multiple agents using OpenRouter-backed models.',
            category: 'Agents'
        },
        {
            title: 'Scheduler Example',
            file: 'examples/scheduler_example.js',
            description: 'Run flows on schedules or delays using SchedulerNode.',
            category: 'Scheduling'
        },
        {
            title: 'Filesystem Test',
            file: 'examples/filesystem_test.js',
            description: 'Read, write, append, and list files inside a flow.',
            category: 'System'
        },
        {
            title: 'Semantic Memory Test',
            file: 'examples/semantic_memory_test.js',
            description: 'Store and retrieve memories with semantic search.',
            category: 'Memory'
        },
        {
            title: 'HTTP Server Test',
            file: 'examples/http_server_test.js',
            description: 'Serve HTTP requests and trigger flows with HttpServerNode.',
            category: 'Web'
        }
    ];

    return (
        <div className="container mx-auto px-6 py-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-display text-ink">Examples</h1>
                    <p className="mt-2 text-muted max-w-xl">Practical, runnable workflows to explore qflow capabilities across web automation, agents, and systems.</p>
                </div>
                <a href="#getting-started" className="px-5 py-2 rounded-full bg-accent text-white text-sm font-semibold shadow-soft hover:opacity-90 transition-colors">
                    Start a New Project
                </a>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {examples.map((example) => (
                    <div key={example.title} className="glass rounded-2xl p-6 shadow-soft">
                        <p className="text-xs uppercase tracking-wide text-muted">{example.category}</p>
                        <h3 className="mt-3 text-lg font-display text-ink">{example.title}</h3>
                        <p className="mt-2 text-sm text-muted">{example.description}</p>
                        <div className="mt-4 text-xs text-muted">{example.file}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
