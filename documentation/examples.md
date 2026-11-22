## qflow 2.0 End-to-End Examples

These examples compose the new node families around production problems rather than single APIs. Run `bun run examples:v2` from the repo root, or see [examples/v2/README.md](../examples/v2/README.md) for details.

*   [Replay-safe checkout](../examples/v2/replay-safe-checkout.js) — durable side effects, replay after a crash, and uncertain reservations
*   [Unified tool contract](../examples/v2/unified-tool-contract.js) — one `ToolSpec` for agent, MCP, LLM schemas and docs
*   [Dataflow regression loop](../examples/v2/dataflow-eval-regression.js) — contracts, routing, trace replay and eval suites
*   [Bun stream ingest](../examples/v2/bun-stream-ingest.js) — spawn, Web Streams, SQLite and file watching

## Basic Usage & Examples

*   [1. Simple Node](examples/simple_node.md)
*   [2. Simple Flow](examples/simple_flow.md)
*   [3. Conditional Flow](examples/conditional_flow.md)
*   [4. Asynchronous Flow](examples/asynchronous_flow.md)
*   [5. Batch Processing](examples/batch_processing.md)
*   [6. Retry Mechanism](examples/retry_mechanism.md)
*   [7. Inter-Node Communication with Shared State (Advanced Example)](examples/inter_node_communication.md)
*   [8. Shell Command Example](examples/shell_command.md)
*   [9. File System Example](examples/file_system.md)
*   [10. Generic HTTP Request Example](examples/http_request.md)
*   [11. Web Search Example](examples/web_search.md)
*   [12. Interactive Agent Example](examples/interactive_agent.md)
*   [13. Data Extraction Example](examples/data_extraction.md)
*   [14. Code Interpreter Example](examples/code_interpreter.md)
*   [15. Memory Node (Lightweight RAG)](examples/memory_node.md)
*   [16. Transform Node](examples/transform_node.md)
*   [17. Plotting Data with Python Code Interpreter](examples/plotting_data.md)
*   [18. Embedding Node](examples/embedding_node.md)
*   [19. Semantic Memory Node](examples/semantic_memory_node.md)