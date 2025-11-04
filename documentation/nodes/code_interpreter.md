## CodeInterpreterNode

The `CodeInterpreterNode` executes Python code snippets.

### Parameters

*   `code`: The Python code snippet to execute.
*   `timeout`: Maximum execution time in milliseconds.
*   `args`: Command-line arguments to pass to the script.
*   `requireConfirmation`: If true, the user will be prompted for confirmation before executing the code.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { CodeInterpreterNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running Python CodeInterpreterNode Test Workflow ---');

  // --- Test 1: Simple Python Execution ---
  console.log('\n--- Test 1: Simple Python Execution ---');
  const pythonCode = `
print("Hello from Python!")
`;

  const pythonInterpreterNode = new CodeInterpreterNode();
  pythonInterpreterNode.setParams({
    code: pythonCode,
    timeout: 5000, // 5 seconds timeout
    requireConfirmation: true
  });

  pythonInterpreterNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Python Execution Result:');
    console.log('  Stdout:', execRes.stdout);
    console.log('  Stderr:', execRes.stderr);
    console.log('  Exit Code:', execRes.exitCode);
    if (execRes.stdout.includes("Hello from Python!") && execRes.exitCode === 0) {
      console.log('Test 1 Passed: Python output as expected.');
    } else {
      console.error('Test 1 Failed: Unexpected Python output or non-zero exit code.');
    }
    return 'default';
  };

  const pythonFlow = new AsyncFlow(pythonInterpreterNode);
  try {
    await pythonFlow.runAsync({});
  } catch (error) {
    console.error('Test 1 Failed: Python Execution Flow Failed:', error);
  }
})();
```
