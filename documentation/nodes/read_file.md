## ReadFileNode

The `ReadFileNode` reads the content of a specified file.

### Parameters

*   `filePath`: The absolute path to the file to read.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { ReadFileNode, WriteFileNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running ReadFileNode Example ---');

  // First, create a dummy file to read
  const writeFile = new WriteFileNode();
  writeFile.setParams({
    filePath: './temp_read_test.txt',
    content: 'This is a test file for ReadFileNode.'
  });

  // Then, read the content of the dummy file
  const readFile = new ReadFileNode();
  readFile.setParams({
    filePath: './temp_read_test.txt'
  });

  writeFile.next(readFile);

  const readFlow = new AsyncFlow(writeFile);

  try {
    const result = await readFlow.runAsync({});
    console.log('--- ReadFileNode Result ---');
    console.log(result);
    console.log('--- Workflow Finished ---');
  } catch (error) {
    console.error('--- Workflow Failed ---', error);
  }
})();
```
