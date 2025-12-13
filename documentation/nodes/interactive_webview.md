# InteractiveWebviewNode

The `InteractiveWebviewNode` is a versatile node that allows for user interaction through a webview window. It can be used to display notifications, ask for user input, or present a dialog with options.

## Parameters

*   `mode` (string, required): The mode of the interactive webview. Can be one of `'notification'`, `'dialog'`, or `'input'`.
*   `message` (string, optional): The message to display in the webview.
*   `options` (array, optional): An array of strings to be displayed as buttons in `'dialog'` mode.
*   `prompt` (string, optional): The prompt to display in `'input'` mode.
*   `title` (string, optional): The title of the webview window. Defaults to `'Qflow'`.
*   `width` (number, optional): The width of the webview window. Defaults to `400`.
*   `height` (number, optional): The height of the webview window. Defaults to `220`.
*   `theme` (string, optional): The theme of the webview. Can be `'light'` or `'dark'`. Defaults to `'light'`.
*   `multilineInput` (boolean, optional): If `true` and `mode` is `'input'`, displays a multi-line textarea instead of a single-line input field. Defaults to `false`.

## Output

The result of the user's interaction is passed to the next node in the flow.
*   For `'dialog'` mode, the result is the text of the button the user clicked.
*   For `'input'` mode, the result is the text the user entered.
*   For `'notification'` mode, the result is the string `'closed'`.

## Example

```javascript
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { InteractiveWebviewNode } from '@fractal-solutions/qflow/nodes';

async function runInteractiveDemo() {
  const showDialog = new InteractiveWebviewNode();
  showDialog.setParams({
    mode: 'dialog',
    message: 'What is your favorite color?',
    options: ['Red', 'Green', 'Blue'],
    title: 'Color Picker',
    theme: 'dark',
    width: 500,
    height: 300,
  });

  const askForName = new InteractiveWebviewNode();
  askForName.setParams({
    mode: 'input',
    prompt: 'Please enter your name:',
    title: 'Name Input',
    theme: 'dark',
    width: 500,
    height: 300,
  });

  const showNotification = new InteractiveWebviewNode();

  class ProcessResultsNode extends AsyncNode {
    async execAsync(prepRes, shared) {
      showNotification.setParams({
        mode: 'notification',
        message: `Hello, ${shared.name}! Your favorite color is ${shared.color}.`,
        title: 'Summary',
        theme: 'dark',
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
}

await runInteractiveDemo();
```
