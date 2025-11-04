### 9. File System Example

Writing to a file and then reading it back.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { WriteFileNode, ReadFileNode } from '@fractal-solutions/qflow/nodes';

const writeFile = new WriteFileNode();
writeFile.setParams({ filePath: './hello.txt', content: 'Hello, qflow!\n' });

const readFile = new ReadFileNode();
readFile.setParams({ filePath: './hello.txt' });

readFile.postAsync = async (shared, prepRes, execRes) => {
  console.log('--- File Content ---');
  console.log(execRes);
  return 'default';
};

writeFile.next(readFile);

const flow = new AsyncFlow(writeFile);
await flow.runAsync({});
```
