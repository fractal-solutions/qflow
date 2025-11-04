## GitNode

The `GitNode` performs Git operations like clone, add, commit, and push.

### Parameters

*   `action`: The Git action to perform.
*   `repoPath`: The local path to the repository.
*   `remoteUrl`: The URL of the remote repository (for 'clone' action).
*   `files`: An array of file paths to add to the staging area (for 'add' action).
*   `message`: The commit message (for 'commit' action).
*   `branch`: The branch to push to or pull from.
*   `remote`: The name of the remote (e.g., 'origin').

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { GitNode, WriteFileNode, ShellCommandNode } from '@fractal-solutions/qflow/nodes';
import path from 'path';

(async () => {
  console.log('--- Running Git Test Workflow ---');

  const localPath = './git_test_repo';
  const newFilePath = path.join(localPath, 'new-file.txt');

  // 1. Create the directory for the repository
  const makeDir = new ShellCommandNode();
  makeDir.setParams({
    command: `mkdir -p ${localPath}`,
  });

  // 2. Initialize a new Git repository
  const initRepo = new GitNode();
  initRepo.setParams({
    action: 'init',
    repoPath: localPath,
  });

  // 3. Create a new file in the repository
  const writeFile = new WriteFileNode();
  writeFile.setParams({
    filePath: newFilePath,
    content: 'Hello from qflow GitNode!',
  });

  // 4. Add the new file to staging
  const addFile = new GitNode();
  addFile.setParams({
    action: 'add',
    repoPath: localPath,
    files: ['new-file.txt'],
  });

  // 5. Commit the change
  const commitChange = new GitNode();
  commitChange.setParams({
    action: 'commit',
    repoPath: localPath,
    message: 'feat: Add new file via qflow agent',
  });

  // 6. Get the status of the repository
  const getStatus = new GitNode();
  getStatus.setParams({
    action: 'status',
    repoPath: localPath,
  });

  // Chain the nodes
  makeDir.next(initRepo);
  initRepo.next(writeFile);
  writeFile.next(addFile);
  addFile.next(commitChange);
  commitChange.next(getStatus);

  // Create and run the flow
  const gitFlow = new AsyncFlow(makeDir);

  try {
    const finalResult = await gitFlow.runAsync({});
    console.log('Git workflow finished successfully.');
    console.log('Final Status:', finalResult);
  } catch (error) {
    console.error('Git workflow failed:', error);
  }
})();
```
