## ShellCommandNode

The `ShellCommandNode` executes shell commands.

### Parameters

*   `command`: The full shell command to execute (e.g., 'ls -l', 'npm install cheerio').

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { ShellCommandNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running Shell Command Test Workflow ---');

  // 1. Simple echo command
  const simpleEcho = new ShellCommandNode();
  simpleEcho.setParams({ command: "echo 'Hello from qflow!'" });
  simpleEcho.postAsync = async (shared, prepRes, execRes) => {
    console.log(execRes.stdout.trim());
    return 'default';
  };

  const shellFlow = new AsyncFlow(simpleEcho);

  try {
    await shellFlow.runAsync({});
    console.log('\n--- Shell Command Test Workflow Finished ---');
  } catch (error) {
    console.error('\n--- Shell Command Test Workflow Failed ---', error);
  }
})();
```
