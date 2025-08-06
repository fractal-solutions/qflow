
import { AsyncFlow } from '../src/qflow.js';
import { ShellCommandNode } from '../src/nodes/shell.js';

(async () => {
  console.log('--- Running Shell Command Test Workflow ---');

  // 1. Simple echo command
  const simpleEcho = new ShellCommandNode();
  simpleEcho.setParams({ command: "echo 'Hello from qflow!'" });
  simpleEcho.postAsync = async (shared, prepRes, execRes) => {
    console.log(execRes.stdout.trim());
    return 'default';
  };

  // 2. Piped command using sed
  const pipedCommand = new ShellCommandNode();
  pipedCommand.setParams({ command: "echo 'qflow is great' | sed 's/great/awesome/'" });
  pipedCommand.postAsync = async (shared, prepRes, execRes) => {
    console.log(execRes.stdout.trim());
    return 'default';
  };

  // 3. List files and count them
  const listAndCount = new ShellCommandNode();
  listAndCount.setParams({ command: "ls -l | wc -l" });
  listAndCount.postAsync = async (shared, prepRes, execRes) => {
    console.log(`File count: ${execRes.stdout.trim()}`);
    return 'default';
  };

  // 4. Create a directory and a file within it
  const createDirAndFile = new ShellCommandNode();
  createDirAndFile.setParams({ command: "mkdir -p test_dir && echo 'This is a test file.' > test_dir/test_file.txt" });
  createDirAndFile.postAsync = async (shared, prepRes, execRes) => {
    console.log('Created directory and file.');
    return 'default';
  };

  // 5. Read the file created in the previous step
  const readFile = new ShellCommandNode();
  readFile.setParams({ command: "cat test_dir/test_file.txt" });
  readFile.postAsync = async (shared, prepRes, execRes) => {
    console.log(`File content: ${execRes.stdout.trim()}`);
    return 'default';
  };

  // Chain the nodes together
  simpleEcho.next(pipedCommand);
  pipedCommand.next(listAndCount);
  listAndCount.next(createDirAndFile);
  createDirAndFile.next(readFile);

  const shellFlow = new AsyncFlow(simpleEcho);

  try {
    await shellFlow.runAsync({});
    console.log('\n--- Shell Command Test Workflow Finished ---');
  } catch (error) {
    console.error('\n--- Shell Command Test Workflow Failed ---');
  }
})();
