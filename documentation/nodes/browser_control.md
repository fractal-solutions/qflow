## BrowserControlNode

The `BrowserControlNode` controls a Playwright browser to navigate pages, interact with elements, evaluate scripts, take screenshots, and close browser sessions.

### Parameters

*   `action` (required): One of `goto`, `click`, `type`, `screenshot`, `evaluate`, `close`.
*   `url`: The URL to navigate to (for `goto`).
*   `selector`: A CSS selector to target an element (for `click` and `type`).
*   `text`: The text to type into an input field (for `type`).
*   `path`: The file path to save a screenshot (for `screenshot`).
*   `script`: JavaScript to evaluate in the page context (for `evaluate`).
*   `browserType`: Browser engine used when launching a new browser (`chromium`, `firefox`, `webkit`). Default is `chromium`.
*   `launchOptions`: Playwright launch options used when creating a browser. Default is `{ headless: true }`.

### Notes

*   The node reuses `shared.browser` and `shared.page` across calls.
*   On failures (except while closing), it automatically closes and clears browser state from `shared`.
*   `evaluate` returns the raw result of `page.evaluate(...)`.

### Example Usage

```javascript
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { BrowserControlNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  const shared = {};

  const html = `
    <html>
      <body>
        <input id="name" />
        <button id="save" onclick="document.body.dataset.saved='1'">Save</button>
      </body>
    </html>
  `;

  // 1) Open page
  const gotoSite = new BrowserControlNode();
  gotoSite.setParams({
    action: 'goto',
    url: `data:text/html,${encodeURIComponent(html)}`,
    browserType: 'chromium',
    launchOptions: { headless: true },
  });

  // 2) Fill input
  const typeName = new BrowserControlNode();
  typeName.setParams({
    action: 'type',
    selector: '#name',
    text: 'Qflow',
  });

  // 3) Click button
  const clickSave = new BrowserControlNode();
  clickSave.setParams({
    action: 'click',
    selector: '#save',
  });

  // 4) Evaluate DOM state
  const evaluateState = new BrowserControlNode();
  evaluateState.setParams({
    action: 'evaluate',
    script: '({ saved: document.body.dataset.saved, value: document.querySelector("#name").value })',
  });
  evaluateState.postAsync = async (sharedState, _, execRes) => {
    sharedState.evaluateResult = execRes;
    return 'default';
  };

  class LogResultNode extends AsyncNode {
    async execAsync(_, sharedState) {
      console.log('Evaluate result:', sharedState.evaluateResult);
      return 'default';
    }
  }
  const logResult = new LogResultNode();

  // 5) Screenshot
  const screenshot = new BrowserControlNode();
  screenshot.setParams({
    action: 'screenshot',
    path: './browser_control_demo.png',
  });

  // 6) Close browser
  const closeBrowser = new BrowserControlNode();
  closeBrowser.setParams({
    action: 'close',
  });

  gotoSite
    .next(typeName)
    .next(clickSave)
    .next(evaluateState)
    .next(logResult)
    .next(screenshot)
    .next(closeBrowser);

  const browserFlow = new AsyncFlow(gotoSite);
  await browserFlow.runAsync(shared);
})();
```
