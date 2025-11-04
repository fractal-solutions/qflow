## AgentNode

The `AgentNode` is the core of agentic behavior in qflow. It orchestrates tools and LLM reasoning to achieve complex goals.

### Parameters

*   `goal`: The high-level goal for the agent to achieve.
*   `llm`: The LLM node to use for reasoning.
*   `tools`: An object mapping tool names to their corresponding node instances.
