
import { AsyncFlow } from '../src/qflow.js';
import { UserInputNode } from '../src/nodes/user.js';
import { ShellCommandNode } from '../src/nodes/shell.js';

(async () => {
  console.log('--- Running User Input Test Workflow ---');

  const getUserName = new UserInputNode();
  getUserName.setParams({ prompt: 'What is your name? ' });

  const sayHello = new ShellCommandNode();
  sayHello.prepAsync = async (shared) => {
    sayHello.setParams({ command: `echo "Hello, ${shared.userInput}!"` });
  };
  sayHello.postAsync = async (shared, prepRes, execRes) => {
    console.log(execRes.stdout.trim());
    return 'default';
  };

  getUserName.next(sayHello);

  const flow = new AsyncFlow(getUserName);

  try {
    await flow.runAsync({});
    console.log('--- User Input Test Workflow Finished ---');
  } catch (error) {
    console.error('--- User Input Test Workflow Failed ---', error);
  }
})();
