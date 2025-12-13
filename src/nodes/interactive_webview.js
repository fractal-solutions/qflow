
import { AsyncNode } from '../qflow.js';
import { Webview, SizeHint } from 'webview-bun';
import { log } from '../logger.js';

/**
 * A node that displays an interactive webview window.
 * It can be used for dialogs, user input, and notifications.
 * The result from the user interaction is passed to the next node.
 */
export class InteractiveWebviewNode extends AsyncNode {
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
    } = this.params;

    log(`[InteractiveWebviewNode] Creating '${mode}' webview with title: "${title}"`, this.params.logging);

    return new Promise((resolve) => {
      const webview = new Webview(false, {
        width,
        height,
        hint: SizeHint.FIXED,
      });
      webview.title = title;

      // Store webview instance if persistent
      if (persistent) {
        this._webviewInstance = webview;
      }

      webview.bind('qflow', (result) => {
        if (!persistent) {
          webview.destroy();
        }
        resolve(result);
      });

      let contentHtml;
      if (mode === 'custom') {
        if (!html) {
          throw new Error('InteractiveWebviewNode in custom mode requires an `html` parameter.');
        }
        contentHtml = html;
      } else {
        contentHtml = this.generateHTML(mode, { message, options, prompt, title, theme });
      }
      webview.setHTML(contentHtml);
      webview.run();

      log(`[InteractiveWebviewNode] Webview window closed.`, this.params.logging);
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
    const { message, options, prompt, title, theme } = params;

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
        overflow: hidden;
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
      input {
        background-color: #ffffff;
        border: 1px solid var(--border-color);
        color: var(--text-color);
        padding: 0.6rem;
        width: 80%;
        font-family: 'Orbitron', sans-serif;
        font-size: 1rem;
        margin-bottom: 1rem;
      }
      input:focus {
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
        overflow: hidden;
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
      input {
        background-color: #00000030;
        border: 1px solid var(--border-color);
        color: var(--text-color);
        padding: 0.6rem;
        width: 80%;
        font-family: 'Orbitron', sans-serif;
        font-size: 1rem;
        margin-bottom: 1rem;
      }
      input:focus {
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
        contentHtml = `
          <h1>${prompt}</h1>
          <input type="text" id="userInput" autofocus onkeydown="if(event.key==='Enter') document.getElementById('submitBtn').click()"/>
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
