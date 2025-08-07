import { AsyncFlow } from '../src/qflow.js';
import { TransformNode } from '../src/nodes';

(async () => {
  console.log('--- Running TransformNode Test Workflow ---');

  // --- Test 1: Simple Array Transformation (Map) ---
  console.log('\n--- Test 1: Array Map ---');
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
    if (JSON.stringify(result) === JSON.stringify([2, 4, 6, 8, 10])) {
      console.log('Test 1 Passed: Array map transformation successful.');
    } else {
      console.error('Test 1 Failed: Array map transformation failed.');
    }
  } catch (error) {
    console.error('Test 1 Failed: Array Map Flow Failed:', error);
  }

  // --- Test 2: Object Transformation (Add Property) ---
  console.log('\n--- Test 2: Object Transformation ---');
  const objectInput = { name: 'Alice', age: 30 };
  const transformObjectNode = new TransformNode();
  transformObjectNode.setParams({
    input: objectInput,
    transformFunction: '(data) => ({ ...data, status: \'active\' })'
  });

  const transformObjectFlow = new AsyncFlow(transformObjectNode);
  try {
    const result = await transformObjectFlow.runAsync({});
    console.log('Transformed Object:', result);
    if (JSON.stringify(result) === JSON.stringify({ name: 'Alice', age: 30, status: 'active' })) {
      console.log('Test 2 Passed: Object transformation successful.');
    } else {
      console.error('Test 2 Failed: Object transformation failed.');
    }
  } catch (error) {
    console.error('Test 2 Failed: Object Transformation Flow Failed:', error);
  }

  // --- Test 3: Filtering an Array of Objects ---
  console.log('\n--- Test 3: Array Filter ---');
  const usersInput = [
    { id: 1, name: 'Bob', active: true },
    { id: 2, name: 'Charlie', active: false },
    { id: 3, name: 'David', active: true }
  ];
  const transformFilterNode = new TransformNode();
  transformFilterNode.setParams({
    input: usersInput,
    transformFunction: '(data) => data.filter(user => user.active)'
  });

  const transformFilterFlow = new AsyncFlow(transformFilterNode);
  try {
    const result = await transformFilterFlow.runAsync({});
    console.log('Transformed Array (Filter):', result);
    if (result.length === 2 && result[0].name === 'Bob' && result[1].name === 'David') {
      console.log('Test 3 Passed: Array filter transformation successful.');
    } else {
      console.error('Test 3 Failed: Array filter transformation failed.');
    }
  } catch (error) {
    console.error('Test 3 Failed: Array Filter Flow Failed:', error);
  }

  // --- Test 4: Chaining Transformations (using shared state) ---
  console.log('\n--- Test 4: Chaining Transformations ---');
  const initialData = [
    { product: 'Laptop', price: 1200, quantity: 1 },
    { product: 'Mouse', price: 25, quantity: 5 },
    { product: 'Keyboard', price: 75, quantity: 2 }
  ];

  const calculateTotalNode = new TransformNode();
  calculateTotalNode.setParams({
    input: initialData,
    transformFunction: '(data) => data.map(item => ({ ...item, total: item.price * item.quantity }))'
  });
  // The postAsync of the first node will put its result into shared.transformedData
  // The second node will then use that as its input.
  calculateTotalNode.postAsync = async (shared, prepRes, execRes) => {
    shared.transformedData = execRes; // Ensure data is passed to next node
    return 'default';
  };

  const filterExpensiveNode = new TransformNode();
  // Override prepAsync to get input from shared state
  filterExpensiveNode.prepAsync = async (shared) => {
    filterExpensiveNode.setParams({ 
      input: shared.transformedData,
      transformFunction: '(data) => data.filter(item => item.total > 100)' 
     });
  };

  filterExpensiveNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Chained Transformation Result:', execRes);
    if (execRes.length === 3 && execRes[0].product === 'Laptop' && execRes[1].product === 'Mouse' && execRes[2].product === 'Keyboard') {
      console.log('Test 4 Passed: Chained transformations successful.');
    } else {
      console.error('Test 4 Failed: Chained transformations failed.');
    }
    return 'default';
  };

  calculateTotalNode.next(filterExpensiveNode);
  const chainedFlow = new AsyncFlow(calculateTotalNode);
  
  try {
    await chainedFlow.runAsync({});
  } catch (error) {
    console.error('Test 4 Failed: Chained Transformations Flow Failed:', error);
  }

  console.log('\n--- TransformNode Test Workflow Finished ---');
})();