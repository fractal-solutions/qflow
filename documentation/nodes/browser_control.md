## BrowserControlNode

The `BrowserControlNode` controls a web browser to navigate pages, interact with elements, and take screenshots.

### Parameters

*   `action`: The browser action to perform.
*   `url`: The URL to navigate to (for 'goto' action).
*   `selector`: A CSS selector to target an element (for 'click' and 'type' actions).
*   `text`: The text to type into an input field (for 'type' action).
*   `path`: The file path to save a screenshot (for 'screenshot' action).

### Example Usage

```javascript
import { AsyncFlow} from '@fractal-solutions/qflow';
import { BrowserControlNode, DisplayImageNode } from '@fractal-solutions/qflow/nodes';

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
```
