import { AsyncFlow } from '../src/qflow.js';
import {
  ReadFileNode,
  WriteFileNode,
  AppendFileNode,
  ListDirectoryNode
} from '../src/nodes/filesystem.js';

(async () => {
  console.log('--- Running File System Test Workflow ---');

  const writeFile = new WriteFileNode();
  writeFile.setParams({
    filePath: './test.txt',
    content: 'Hello, qflow!'
  });

  const appendFile = new AppendFileNode();
  appendFile.setParams({
    filePath: './test.txt',
    content: '\nThis is a new line.'
  });

  const readFile = new ReadFileNode();
  readFile.setParams({
    filePath: './test.txt'
  });

  const listDir = new ListDirectoryNode();
  listDir.setParams({
    directoryPath: '.'
  });

  writeFile.next(appendFile);
  appendFile.next(readFile);
  readFile.next(listDir);

  const fileSystemFlow = new AsyncFlow(writeFile);

  try {
    const result = await fileSystemFlow.runAsync({});
    console.log('--- File System Test Workflow Finished ---');
    console.log('Final Result:', result);
  } catch (error) {
    console.error('--- File System Test Workflow Failed ---', error);
  }
})();
