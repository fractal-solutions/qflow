### 14. Code Interpreter Example

Executing Python code within the workflow.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { CodeInterpreterNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  const pythonCode = `
print("Hello from the Code Interpreter!")
result = 10 + 20
print(f"The sum is: {result}")
`;

  const codeInterpreter = new CodeInterpreterNode();
  codeInterpreter.setParams({
    code: pythonCode,
    timeout: 5000, // Max 5 seconds for execution
    requireConfirmation: false // Set to false to bypass user confirmation
  });

  codeInterpreter.postAsync = async (shared, prepRes, execRes) => {
    console.log('--- Code Interpreter Output ---');
    console.log('Stdout:', execRes.stdout);
    console.log('Stderr:', execRes.stderr);
    console.log('Exit Code:', execRes.exitCode);
    return 'default';
  };

  const flow = new AsyncFlow(codeInterpreter);
  try {
    await flow.runAsync({});
  } catch (error) {
    console.error('Code Interpreter Flow Failed:', error);
  }
})();
```