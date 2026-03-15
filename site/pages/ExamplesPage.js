window.ExamplesPage = () => {
    const CodeBlock = window.CodeBlock;
    const examples = window.EXAMPLES || [];
    const [openExamples, setOpenExamples] = React.useState({});

    const toggleExample = (file) => {
        setOpenExamples((prev) => ({ ...prev, [file]: !prev[file] }));
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 py-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-display text-ink">Examples</h1>
                    <p className="mt-2 text-muted max-w-xl">Runnable workflows pulled directly from the repository examples. Use them as starting points or reference implementations.</p>
                </div>
                <a href="#getting-started" className="px-5 py-2 rounded-full bg-accent text-white text-sm font-semibold shadow-soft hover:opacity-90 transition-colors">
                    Start a New Project
                </a>
            </div>

            <div className="mt-10 grid gap-6">
                {examples.map((example) => (
                    <div key={example.file} className="glass rounded-2xl p-6 shadow-soft min-w-0 overflow-hidden">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted">{example.file}</p>
                                <h3 className="mt-2 text-2xl font-display text-ink break-words">{example.title}</h3>
                                <p className="mt-2 text-sm text-muted break-words">{example.description}</p>
                            </div>
                            <button
                                onClick={() => toggleExample(example.file)}
                                className="self-start md:self-auto px-4 py-2 rounded-full text-xs font-semibold transition bg-accent text-white hover:opacity-90"
                            >
                                {openExamples[example.file] ? 'Hide code' : 'Show code'}
                            </button>
                        </div>
                        {openExamples[example.file] && (
                            <div className="mt-4 max-w-full overflow-x-auto min-w-0">
                                <CodeBlock code={example.snippet} title="Example" language="js" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
