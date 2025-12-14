
import { AsyncNode } from '../qflow.js';
import { chromium, firefox, webkit } from 'playwright';

export class BrowserControlNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "browser_control",
      description: "Controls a web browser to navigate pages, interact with elements, and take screenshots.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["goto", "click", "type", "screenshot", "close"],
            description: "The browser action to perform."
          },
          url: {
            type: "string",
            description: "The URL to navigate to (for 'goto' action)."
          },
          selector: {
            type: "string",
            description: "A CSS selector to target an element (for 'click' and 'type' actions)."
          },
          text: {
            type: "string",
            description: "The text to type into an input field (for 'type' action)."
          },
          path: {
            type: "string",
            description: "The file path to save a screenshot (for 'screenshot' action)."
          }
        },
        required: ["action"]
      }
    };
  }

  async execAsync(prepRes, shared) {
    const {
      action,
      url,
      selector,
      text,
      path,
      script,
      browserType = 'chromium',
      launchOptions = { headless: true },
    } = this.params;

    let browser = shared.browser;
    let page = shared.page;

    try {
      if (!browser || !browser.isConnected()) {
        const browserLauncher = { chromium, firefox, webkit }[browserType];
        if (!browserLauncher) {
          throw new Error(`Unsupported browser type: ${browserType}`);
        }
        browser = await browserLauncher.launch(launchOptions);
        const context = await browser.newContext();
        page = await context.newPage();
        shared.browser = browser;
        shared.page = page;
      }

      let result = {};

      switch (action) {
        case 'goto':
          if (!url) throw new Error('`url` parameter is required for `goto` action.');
          await page.goto(url);
          result = { message: `Navigated to ${url}` };
          break;
        case 'click':
          if (!selector) throw new Error('`selector` parameter is required for `click` action.');
          await page.click(selector);
          result = { message: `Clicked on ${selector}` };
          break;
        case 'type':
          if (!selector || text === undefined) throw new Error('`selector` and `text` parameters are required for `type` action.');
          await page.fill(selector, text);
          result = { message: `Typed into ${selector}` };
          break;
        case 'screenshot':
          if (!path) throw new Error('`path` parameter is required for `screenshot` action.');
          await page.screenshot({ path });
          result = { message: `Screenshot saved to ${path}` };
          break;
        case 'evaluate':
          if (!script) throw new Error('`script` parameter is required for `evaluate` action.');
          result = await page.evaluate(script);
          break;
        case 'close':
          if (browser && browser.isConnected()) {
            await browser.close();
            delete shared.browser;
            delete shared.page;
          }
          result = { message: 'Browser closed' };
          break;
        default:
          throw new Error(`Unsupported browser action: ${action}`);
      }
      return result;
    } catch (error) {
      if (browser && browser.isConnected() && action !== 'close') {
        await browser.close();
        delete shared.browser;
        delete shared.page;
      }
      throw new Error(`BrowserControlNode failed during '${action}' action: ${error.message}`);
    }
  }
}
