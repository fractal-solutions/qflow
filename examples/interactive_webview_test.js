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
        Thank you for providing the details!\n\n        Selected Programming Language: ${shared.language}\n\n        Project Description:\n        --------------------\n        ${shared.projectDescription}\n        --------------------\n\n        We have successfully captured your preferences and project context.\n        You can now proceed with your tasks, and we will tailor our assistance accordingly.\n      `;

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

async function runCustomDialogTest() {
  console.log('\n--- Running Custom Dialog Test Demo (Elaborate Report) ---');

  const customDialog = new InteractiveWebviewNode();
  customDialog.setParams({
    mode: 'custom-dialog',
    title: 'Agent Report Summary',
    // Note: For complex content, ensure 'height' is sufficient or rely on scrolling.
    // The webview will automatically add scrollbars if content overflows.
    width: 800,
    height: 900, // Increased height for elaborate content
    html: `
      <style>
        .report-container {
          font-family: 'Orbitron', sans-serif;
          padding: 15px;
          background-color: #1a1a2e;
          color: #e0e0e0;
          border-radius: 8px;
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
          max-height: calc(100% - 50px); /* Account for buttons/padding */
          overflow-y: auto; /* Ensure scrolling for content */
        }
        h3 {
          color: #00ffff;
          border-bottom: 1px solid #00ffff;
          padding-bottom: 5px;
          margin-top: 20px;
        }
        .section-item {
          margin-bottom: 10px;
        }
        .section-item strong {
          color: #00ccff;
        }
        .status-indicator {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 5px;
        }
        .status-success { background-color: #00ff00; }
        .status-fail { background-color: #ff0000; }
        .status-pending { background-color: #ffff00; }
      </style>
      <div class="report-container">
        <h2 style="text-align: center; color: #00ffff;">Agent Task Completion Report</h2>
        <p style="text-align: center; font-size: 0.9em; color: #aaa;">Generated: ${new Date().toLocaleString()}</p>

        <h3>Task Overview</h3>
        <div class="section-item">
          <strong>Task ID:</strong> AGENT-7890
        </div>
        <div class="section-item">
          <strong>Agent Name:</strong> Qflow-Assistant-V2
        </div>
        <div class="section-item">
          <strong>Description:</strong> Analyze market trends for Q4 2025 and summarize key findings.
        </div>

        <h3>Execution Summary</h3>
        <div class="section-item">
          <strong>Start Time:</strong> 2025-12-14 09:00:00
        </div>
        <div class="section-item">
          <strong>End Time:</strong> 2025-12-14 11:30:15
        </div>
        <div class="section-item">
          <strong>Duration:</strong> 2 hours, 30 minutes, 15 seconds
        }
        <div class="section-item">
          <strong>Status:</strong> <span class="status-indicator status-success"></span> Completed Successfully
        </div>

        <h3>Key Findings</h3>
        <ul>
          <li>Market growth in AI sector exceeded projections by 15%.</li>
          <li>Increased consumer spending observed in sustainable tech.</li>
          <li>Emerging markets show strong potential for Q1 2026.</li>
        </ul>

        <h3>Recommendations</h3>
        <ol>
          <li>Allocate additional resources to AI research and development.</li>
          <li>Launch targeted marketing campaigns for sustainable products.</li>
          <li>Explore partnership opportunities in Southeast Asian markets.</li>
        </ol>

        <h3>Agent Logs (Excerpt)</h3>
        <pre style="background-color: #000; color: #0f0; padding: 10px; border-radius: 5px; font-size: 0.8em;">
          [INFO] Initializing market analysis module...
          [DEBUG] Fetching data from financial APIs...
          [INFO] Data aggregation complete. Processing 12,450 data points.
          [WARN] Minor data discrepancy detected in 'Consumer Goods' sector, resolved with interpolation.
          [INFO] Generating summary report...
          [SUCCESS] Task AGENT-7890 finished.
        </pre>

        <p style="margin-top: 20px; text-align: center; color: #aaa;">Review the report and select an action.</p>
      </div>
    `,
    options: ['Approve Report', 'Request Revisions', 'Discard'],
    theme: 'dark',
  });
  customDialog.postAsync = async (shared, _, execRes) => { shared.customDialogResult = execRes; return 'default'; };


  class ProcessCustomDialogResult extends AsyncNode {
    async execAsync(prepRes, shared) {
      console.log('--- Custom Dialog Results (Elaborate Report) ---');
      console.log('User Action on Report:', shared.customDialogResult);
      console.log('-------------------------------------------------');
      return 'default';
    }
  }
  const processResult = new ProcessCustomDialogResult();

  customDialog.next(processResult);

  const flow = new AsyncFlow(customDialog);
  
  await flow.runAsync({});
  console.log('Custom dialog test flow (elaborate report) finished.');
}

async function runCustomInputTest() {
  console.log('\n--- Running Custom Input Test Demo (Elaborate Feedback Form) ---');

  const customInput = new InteractiveWebviewNode();
  customInput.setParams({
    mode: 'custom-input',
    title: 'User Feedback Form',
    // Note: For complex content, ensure 'height' is sufficient or rely on scrolling.
    // The webview will automatically add scrollbars if content overflows.
    width: 700,
    height: 900, 
    multilineInput: true,
    theme: 'dark',
    html: `
      <style>
        /* Basic styling for the custom content to integrate with the dark theme */
        .feedback-container {
          padding: 15px;
          /* Background and text color will be inherited from the main theme */
          /* box-shadow can be kept if desired for a subtle effect */
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
          max-height: calc(100% - 50px); /* Account for buttons/padding */
          overflow-y: auto; /* Ensure scrolling for content */
        }
        h2 {
          color: var(--primary-color); /* Use theme's primary color */
          text-align: center;
          margin-bottom: 15px;
        }
        p {
          text-align: center;
          font-size: 0.9em;
          color: var(--text-color); /* Use theme's text color */
          margin-bottom: 10px;
        }
        h3 {
          color: var(--title-color); /* Use theme's title color */
          border-bottom: 1px solid var(--border-color); /* Use theme's border color */
          padding-bottom: 5px;
          margin-top: 20px;
          text-align: left;
        }
        .form-group {
          margin-bottom: 15px;
          text-align: left;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          color: var(--primary-color); /* Use theme's primary color */
        }
        /* The actual input/textarea will be styled by the main theme,
           so we only need to style additional inputs if they are custom. */
        .form-group input[type="text"] {
          width: calc(100% - 20px);
          padding: 10px;
          /* Colors and borders will be inherited or can be set to theme variables */
          background-color: var(--bg-color); /* Use theme's background color */
          color: var(--text-color); /* Use theme's text color */
          border: 1px solid var(--border-color); /* Use theme's border color */
          border-radius: 4px;
          font-family: 'Orbitron', sans-serif;
        }
      </style>
      <div class="feedback-container">
        <h2>Qflow Cloud User Feedback</h2>
        <p>
          We appreciate your input! Please provide your valuable feedback below.
        </p>

        <h3>Your Details</h3>
        <div class="form-group">
          <label for="name">Name (Optional):</label>
          <input type="text" id="name" placeholder="Enter your name">
        </div>
        <div class="form-group">
          <label for="email">Email (Optional):</label>
          <input type="text" id="email" placeholder="Enter your email">
        </div>

        <h3>Feedback</h3>
        <p>
          Please use the input field below to type your comments/suggestions.
        </p>

        <p style="margin-top: 20px;">
          Click 'Submit' to send your feedback.
        </p>
      </div>
    `,
  });
  customInput.postAsync = async (shared, _, execRes) => { shared.customInputResult = execRes; return 'default'; };


  class ProcessCustomInputResult extends AsyncNode {
    async execAsync(prepRes, shared) {
      console.log('--- Custom Input Results (Elaborate Feedback Form) ---');
      console.log('User Input:', shared.customInputResult);
      // In a real scenario, you might parse the input from the HTML if multiple fields were used.
      // For this example, we're just capturing the main textarea.
      console.log('----------------------------------------------------');
      return 'default';
    }
  }
  const processResult = new ProcessCustomInputResult();

  customInput.next(processResult);

  const flow = new AsyncFlow(customInput);
  
  await flow.runAsync({});
  console.log('Custom input test flow (elaborate feedback form) finished.');
}


// --- Main Execution ---
// You can comment out one of these to run a specific demo.
//await runLightTheme();
//await runDarkTheme();
//await runLongFormatTest();
await runCustomDialogTest();
await runCustomInputTest();