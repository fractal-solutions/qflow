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

    const shellExample = `import { AsyncFlow } from '@fractal-solutions/qflow';
import { ShellCommandNode } from '@fractal-solutions/qflow/nodes';

const listFiles = new ShellCommandNode();
listFiles.setParams({ command: 'ls -la' });

listFiles.postAsync = async (shared, _, result) => {
    console.log(result.stdout);
};

const flow = new AsyncFlow(listFiles);
await flow.runAsync();`;

    const httpExample = `import { AsyncFlow } from '@fractal-solutions/qflow';
import { HttpRequestNode } from '@fractal-solutions/qflow/nodes';

const getNode = new HttpRequestNode();
getNode.setParams({ url: 'https://api.publicapis.org/entries' });

getNode.postAsync = async (shared, _, result) => {
    console.log(`Found ${result.body.count} entries.`);
};

const flow = new AsyncFlow(getNode);
await flow.runAsync();`;


    const renderContent = () => {
        const topic = topics[activeTopic];
        if (!topic) return null;

        return (
            <div>
                <h1 className="text-4xl font-bold text-white font-orbitron mb-8">{topic.title}</h1>
                <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: topic.content }} />
                {activeTopic === 'node-shellcommand' && <CodeBlock code={shellExample} />}
                {activeTopic === 'node-httprequest' && <CodeBlock code={httpExample} />}
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