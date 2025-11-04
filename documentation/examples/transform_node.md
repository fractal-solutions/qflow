### 16. Transform Node

Dynamically transforming data using custom JavaScript functions.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { TransformNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running TransformNode Example ---');

  // Example 1: Map an array of numbers
  const numbers = [1, 2, 3];
  const doubleNumbers = new TransformNode();
  doubleNumbers.setParams({
    input: numbers,
    transformFunction: '(data) => data.map(x => x * 2)'
  });

  const flow1 = new AsyncFlow(doubleNumbers);
  try {
    const result = await flow1.runAsync({});
    console.log('Doubled Numbers:', result); // Expected: [2, 4, 6]
  } catch (error) {
    console.error('Transform Flow 1 Failed:', error);
  }

  // Example 2: Filter an array of objects
  const users = [
    { name: 'Alice', active: true },
    { name: 'Bob', active: false },
    { name: 'Charlie', active: true }
  ];
  const activeUsers = new TransformNode();
  activeUsers.setParams({
    input: users,
    transformFunction: '(data) => data.filter(user => user.active)'
  });

  const flow2 = new AsyncFlow(activeUsers);
  try {
    const result = await flow2.runAsync({});
    console.log('Active Users:', result); // Expected: [{ name: 'Alice', active: true }, { name: 'Charlie', active: true }]
  } catch (error) {
    console.error('Transform Flow 2 Failed:', error);
  }

  // Example 3: Extract a specific property from an object
  const product = { id: 1, name: 'Laptop', price: 1200 };
  const productName = new TransformNode();
  productName.setParams({
    input: product,
    transformFunction: '(data) => data.name'
  });

  const flow3 = new AsyncFlow(productName);
  try {
    const result = await flow3.runAsync({});
    console.log('Product Name:', result); // Expected: 'Laptop'
  } catch (error) {
    console.error('Transform Flow 3 Failed:', error);
}

  console.log('\n--- TransformNode Example Finished ---');
})();
```