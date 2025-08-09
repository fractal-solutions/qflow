import { AsyncFlow } from '@fractal-solutions/qflow';
import { InteractiveInputNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running InteractiveInputNode Example ---');

  const inputNode = new InteractiveInputNode();
  inputNode.setParams({
    prompt: 'Please enter your name:',
    title: 'User Information',
    defaultValue: 'John Doe'
  });

  const flow = new AsyncFlow(inputNode);
  try {
    const result = await flow.runAsync({});
    console.log('User entered:', result);
    console.log('Interactive input workflow finished.');
  } catch (error) {
    console.error('Interactive input Workflow Failed:', error);
  }
})();
