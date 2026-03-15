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
        <div>
            <Navbar />
            <main>
                {renderPage()}
            </main>
            <Footer />
        </div>
    );
};

const Navbar = () => {
    return (
        <nav className="bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50 border-b border-cyan-500/30">
            <div className="container mx-auto px-6 py-3">
                <div className="flex justify-between items-center">
                    <a href="#" className="text-2xl font-bold text-white font-orbitron">
                        Q<span className="text-cyan-400">flow</span>
                    </a>
                    <div className="hidden md:flex items-center space-x-6">
                        <a href="#" className="text-gray-300 hover:text-cyan-400 transition-colors">Home</a>
                        <a href="#getting-started" className="text-gray-300 hover:text-cyan-400 transition-colors">Getting Started</a>
                        <a href="#docs" className="text-gray-300 hover:text-cyan-400 transition-colors">Docs</a>
                        <a href="https://github.com/fractal-code/qflow" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-github"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.54 2.73c0 5.46 3.3 6.61 6.44 7V19"></path></svg>
                        </a>
                    </div>
                    <div className="md:hidden">
                        {/* Mobile menu button can be added here if needed */}
                    </div>
                </div>
            </div>
        </nav>
    );
};

const Footer = () => {
    return (
        <footer className="bg-gray-900/50 border-t border-cyan-500/30 mt-24">
            <div className="container mx-auto px-6 py-8">
                <div className="flex flex-col items-center text-center">
                    <a href="#" className="text-2xl font-bold text-white font-orbitron">
                        Q<span className="text-cyan-400">flow</span>
                    </a>
                    <div className="flex space-x-6 mt-4">
                        <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">Home</a>
                        <a href="#getting-started" className="text-gray-400 hover:text-cyan-400 transition-colors">Getting Started</a>
                        <a href="#docs" className="text-gray-400 hover:text-cyan-400 transition-colors">Docs</a>
                        <a href="https://github.com/fractal-code/qflow" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors">GitHub</a>
                    </div>
                    <p className="mt-6 text-gray-500 text-sm">
                        &copy; {new Date().getFullYear()} Fractal. All rights reserved.
                    </p>
                    <p className="mt-2 text-gray-600 text-xs">
                        Released under the MIT License.
                    </p>
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
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy'), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    return (
        <div className="bg-gray-900 rounded-lg overflow-hidden my-6 border border-cyan-500/20">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-800/50">
                <span className="text-gray-400 text-xs">{title || 'Code Example'}</span>
                <button
                    onClick={handleCopy}
                    className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 px-3 py-1 rounded-md text-xs transition-colors"
                >
                    {copyText}
                </button>
            </div>
            <pre className="p-4 text-sm text-white overflow-x-auto">
                <code ref={codeRef} className={`language-${language}`}>
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

// 1. Define your LLM and Tools
const llm = new AgentDeepSeekLLMNode({ apiKey: process.env.DEEPSEEK_API_KEY });
const availableTools = { /* ... your tools ... */ };

// 2. Create an Agent
const agent = new AgentNode(llm, availableTools);
agent.setParams({
  goal: "Summarize the top 5 stories on Hacker News."
});

// 3. Run the Flow
const flow = new AsyncFlow(agent);
await flow.runAsync();`;

    return (
        <div className="container mx-auto px-6 py-16 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white font-orbitron leading-tight">
                Build Intelligent Workflows
            </h1>
            <p className="mt-4 text-lg md:text-xl text-cyan-300/80 max-w-3xl mx-auto">
                qflow is a lightweight and flexible JavaScript library for creating and managing complex workflows and autonomous, tool-using agents.
            </p>

            <div className="mt-8">
                <a href="#getting-started" className="bg-cyan-500 text-gray-900 font-bold py-3 px-8 rounded-full hover:bg-cyan-400 transition-transform transform hover:scale-105 text-lg">
                    Get Started
                </a>
            </div>

            <div className="mt-12 max-w-2xl mx-auto">
                 <CodeBlock code={installCode} title="Install qflow" language="bash" />
            </div>

            <div className="mt-24 text-left">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white font-orbitron">Agentic by Design</h2>
                        <p className="mt-4 text-gray-400">
                            Go beyond simple scripts. With qflow, you can build powerful, autonomous agents that can reason, plan, and use tools to achieve complex goals. Integrate with various LLMs and extend their capabilities with custom tools.
                        </p>
                         <p className="mt-4 text-gray-400">
                            The agent architecture (RAOR, OODA, etc.) provides structured reasoning cycles, enabling robust and predictable agentic behavior.
                        </p>
                    </div>
                    <div className="max-w-2xl mx-auto w-full">
                        <CodeBlock code={featureCode} title="Example: Agent Usage" language="js" />
                    </div>
                </div>
            </div>

            <div className="mt-24">
                <h2 className="text-3xl font-bold text-white font-orbitron mb-12">Core Features</h2>
                <div className="grid md:grid-cols-3 gap-8 text-left">
                    <div className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/20">
                        <h3 className="text-xl font-bold text-cyan-400">Modular & Extensible</h3>
                        <p className="mt-2 text-gray-400">
                            Compose complex workflows from simple, reusable nodes. Easily create your own custom nodes to integrate with any API or system.
                        </p>
                    </div>
                    <div className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/20">
                        <h3 className="text-xl font-bold text-cyan-400">Powerful Integrations</h3>
                        <p className="mt-2 text-gray-400">
                            A rich set of built-in nodes for LLMs, databases, file systems, web scraping, shell commands, and more, right out of the box.
                        </p>
                    </div>
                    <div className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/20">
                        <h3 className="text-xl font-bold text-cyan-400">Full Observability</h3>
                        <p className="mt-2 text-gray-400">
                            Monitor your asynchronous flows with a detailed event system that provides insights into every step of your workflow execution.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GettingStartedPage = () => {
    const step1Code = `bunx create-qflow@latest my-weather-cli\ncd my-weather-cli`;

    const step2Code = `// weather-flow.js\nimport { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';\nimport { HttpRequestNode, UserInputNode } from '@fractal-solutions/qflow/nodes';`;

    const step3Code = `// 1. Node to get the city from the user\nconst getCity = new UserInputNode();\ngetCity.setParams({
    prompt: 'Enter a city name: '\n});\n\n// This node's 'postAsync' will save the user's input into the shared state\ngetCity.postAsync = async (shared, _, city) => {\n    shared.city = city.trim();\n    console.log('Fetching weather for ' + shared.city + '...');\n    return 'default';\n};`;

    const step4Code = `// 2. Node to call the weather API\nconst fetchWeather = new HttpRequestNode();\n\n// 'prepAsync' is used to prepare data right before execution.\n// Here, we use the city from the shared state to build the API URL.\nfetchWeather.prepAsync = async (shared) => {\n    if (!shared.city) {\n        throw new Error('City not provided!');\n    }\n    // wttr.in is a great, simple weather API that returns JSON\n    fetchWeather.setParams({
        url: 'https://wttr.in/' + encodeURIComponent(shared.city) + '?format=j1',\n        method: 'GET',\n    });\n};\n\n// 'postAsync' saves the weather data to the shared state\nfetchWeather.postAsync = async (shared, _, execRes) => {\n    if (execRes.status === 200) {\n        shared.weather = execRes.body; // The body is already parsed JSON\n    } else {\n        throw new Error('Failed to fetch weather: ' + execRes.status);\n    }\n    return 'default';\n};`;

    const step5Code = `// 3. Node to display the result\nclass DisplayWeatherNode extends AsyncNode {\n    async execAsync(prepRes, shared) {\n        const weather = shared.weather;\n        if (!weather) {\n            console.log("Could not retrieve weather data.");\n            return;\n        }\n\n        const current = weather.current_condition[0];\n        const feelsLike = current.FeelsLikeC;\n        const temp = current.temp_C;\n        const description = current.weatherDesc[0].value;\n\n        console.log('\n--- Weather in ' + shared.city + ' ---');\n        console.log(description + ', ' + temp + '°C (Feels like ' + feelsLike + '°C)');\n        console.log('---------------------------\n');\n    }\n}\n\nconst displayWeather = new DisplayWeatherNode();`;

    const step6Code = `// 4. Chain the nodes together and create the flow\ngetCity.next(fetchWeather);\nfetchWeather.next(displayWeather);\n\n// 5. Create and run the AsyncFlow\nconst weatherFlow = new AsyncFlow(getCity);\n\n(async () => {\n    try {\n        await weatherFlow.runAsync({});\n        console.log('Weather check complete!');\n    } catch (error) {\n        console.error('Flow failed:', error.message);\n    }\n})();`;

    const step7Code = `node weather-flow.js`;

    return (
        <div className="container mx-auto px-6 py-12 text-left max-w-4xl">
            <h1 className="text-4xl font-bold text-white font-orbitron">Getting Started</h1>
            <p className="mt-4 text-lg text-gray-400">
                Welcome to qflow! Let's build your first project: a simple command-line weather tool. This will introduce you to the core concepts of nodes, flows, and shared state.
            </p>

            <div className="mt-12">
                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron">Step 1: Create a New Project</h2>
                <p className="mt-2 text-gray-400">
                    The easiest way to start is with the `create-qflow` tool, which sets up a new project with all the necessary files.
                </p>
                <CodeBlock code={step1Code} title="1. Create Project" language="bash" />

                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron mt-8">Step 2: Create Your Flow File</h2>
                <p className="mt-2 text-gray-400">
                    Inside your new project, create a file named `weather-flow.js`. This is where we'll define our workflow. Start by importing the necessary classes.
                </p>
                <CodeBlock code={step2Code} title="weather-flow.js (Imports)" language="js" />

                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron mt-8">Step 3: Get User Input</h2>
                <p className="mt-2 text-gray-400">
                    First, we need a node to ask the user for a city. We'll use the built-in `UserInputNode`. After the user enters a city, we use `postAsync` to save the result into the flow's `shared` state object.
                </p>
                <CodeBlock code={step3Code} title="weather-flow.js (User Input)" language="js" />

                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron mt-8">Step 4: Fetch the Weather</h2>
                <p className="mt-2 text-gray-400">
                    Next, we'll use the `HttpRequestNode` to call a weather API. We use the `prepAsync` method to dynamically set the URL based on the city we saved in the `shared` state.
                </p>
                <CodeBlock code={step4Code} title="weather-flow.js (HTTP Request)" language="js" />

                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron mt-8">Step 5: Display the Result</h2>
                <p className="mt-2 text-gray-400">
                    Now we need a node to present the data to the user. We can create a custom `AsyncNode` for this. It reads the weather data from the `shared` state and prints a formatted message to the console.
                </p>
                <CodeBlock code={step5Code} title="weather-flow.js (Display Result)" language="js" />

                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron mt-8">Step 6: Assemble and Run the Flow</h2>
                <p className="mt-2 text-gray-400">
                    Finally, we chain our nodes together using `.next()` to define the sequence of operations. We then create an `AsyncFlow`, give it our starting node, and call `runAsync()` to execute the workflow.
                </p>
                <CodeBlock code={step6Code} title="weather-flow.js (Run Flow)" language="js" />

                <h2 className="text-2xl font-bold text-cyan-400 font-orbitron mt-8">Step 7: Run Your Project!</h2>
                <p className="mt-2 text-gray-400">
                    Save all the code into your `weather-flow.js` file and run it from your terminal.
                </p>
                <CodeBlock code={step7Code} title="Run from Terminal" language="bash" />
                <p className="mt-4 text-gray-400">
                    You've just created a complete qflow application! You can see how easy it is to chain different operations, pass data between them, and handle asynchronous tasks. From here, you can explore more complex flows, different nodes, and the powerful agent capabilities.
                </p>
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
                <p>At the heart of qflow are a few key abstractions that make it powerful and flexible.</p>
                <h4 class="text-xl font-bold text-cyan-400 mt-6 mb-2">The 'shared' Object</h4>
                <p>A central, mutable JavaScript object that is passed through the entire flow. Nodes can read from and write to this object, making it the primary mechanism for passing data and context between different nodes in a workflow.</p>
                <h4 class="text-xl font-bold text-cyan-400 mt-6 mb-2">Node</h4>
                <p>The fundamental building block. A Node represents a single, atomic operation. It has a simple lifecycle: <code>prep</code>, <code>exec</code>, and <code>post</code>. For asynchronous operations, you use an <code>AsyncNode</code>, which has <code>prepAsync</code>, <code>execAsync</code>, and <code>postAsync</code> methods.</p>
                <h4 class="text-xl font-bold text-cyan-400 mt-6 mb-2">Flow</h4>
                <p>A Flow orchestrates the execution of a sequence of Nodes. It defines the path and manages the transitions. Nodes are chained together using <code>.next(node, action)</code>, allowing for conditional branching based on the string returned by a node's <code>post</code> method.</p>
            `
        },
        'agent-architecture': {
            title: 'Agent Architecture',
            content: `
                <p>qflow's agent system allows you to create autonomous agents that can use tools to achieve goals. This is built on top of the core Node and Flow concepts.</p>
                <h4 class="text-xl font-bold text-cyan-400 mt-6 mb-2">AgentNode</h4>
                <p>The main entry point for agentic workflows. You provide it with an LLM node for reasoning and a set of available tools (which are just other nodes). The AgentNode then enters a reasoning loop where it decides which tool to use based on its goal.</p>
                <h4 class="text-xl font-bold text-cyan-400 mt-6 mb-2">Tool Definition</h4>
                <p>For an agent to use a node as a tool, the node class must have a static method called <code>getToolDefinition()</code>. This method returns a JSON schema describing the tool's name, purpose, and parameters, which the LLM uses to understand how and when to use the tool.</p>
                <h4 class="text-xl font-bold text-cyan-400 mt-6 mb-2">Reasoning Cycles</h4>
                <p>qflow provides several agent implementations with different reasoning cycles (RAOR, OODA, PEMA) to structure the agent's thought process, leading to more robust and predictable behavior.</p>
            `
        },
        'node-shellcommand': {
            title: 'Node: ShellCommandNode',
            content: `
                <p>Executes a shell command on the local machine.</p>
                <h4 class="text-xl font-bold text-cyan-400 mt-6 mb-2">Parameters</h4>
                <ul>
                    <li class="ml-4 my-2"><strong>command</strong> (string, required): The shell command to execute.</li>
                </ul>
                <h4 class="text-xl font-bold text-cyan-400 mt-6 mb-2">Returns</h4>
                <p>An object containing:</p>
                <ul>
                    <li class="ml-4 my-2"><strong>stdout</strong> (string): The standard output of the command.</li>
                    <li class="ml-4 my-2"><strong>stderr</strong> (string): The standard error of the command.</li>
                    <li class="ml-4 my-2"><strong>exitCode</strong> (number): The exit code of the process.</li>
                </ul>
                <h4 class="text-xl font-bold text-cyan-400 mt-6 mb-2">Example</h4>
            `
        },
        'node-httprequest': {
            title: 'Node: HttpRequestNode',
            content: `
                <p>Makes an HTTP request to a specified URL.</p>
                <h4 class="text-xl font-bold text-cyan-400 mt-6 mb-2">Parameters</h4>
                <ul>
                    <li class="ml-4 my-2"><strong>url</strong> (string, required): The URL to make the request to.</li>
                    <li class="ml-4 my-2"><strong>method</strong> (string): The HTTP method (e.g., 'GET', 'POST'). Defaults to 'GET'.</li>
                    <li class="ml-4 my-2"><strong>headers</strong> (object): An object of request headers.</li>
                    <li class="ml-4 my-2"><strong>body</strong> (object | string): The request body for 'POST', 'PUT', etc.</li>
                </ul>
                <h4 class="text-xl font-bold text-cyan-400 mt-6 mb-2">Returns</h4>
                <p>An object containing:</p>
                <ul>
                    <li class="ml-4 my-2"><strong>status</strong> (number): The HTTP status code.</li>
                    <li class="ml-4 my-2"><strong>headers</strong> (object): The response headers.</li>
                    <li class="ml-4 my-2"><strong>body</strong> (object | string): The response body. If the response is JSON, it will be a parsed object.</li>
                </ul>
                <h4 class="text-xl font-bold text-cyan-400 mt-6 mb-2">Example</h4>
            `
        },
    };

    const shellExample = `import { AsyncFlow } from '@fractal-solutions/qflow';\nimport { ShellCommandNode } from '@fractal-solutions/qflow/nodes';\n\nconst listFiles = new ShellCommandNode();\nlistFiles.setParams({ command: 'ls -la' });\n\nlistFiles.postAsync = async (shared, _, result) => {\n    console.log(result.stdout);\n};\n\nconst flow = new AsyncFlow(listFiles);\nawait flow.runAsync();`;

    const httpExample = `import { AsyncFlow } from '@fractal-solutions/qflow';\nimport { HttpRequestNode } from '@fractal-solutions/qflow/nodes';\n\nconst getNode = new HttpRequestNode();\ngetNode.setParams({ url: 'https://api.publicapis.org/entries' });\n\ngetNode.postAsync = async (shared, _, result) => {\n    console.log('Found ' + result.body.count + ' entries.');\n};\n\nconst flow = new AsyncFlow(getNode);\nawait flow.runAsync();`;


    const renderContent = () => {
        const topic = topics[activeTopic];
        if (!topic) return null;

        return (
            <div>
                <h1 className="text-4xl font-bold text-white font-orbitron mb-8">{topic.title}</h1>
                <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: topic.content }} />
                {activeTopic === 'node-shellcommand' && <CodeBlock code={shellExample} title="ShellCommandNode Example" language="js" />}
                {activeTopic === 'node-httprequest' && <CodeBlock code={httpExample} title="HttpRequestNode Example" language="js" />}
            </div>
        );
    };

    const SidebarLink = ({ topicId, children }) => (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); setActiveTopic(topicId); }}
            className={`block px-4 py-2 rounded-md transition-colors ${activeTopic === topicId ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
        >
            {children}
        </a>
    );

    return (
        <div className="container mx-auto px-6 py-12">
            <div className="grid md:grid-cols-12 gap-8">
                <aside className="md:col-span-3">
                    <div className="sticky top-24">
                        <h3 className="text-lg font-bold text-cyan-400 font-orbitron mb-4">Documentation</h3>
                        <nav className="space-y-2">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-4 px-4">Core</h4>
                            <SidebarLink topicId="core-concepts">Core Concepts</SidebarLink>
                            <SidebarLink topicId="agent-architecture">Agent Architecture</SidebarLink>

                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-6 px-4">Node Reference</h4>
                            <SidebarLink topicId="node-shellcommand">ShellCommandNode</SidebarLink>
                            <SidebarLink topicId="node-httprequest">HttpRequestNode</SidebarLink>
                        </nav>
                    </div>
                </aside>
                <main className="md:col-span-9">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
