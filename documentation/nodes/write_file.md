## WriteFileNode

The `WriteFileNode` writes content to a specified file.

### Parameters

*   `filePath`: The absolute path to the file to write to.
*   `content`: The content to write to the file.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { WriteFileNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running WriteFileNode Example ---');

  const writeFile = new WriteFileNode();
  writeFile.setParams({
    filePath: './output.txt',
    content: 'Hello, qflow! This is a test file.'
  });

  const writeFlow = new AsyncFlow(writeFile);

  try {
    const result = await writeFlow.runAsync({});
    console.log('--- WriteFileNode Result ---');
    console.log(result);
    console.log('--- Workflow Finished ---');
  } catch (error) {
    console.error('--- Workflow Failed ---', error);
  }
})();
```
