
import { AsyncFlow } from '../src/qflow.js';
import { BrowserControlNode } from '../src/nodes/browser_control.js';
import { DisplayImageNode } from '../src/nodes/display_image.js';

(async () => {
  console.log('--- Running Browser Control Test Workflow ---');

  // 1. Go to a test website
  const gotoSite = new BrowserControlNode();
  gotoSite.setParams({
    action: 'goto',
    url: 'https://www.google.com/search?q=qflow+github',
  });

  // 2. Take a screenshot
  const screenshot = new BrowserControlNode();
  screenshot.setParams({
    action: 'screenshot',
    path: './google_search.png',
  });

  // 3. Display the screenshot
  const displayImage = new DisplayImageNode();
  displayImage.setParams({
    imagePath: './google_search.png',
  });

  // 4. Close the browser
  const closeBrowser = new BrowserControlNode();
  closeBrowser.setParams({
    action: 'close',
  });

  // Chain the nodes
  gotoSite.next(screenshot);
  screenshot.next(displayImage);
  displayImage.next(closeBrowser);

  // Create and run the flow
  const browserFlow = new AsyncFlow(gotoSite);

  try {
    await browserFlow.runAsync({});
    console.log('Browser automation workflow finished successfully.');
    console.log('Screenshot saved to ./google_search.png and displayed.');
  } catch (error) {
    console.error('Browser automation workflow failed:', error);
  }
})();
