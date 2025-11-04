## DuckDuckGoSearchNode

The `DuckDuckGoSearchNode` performs a web search using DuckDuckGo.

### Parameters

*   `query`: The search query.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DuckDuckGoSearchNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  // --- Test 1: DuckDuckGoSearchNode (No API Key Needed) ---
  console.log('--- Running DuckDuckGo Search Test ---');
  const ddgNode = new DuckDuckGoSearchNode();
  ddgNode.setParams({ query: 'What is qflow?' });

  ddgNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('\n--- DuckDuckGo Search Results ---');
    console.log(execRes.slice(0, 5)); // Log top 5 results
    console.log('----------------------------\n');
    return 'default';
  };

  const ddgFlow = new AsyncFlow(ddgNode);
  try {
    await ddgFlow.runAsync({});
    console.log('--- DuckDuckGo Search Test Finished ---');
  } catch (error) {
    console.error('--- DuckDuckGo Search Test Failed ---', error);
  }
})();
```
