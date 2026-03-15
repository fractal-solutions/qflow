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
                 <CodeBlock code={installCode} />
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
                    <div className="max-w-2xl mx-auto">
                        <CodeBlock code={featureCode} />
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
