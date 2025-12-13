# WebviewNode

The `WebviewNode` provides a simple way to display a webview window with custom HTML content. It's useful for showing rich, interactive UIs as part of a workflow.

## Parameters

*   `html` (string, required): The HTML content to display in the webview.
*   `title` (string, optional): The title of the webview window. Defaults to `'Qflow Webview'`.
*   `width` (number, optional): The width of the webview window. Defaults to `800`.
*   `height` (number, optional): The height of the webview window. Defaults to `600`.

## Example

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { WebviewNode } from '@fractal-solutions/qflow/nodes';

const showMyUI = new WebviewNode();
showMyUI.setParams({
  title: 'My Custom UI',
  html: `
    <html>
      <body>
        <h1>Hello from qflow!</h1>
        <p>This is a custom UI rendered in a webview.</p>
      </body>
    </html>
  `,
  width: 600,
  height: 400,
});

const flow = new AsyncFlow(showMyUI);
await flow.runAsync({});
```
