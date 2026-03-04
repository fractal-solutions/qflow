
import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { BrowserControlNode } from '../src/nodes/browser_control.js';

(async () => {
  console.log('--- Running Browser Control Test Workflow ---');
  const shared = {};
  const screenshotPath = './examples/output/browser_control_test.png';
  const testHtml = `
    <html>
      <head><title>Browser Control Feature Test</title></head>
      <body>
        <h1 id="title">Browser Control</h1>
        <input id="name" />
        <button id="save" onclick="document.body.dataset.saved='true'">Save</button>
      </body>
    </html>
  `;

  // 1. Go to a deterministic local test page
  const gotoSite = new BrowserControlNode();
  gotoSite.setParams({
    action: 'goto',
    url: `data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`,
    browserType: 'chromium',
    launchOptions: { headless: true },
  });

  // 2. Type into input
  const typeInInput = new BrowserControlNode();
  typeInInput.setParams({ action: 'type', selector: '#name', text: 'qflow-navigator' });

  // 3. Click button
  const clickButton = new BrowserControlNode();
  clickButton.setParams({ action: 'click', selector: '#save' });

  // 4. Evaluate page state
  const evaluateState = new BrowserControlNode();
  evaluateState.setParams({
    action: 'evaluate',
    script: '({ title: document.title, saved: document.body.dataset.saved, value: document.querySelector("#name").value })',
  });
  evaluateState.postAsync = async (sharedState, prepRes, execRes) => {
    sharedState.evaluateResult = execRes;
    return 'default';
  };

  class AssertEvaluateNode extends AsyncNode {
    async execAsync(prepRes, sharedState) {
      const evaluateResult = sharedState.evaluateResult;
      if (!evaluateResult || evaluateResult.saved !== 'true' || evaluateResult.value !== 'qflow-navigator') {
        throw new Error(`Unexpected evaluate result: ${JSON.stringify(evaluateResult)}`);
      }
      console.log('Evaluate result validated:', evaluateResult);
      return 'default';
    }
  }
  const assertEvaluate = new AssertEvaluateNode();

  // 5. Take screenshot
  const screenshot = new BrowserControlNode();
  screenshot.setParams({ action: 'screenshot', path: screenshotPath });

  // 6. Close browser
  const closeBrowser = new BrowserControlNode();
  closeBrowser.setParams({ action: 'close' });

  // Chain all supported actions
  gotoSite
    .next(typeInInput)
    .next(clickButton)
    .next(evaluateState)
    .next(assertEvaluate)
    .next(screenshot)
    .next(closeBrowser);

  // Create and run the flow
  const browserFlow = new AsyncFlow(gotoSite);

  try {
    await browserFlow.runAsync(shared);
    console.log('Browser automation workflow finished successfully.');
    console.log(`Screenshot saved to ${screenshotPath}.`);
  } catch (error) {
    console.error('Browser automation workflow failed:', error);
  }
})();
