## ListDirectoryNode

The `ListDirectoryNode` lists the files and subdirectories within a specified directory.

### Parameters

*   `directoryPath`: The absolute path to the directory to list.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { ListDirectoryNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running ListDirectoryNode Example ---');

  const listDir = new ListDirectoryNode();
  listDir.setParams({
    directoryPath: '.' // List current directory
  });

  const listDirFlow = new AsyncFlow(listDir);

  try {
    const result = await listDirFlow.runAsync({});
    console.log('--- Directory Listing Result ---');
    console.log(result);
    console.log('--- Workflow Finished ---');
  } catch (error) {
    console.error('--- Workflow Failed ---', error);
  }
})();
```
