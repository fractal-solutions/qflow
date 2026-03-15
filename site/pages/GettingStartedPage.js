window.GettingStartedPage = () => {
    const CodeBlock = window.CodeBlock;

    const installScaffold = `bunx create-qflow@latest my-new-project`;
    const usageScaffold = `bunx create-qflow@latest <project-name>`;

    const coreInstall = `npm install @fractal-solutions/qflow\n# or\nbun add @fractal-solutions/qflow`;

    const step1Code = `bunx create-qflow@latest my-weather-cli\ncd my-weather-cli`;

    const step2Code = `// weather-flow.js\nimport { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';\nimport { HttpRequestNode, UserInputNode } from '@fractal-solutions/qflow/nodes';`;

    const step3Code = `const getCity = new UserInputNode();\ngetCity.setParams({ prompt: 'Enter a city name: ' });\n\ngetCity.postAsync = async (shared, _, city) => {\n  shared.city = city.trim();\n  console.log('Fetching weather for ' + shared.city + '...');\n  return 'default';\n};`;

    const step4Code = `const fetchWeather = new HttpRequestNode();\n\nfetchWeather.prepAsync = async (shared) => {\n  if (!shared.city) throw new Error('City not provided!');\n  fetchWeather.setParams({\n    url: 'https://wttr.in/' + encodeURIComponent(shared.city) + '?format=j1',\n    method: 'GET',\n  });\n};\n\nfetchWeather.postAsync = async (shared, _, execRes) => {\n  if (execRes.status === 200) {\n    shared.weather = execRes.body;\n  } else {\n    throw new Error('Failed to fetch weather: ' + execRes.status);\n  }\n  return 'default';\n};`;

    const step5Code = `class DisplayWeatherNode extends AsyncNode {\n  async execAsync(prepRes, shared) {\n    const weather = shared.weather;\n    if (!weather) return;\n\n    const current = weather.current_condition[0];\n    const feelsLike = current.FeelsLikeC;\n    const temp = current.temp_C;\n    const description = current.weatherDesc[0].value;\n\n    console.log('--- Weather in ' + shared.city + ' ---');\n    console.log(description + ', ' + temp + '°C (Feels like ' + feelsLike + '°C)');\n  }\n}\n\nconst displayWeather = new DisplayWeatherNode();`;

    const step6Code = `getCity.next(fetchWeather);\nfetchWeather.next(displayWeather);\n\nconst weatherFlow = new AsyncFlow(getCity);\n\n(async () => {\n  try {\n    await weatherFlow.runAsync({});\n    console.log('Weather check complete!');\n  } catch (error) {\n    console.error('Flow failed:', error.message);\n  }\n})();`;

    const step7Code = `node weather-flow.js`;

    const workflowStyles = [
        {
            title: 'Concise (Functional)',
            body: 'Create an AsyncNode and override execAsync/postAsync directly.'
        },
        {
            title: 'Flexible (Object Spread)',
            body: 'Use object spread to extend an AsyncNode inline for quick flows.'
        },
        {
            title: 'Structured (Class-based)',
            body: 'Extend AsyncNode for encapsulation and reuse.'
        },
        {
            title: 'Agent (Generic LLM)',
            body: 'Scaffold a generic agent with configurable base URL, model, and tools.'
        }
    ];

    return (
        <div className="container mx-auto px-6 py-14">
            <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                    <div className="inline-flex items-center space-x-2 rounded-full border border-slate-200 bg-white/70 px-4 py-1 text-xs uppercase tracking-wide text-accent">
                        <span className="h-2 w-2 rounded-full bg-accent"></span>
                        <span>Getting Started</span>
                    </div>
                    <h1 className="text-4xl font-display text-ink">Ship your first qflow workflow in minutes</h1>
                    <p className="text-muted">
                        Start with create-qflow or install the library directly. This guide shows the scaffolder flow and a complete workflow example with shared state and async nodes.
                    </p>
                    <div className="glass rounded-2xl p-6 shadow-soft">
                        <p className="text-xs uppercase tracking-wide text-accent">Quick checklist</p>
                        <div className="mt-4 space-y-3 text-sm text-muted">
                            <div className="flex items-center space-x-2">
                                <span className="h-2 w-2 rounded-full bg-accent"></span>
                                <span>Install with bunx or npm</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="h-2 w-2 rounded-full bg-accent"></span>
                                <span>Pick a workflow style that matches your codebase</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="h-2 w-2 rounded-full bg-accent"></span>
                                <span>Run a flow and inspect shared state</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="glass rounded-3xl p-8 shadow-soft">
                    <p className="text-xs uppercase tracking-wide text-muted">Scaffold</p>
                    <CodeBlock code={installScaffold} title="create-qflow install" language="bash" />
                    <CodeBlock code={usageScaffold} title="create-qflow usage" language="bash" />
                    <p className="text-xs uppercase tracking-wide text-muted mt-6">Library install</p>
                    <CodeBlock code={coreInstall} title="Install qflow" language="bash" />
                </div>
            </section>

            <section className="mt-12">
                <div className="glass rounded-3xl p-8 shadow-soft">
                    <h2 className="text-2xl font-display text-ink">Choose your workflow style</h2>
                    <p className="mt-3 text-muted">
                        create-qflow prompts you to select a workflow style so you can start with the coding approach that best matches your team.
                    </p>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {workflowStyles.map((style) => (
                            <div key={style.title} className="surface rounded-2xl p-4">
                                <p className="text-sm font-semibold text-ink">{style.title}</p>
                                <p className="mt-2 text-sm text-muted">{style.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-12 grid gap-8 md:grid-cols-2">
                <div className="glass rounded-2xl p-6 shadow-soft">
                    <h2 className="text-xl font-display text-ink">Step 1: Create the project</h2>
                    <p className="mt-2 text-sm text-muted">Scaffold the directory and install dependencies.</p>
                    <div className="mt-4">
                        <CodeBlock code={step1Code} title="Create Project" language="bash" />
                    </div>
                </div>
                <div className="glass rounded-2xl p-6 shadow-soft">
                    <h2 className="text-xl font-display text-ink">Step 2: Import nodes</h2>
                    <p className="mt-2 text-sm text-muted">Use the core Flow/AsyncNode classes and built-in nodes.</p>
                    <div className="mt-4">
                        <CodeBlock code={step2Code} title="Imports" language="js" />
                    </div>
                </div>
            </section>

            <section className="mt-8 grid gap-8 md:grid-cols-2">
                <div className="glass rounded-2xl p-6 shadow-soft">
                    <h2 className="text-xl font-display text-ink">Step 3: Capture input</h2>
                    <p className="mt-2 text-sm text-muted">Store user input into shared state.</p>
                    <div className="mt-4">
                        <CodeBlock code={step3Code} title="User Input" language="js" />
                    </div>
                </div>
                <div className="glass rounded-2xl p-6 shadow-soft">
                    <h2 className="text-xl font-display text-ink">Step 4: Fetch data</h2>
                    <p className="mt-2 text-sm text-muted">Use HttpRequestNode in prepAsync/postAsync.</p>
                    <div className="mt-4">
                        <CodeBlock code={step4Code} title="HTTP Request" language="js" />
                    </div>
                </div>
            </section>

            <section className="mt-8 grid gap-8 md:grid-cols-2">
                <div className="glass rounded-2xl p-6 shadow-soft">
                    <h2 className="text-xl font-display text-ink">Step 5: Render output</h2>
                    <p className="mt-2 text-sm text-muted">Format results with a custom AsyncNode.</p>
                    <div className="mt-4">
                        <CodeBlock code={step5Code} title="Display Result" language="js" />
                    </div>
                </div>
                <div className="glass rounded-2xl p-6 shadow-soft">
                    <h2 className="text-xl font-display text-ink">Step 6: Run the flow</h2>
                    <p className="mt-2 text-sm text-muted">Chain nodes and run asynchronously.</p>
                    <div className="mt-4">
                        <CodeBlock code={step6Code} title="Run Flow" language="js" />
                        <div className="mt-4">
                            <CodeBlock code={step7Code} title="Execute" language="bash" />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
