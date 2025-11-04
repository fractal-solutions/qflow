### 8. Shell Command Example

Executing a shell command and printing the output.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { ShellCommandNode } from '@fractal-solutions/qflow/nodes';

const listFiles = new ShellCommandNode();
listFiles.setParams({ command: 'ls -l' });

listFiles.postAsync = async (shared, prepRes, execRes) => {
  console.log('--- File Listing ---');
  console.log(execRes.stdout);
  return 'default';
};

const flow = new AsyncFlow(listFiles);
await flow.runAsync({});
```