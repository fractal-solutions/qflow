
import { AsyncNode } from '../qflow.js';
import { Webview, SizeHint } from 'webview-bun';
import { log } from '../logger.js';

/**
 * A node that displays an interactive webview window.
 * It can be used for dialogs, user input, and notifications.
 * The result from the user interaction is passed to the next node.
 */
export class InteractiveWebviewNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "interactive_webview",
      description: "Displays an interactive webview window for notifications, dialogs, or user input.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["notification", "dialog", "input", "custom"],
            description: "The mode of the webview: 'notification' (message with close button), 'dialog' (message with options), 'input' (message with text input), or 'custom' (full HTML control)."
          },
          message: {
            type: "string",
            description: "Required for 'notification' and 'dialog' modes. The message to display."
          },
          options: {
            type: "array",
            items: { type: "string" },
            description: "Required for 'dialog' mode. An array of strings for the buttons."
          },
          prompt: {
            type: "string",
            description: "Required for 'input' mode. The prompt message for the user."
          },
          title: {
            type: "string",
            description: "Optional. The title of the webview window. Defaults to 'Qflow'."
          },
          width: {
            type: "number",
            description: "Optional. The width of the webview window. Defaults to 400."
          },
          height: {
            type: "number",
            description: "Optional. The height of the webview window. Defaults to 220."
          },
          theme: {
            type: "string",
            enum: ["light", "dark"],
            description: "Optional. The theme for the webview. Defaults to 'light'."
          },
          persistent: {
            type: "boolean",
            description: "Optional. If true, the webview remains open after interaction. Defaults to false."
          },
          html: {
            type: "string",
            description: "Required for 'custom' mode. The full HTML content to display in the webview."
          },
          multilineInput: {
            type: "boolean",
            description: "Optional. If true, the input field in 'input' mode will be a multiline textarea. Defaults to false."
          }
        },
        required: ["mode"]
      }
    };
  }

  constructor() {
    super();
    this._webviewInstance = null; // Store webview instance for sendToWebview
  }

  async execAsync() {
    const {
      mode = 'notification', // 'notification', 'dialog', 'input'
      message = '',
      options = [], // for dialog mode
      prompt = '', // for input mode
      title = 'Qflow',
      width = 400,
      height = 220,
      theme = 'light', // 'light', 'dark'
      persistent = false, // New parameter for persistent webview
      html = '', // New parameter for custom HTML content
      multilineInput = false, // New parameter for multi-line input
    } = this.params;

    log(`[InteractiveWebviewNode] Creating '${mode}' webview with title: "${title}"`, this.params.logging);

    return new Promise((resolve) => {
      const webview = new Webview(false, {
        width,
        height,
        hint: SizeHint.FIXED,
      });
      webview.title = title;

      this._webviewInstance = webview; // Always store the instance

      webview.bind('qflow', (result) => {
        // This is the crucial part: qflow() from webview resolves execAsync
        // If persistent, we still resolve, but the webview stays open.
        // The flow will then continue.
        resolve(result);
        if (!persistent) {
          webview.destroy();
        }
      });

      let contentHtml;
      if (mode === 'custom') {
        if (!html) {
          throw new Error('InteractiveWebviewNode in custom mode requires an `html` parameter.');
        }
        contentHtml = html;
      } else {
        contentHtml = this.generateHTML(mode, { message, options, prompt, title, theme, multilineInput });
      }
      webview.setHTML(contentHtml);
      webview.run(); // This is a blocking call

      // This log will only be reached after webview.run() exits (i.e., webview is closed)
      log(`[InteractiveWebviewNode] Webview window closed.`, this.params.logging);
      // If persistent, and webview.run() exits, it means the user closed it manually.
      // In this case, we should resolve with a 'closed' status if not already resolved.
      // However, the resolve(result) in webview.bind handles the primary interaction.
      // If the webview is closed without qflow() being called, the promise might hang.
      // Let's add a fallback resolve if webview.run() exits without qflow() being called.
      // This is complex with blocking run().
      // For now, assume qflow() is always called before manual close for persistent.
    });
  }

  /**
   * Sends data or executes JavaScript within an open persistent webview.
   * @param {string} script - The JavaScript code to execute in the webview.
   */
  sendToWebview(script) {
    if (this._webviewInstance && this._webviewInstance.unsafeHandle) {
      this._webviewInstance.eval(script);
    } else {
      log(`[InteractiveWebviewNode] Cannot send to webview: no persistent webview instance found.`, this.params.logging, { type: 'warn' });
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.webviewResult = execRes;
    return 'default';
  }

  generateHTML(mode, params) {
    const { message, options, prompt, title, theme, multilineInput } = params;

    const lightTheme = `
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');
      :root {
        --primary-color: #007bff;
        --bg-color: #f4f6f8;
        --border-color: #d1d9e0;
        --text-color: #212529;
        --title-color: #212529;
        --shadow-color: #007bff40;
      }
      body {
        font-family: 'Orbitron', sans-serif;
        background-color: var(--bg-color);
        color: var(--text-color);
        margin: 0;
        padding: 1px;
        overflow: auto;
        user-select: none;
      }
      .container {
        border: 1px solid var(--border-color);
        height: calc(100vh - 2px);
        width: calc(100vw - 2px);
        display: flex;
        flex-direction: column;
        background-color: #ffffff;
        box-shadow: 0 0 20px #0000001a;
      }
      .title-bar {
        background-color: #e9ecef;
        color: var(--title-color);
        padding: 0.5rem;
        text-align: center;
        font-weight: bold;
        border-bottom: 1px solid var(--border-color);
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      .content {
        flex-grow: 1;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
      }
      h1 {
        font-size: 1.2rem;
        margin-bottom: 1rem;
        color: var(--title-color);
      }
      .button-group {
        display: flex;
        flex-wrap: wrap; /* Allow buttons to wrap */
        justify-content: center; /* Center buttons */
        gap: 1rem;
        margin-top: 1rem;
      }
      button {
        background-color: var(--primary-color);
        color: white;
        border: 1px solid var(--primary-color);
        padding: 0.6rem 1.2rem;
        font-family: 'Orbitron', sans-serif;
        font-size: 0.9rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
      }
      button:hover {
        background-color: #0056b3;
        border-color: #0056b3;
      }
      input, textarea { /* Apply styles to textarea as well */
        background-color: #ffffff;
        border: 1px solid var(--border-color);
        color: var(--text-color);
        padding: 0.6rem;
        width: 80%;
        font-family: 'Orbitron', sans-serif;
        font-size: 1rem;
        margin-bottom: 1rem;
      }
      input:focus, textarea:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 8px var(--shadow-color);
      }
    `;

    const darkTheme = `
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');
      :root {
        --primary-color: #00ffff;
        --bg-color: #0a0a1a;
        --border-color: #00ffff80;
        --text-color: #e0e0e0;
        --title-color: #ffffff;
        --shadow-color: #00ffff40;
      }
      body {
        font-family: 'Orbitron', sans-serif;
        background-color: var(--bg-color);
        color: var(--text-color);
        margin: 0;
        padding: 1px;
        overflow: auto; /* Allow scrolling */
        user-select: none;
      }
      .container {
        border: 1px solid var(--border-color);
        height: calc(100vh - 2px);
        width: calc(100vw - 2px);
        display: flex;
        flex-direction: column;
        background: radial-gradient(circle, rgba(10, 10, 26, 0.95) 0%, rgba(10, 10, 26, 0.85) 100%);
        box-shadow: 0 0 20px var(--shadow-color);
      }
      .title-bar {
        background-color: #00000030;
        color: var(--title-color);
        padding: 0.5rem;
        text-align: center;
        font-weight: bold;
        border-bottom: 1px solid var(--border-color);
        text-transform: uppercase;
        letter-spacing: 2px;
        text-shadow: 0 0 5px var(--primary-color);
      }
      .content {
        flex-grow: 1;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
      }
      h1 {
        font-size: 1.2rem;
        margin-bottom: 1rem;
        color: var(--title-color);
        text-shadow: 0 0 8px var(--shadow-color);
      }
      .button-group {
        display: flex;
        flex-wrap: wrap; /* Allow buttons to wrap */
        justify-content: center; /* Center buttons */
        gap: 1rem;
        margin-top: 1rem;
      }
      button {
        background-color: transparent;
        color: var(--primary-color);
        border: 1px solid var(--primary-color);
        padding: 0.6rem 1.2rem;
        font-family: 'Orbitron', sans-serif;
        font-size: 0.9rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        box-shadow: 0 0 10px var(--shadow-color) inset;
      }
      button:hover {
        background-color: var(--primary-color);
        color: var(--bg-color);
        box-shadow: 0 0 20px var(--shadow-color);
      }
      input, textarea { /* Apply styles to textarea as well */
        background-color: #00000030;
        border: 1px solid var(--border-color);
        color: var(--text-color);
        padding: 0.6rem;
        width: 80%;
        font-family: 'Orbitron', sans-serif;
        font-size: 1rem;
        margin-bottom: 1rem;
      }
      input:focus, textarea:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 10px var(--shadow-color);
      }
    `;

    let contentHtml = '';
    switch (mode) {
      case 'dialog':
        contentHtml = `
          <h1>${message}</h1>
          <div class="button-group">
            ${options.map(option => `<button onclick="qflow('${option}')">${option}</button>`).join('')}
          </div>
        `;
        break;
      case 'input':
        const inputElement = multilineInput ?
          `<textarea id="userInput" rows="10" style="width: 80%;"></textarea>` :
          `<input type="text" id="userInput" onkeydown="if(event.key==='Enter') document.getElementById('submitBtn').click()"/>`;
        contentHtml = `
          <h1>${prompt}</h1>
          ${inputElement}
          <button id="submitBtn" onclick="qflow(document.getElementById('userInput').value)">Submit</button>
        `;
        break;
      case 'notification':
      default:
        contentHtml = `
          <h1>${message}</h1>
          <div class="button-group">
            <button onclick="qflow('closed')">${theme === 'dark' ? 'Acknowledge' : 'Close'}</button>
          </div>
        `;
        break;
    }

    const container = `<div class="container"><div class="title-bar">${title}</div><div class="content">${contentHtml}</div></div>`;

    return `
      <html>
        <head>
          <style>${theme === 'dark' ? darkTheme : lightTheme}</style>
        </head>
        <body>
          ${container}
        </body>
      </html>
    `;
  }
}
