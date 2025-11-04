## SubFlowNode

The `SubFlowNode` executes a sub-flow.

### Parameters

*   `flow`: The name of the flow to execute, as registered in the flow registry.
*   `shared`: The shared object to pass to the sub-flow.

### Example Usage

```javascript
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { SubFlowNode } from '@fractal-solutions/qflow/nodes';

// Define a simple sub-flow
class MySubNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    const input = shared.input || 0;
    const result = input * 2;
    console.log(`  [SubFlow] Received input: ${input}, Produced result: ${result}`);
    return result;
  }
}
const mySubFlow = new AsyncFlow(new MySubNode());

(async () => {
  console.log('--- Running SubFlowNode Example ---');

  // Register the sub-flow (this would typically be done in a central registry)
  const flowRegistry = {
    'MySubFlow': mySubFlow
  };

  const subFlowNode = new SubFlowNode();
  subFlowNode.setParams({
    flow: flowRegistry['MySubFlow'], // Pass the sub-flow instance
    shared: { input: 10 } // Pass initial data to the sub-flow
  });

  const mainFlow = new AsyncFlow(subFlowNode);

  try {
    const result = await mainFlow.runAsync({});
    console.log('\n--- SubFlowNode Example Finished ---');
    console.log('Result from sub-flow execution:', result);
  } catch (error) {
    console.error('\n--- SubFlowNode Example Failed ---', error);
  }
})();
```
