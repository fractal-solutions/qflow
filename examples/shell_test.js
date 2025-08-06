
import { AsyncFlow } from '../src/qflow.js';
import { ShellCommandNode } from '../src/nodes/shell.js';

// Helper subclass to log output of each command
class LoggingShellCommandNode extends ShellCommandNode {
  async postAsync(shared, prepRes, execRes) {
    console.log('--- Command Output ---');
    console.log(execRes.stdout);
    if (execRes.stderr) {
      console.error('--- Command Error ---');
      console.error(execRes.stderr);
    }
    return super.postAsync(shared, prepRes, execRes);
  }
}

(async () => {
  console.log('--- Running Shell Command Test Workflow ---');

  // 1. Simple echo command
  const simpleEcho = new ShellCommandNode();
  simpleEcho.setParams({ command: "echo 'Hello from qflow!'" });

  // 2. Piped command using sed
  const pipedCommand = new LoggingShellCommandNode();
  pipedCommand.setParams({ command: "echo 'qflow is great' | sed 's/great/awesome/'" });

  // 3. List files and count them
  const listAndCount = new LoggingShellCommandNode();
  listAndCount.setParams({ command: "ls -l | wc -l" });

  // 4. Create a directory and a file within it
  const createDirAndFile = new LoggingShellCommandNode();
  createDirAndFile.setParams({ command: "mkdir -p test_dir && echo 'This is a test file.' > test_dir/test_file.txt" });

  // 5. Read the file created in the previous step
  const readFile = new LoggingShellCommandNode();
  readFile.setParams({ command: "cat test_dir/test_file.txt" });

  // Chain the nodes together
  simpleEcho.next(pipedCommand);
  pipedCommand.next(listAndCount);
  listAndCount.next(createDirAndFile);
  createDirAndFile.next(readFile);

  const shellFlow = new AsyncFlow(simpleEcho);

  try {
    const result = await shellFlow.runAsync({});
    console.log('--- Shell Command Test Workflow Finished ---');
    console.log('Final Result of the last command:', result);
  } catch (error) {
    console.error('--- Shell Command Test Workflow Failed ---', error);
  }
})();
