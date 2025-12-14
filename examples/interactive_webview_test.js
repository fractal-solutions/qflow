
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

async function runLongFormatTest() {
  console.log('\n--- Running Long Format Test Demo ---');

  const chooseLanguage = new InteractiveWebviewNode();
  chooseLanguage.setParams({
    mode: 'dialog',
    message: 'Please select your preferred programming language from the list below. This choice will influence future interactions and code generation tasks.',
    options: [
      'JavaScript', 'Python', 'Java', 'C#', 'Go', 'Ruby', 'PHP', 'TypeScript',
      'Swift', 'Kotlin', 'Rust', 'C++', 'Shell', 'SQL', 'HTML', 'CSS',
      'R', 'MATLAB', 'Scala', 'Perl', 'Haskell', 'Dart', 'Lua', 'Groovy'
    ],
    title: 'Programming Language Selection',
    theme: 'light',
    width: 600,
    height: 480,
  });

  const enterProjectDescription = new InteractiveWebviewNode();
  enterProjectDescription.setParams({
    mode: 'input',
    prompt: 'Please provide a detailed description of your current project. Include its purpose, key features, and any specific technologies you are using. (Multi-line input expected)',
    title: 'Project Description Input',
    theme: 'dark',
    width: 700,
    height: 500,
    multilineInput: true, // Enable multi-line input
  });

  const showSummaryNotification = new InteractiveWebviewNode();

  class ProcessLongFormatResultsNode extends AsyncNode {
    async execAsync(prepRes, shared) {
      console.log('--- Long Format Test Results ---');
      console.log('Selected Language:', shared.language);
      console.log('Project Description:', shared.projectDescription);
      console.log('--------------------------------');

      const summaryMessage = `
        Thank you for providing the details!

        Selected Programming Language: ${shared.language}

        Project Description:
        --------------------
        ${shared.projectDescription}
        --------------------

        We have successfully captured your preferences and project context.
        You can now proceed with your tasks, and we will tailor our assistance accordingly.
      `;

      showSummaryNotification.setParams({
        mode: 'notification',
        message: summaryMessage,
        title: 'Detailed Project Summary',
        theme: 'light',
        width: 700,
        height: 550,
      });
      return 'default';
    }
  }
  const processLongFormatResults = new ProcessLongFormatResultsNode();

  chooseLanguage.next(enterProjectDescription);
  enterProjectDescription.next(processLongFormatResults);
  processLongFormatResults.next(showSummaryNotification);

  const flow = new AsyncFlow(chooseLanguage);

  chooseLanguage.postAsync = async (shared, _, execRes) => { shared.language = execRes; return 'default'; };
  enterProjectDescription.postAsync = async (shared, _, execRes) => { shared.projectDescription = execRes; return 'default'; };

  await flow.runAsync({});
  console.log('Long format test flow finished.');
}

// --- Main Execution ---
// You can comment out one of these to run a specific demo.
await runLightTheme();
await runDarkTheme();
await runLongFormatTest();
