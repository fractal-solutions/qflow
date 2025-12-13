
import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { InteractiveWebviewNode } from '../src/nodes/interactive_webview.js';

async function runLightTheme() {
  console.log('--- Running Light Theme Demo ---');

  const showDialog = new InteractiveWebviewNode();
  showDialog.setParams({
    mode: 'dialog',
    message: 'What is your favorite color?',
    options: ['Red', 'Green', 'Blue'],
    title: 'Color Picker',
    theme: 'light',
    width: 500,
    height: 300,
  });

  const askForName = new InteractiveWebviewNode();
  askForName.setParams({
    mode: 'input',
    prompt: 'Please enter your name:',
    title: 'Name Input',
    theme: 'light',
    width: 500,
    height: 300,
  });

  const showNotification = new InteractiveWebviewNode();

  class ProcessResultsNode extends AsyncNode {
    async execAsync(prepRes, shared) {
      console.log('--- Light Theme Results ---');
      console.log('Favorite Color:', shared.color);
      console.log('User Name:', shared.name);
      console.log('---------------------------');

      showNotification.setParams({
        mode: 'notification',
        message: `Hello, ${shared.name}! Your favorite color is ${shared.color}.`,
        title: 'Summary',
        theme: 'light',
        width: 500,
        height: 300,
      });
      return 'default';
    }
  }
  const processResults = new ProcessResultsNode();

  showDialog.next(askForName);
  askForName.next(processResults);
  processResults.next(showNotification);

  const flow = new AsyncFlow(showDialog);

  showDialog.postAsync = async (shared, _, execRes) => { shared.color = execRes; return 'default'; };
  askForName.postAsync = async (shared, _, execRes) => { shared.name = execRes; return 'default'; };

  await flow.runAsync({});
  console.log('Light theme flow finished.');
}

async function runDarkTheme() {
  console.log('\n--- Running Dark Theme (Futuristic) Demo ---');

  const showDialog = new InteractiveWebviewNode();
  showDialog.setParams({
    mode: 'dialog',
    message: 'Select target system:',
    options: ['Orion', 'Cygnus', 'Lyra'],
    title: 'System Access',
    theme: 'dark',
    width: 500,
    height: 300,
  });

  const askForPassword = new InteractiveWebviewNode();
  askForPassword.setParams({
    mode: 'input',
    prompt: 'Enter Passcode:',
    title: 'Authentication Required',
    theme: 'dark',
    width: 500,
    height: 300,
  });

  const showNotification = new InteractiveWebviewNode();

  class ProcessResultsNode extends AsyncNode {
    async execAsync(prepRes, shared) {
      console.log('--- Dark Theme Results ---');
      console.log('Target System:', shared.system);
      console.log('Entered Passcode:', shared.passcode);
      console.log('--------------------------');

      showNotification.setParams({
        mode: 'notification',
        message: `Accessing ${shared.system}... Authentication successful.`,
        title: 'Connection Established',
        theme: 'dark',
        width: 500,
        height: 300,
      });
      return 'default';
    }
  }
  const processResults = new ProcessResultsNode();

  showDialog.next(askForPassword);
  askForPassword.next(processResults);
  processResults.next(showNotification);

  const flow = new AsyncFlow(showDialog);

  showDialog.postAsync = async (shared, _, execRes) => { shared.system = execRes; return 'default'; };
  askForPassword.postAsync = async (shared, _, execRes) => { shared.passcode = execRes; return 'default'; };

  await flow.runAsync({});
  console.log('Dark theme flow finished.');
}

// --- Main Execution ---
// You can comment out one of these to run a specific demo.
await runLightTheme();
await runDarkTheme();
