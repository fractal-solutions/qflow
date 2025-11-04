## TransformNode

The `TransformNode` transforms input data using a provided JavaScript function.

### Parameters

*   `input`: The data to be transformed.
*   `transformFunction`: A JavaScript function string that takes 'data' as an argument and returns the transformed result.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { TransformNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running TransformNode Example ---');

  // --- Example: Simple Array Transformation (Map) ---
  console.log('\n--- Array Map ---');
  const arrayInput = [1, 2, 3, 4, 5];
  const transformMapNode = new TransformNode();
  transformMapNode.setParams({
    input: arrayInput,
    transformFunction: '(data) => data.map(x => x * 2)'
  });

  const transformMapFlow = new AsyncFlow(transformMapNode);
  try {
    const result = await transformMapFlow.runAsync({});
    console.log('Transformed Array (Map):', result);
  } catch (error) {
    console.error('Array Map Flow Failed:', error);
  }

  console.log('\n--- TransformNode Example Finished ---');
})();
```
