# InteractiveWebviewNode

The `InteractiveWebviewNode` is a versatile node that allows for user interaction through a webview window. It can be used to display notifications, ask for user input, present a dialog with options, or display fully custom HTML content with interactive elements.

## Parameters

*   `mode` (string, required): The mode of the interactive webview. Can be one of `'notification'`, `'dialog'`, `'input'`, `'custom'`, `'custom-dialog'`, or `'custom-input'`.
    *   `'notification'`: Displays a message with a close button.
    *   `'dialog'`: Displays a message with predefined options as buttons.
    *   `'input'`: Displays a prompt with a text input field.
    *   `'custom'`: Displays fully custom HTML content. This mode offers complete control over the webview's HTML, CSS, and JavaScript, allowing for entirely custom layouts and styling. However, you must implement your own JavaScript to call the `qflow()` function to return data to the flow.
    *   `'custom-dialog'`: Displays custom HTML content along with predefined options as buttons.
    *   `'custom-input'`: Displays custom HTML content along with a text input field and a submit button.
*   `message` (string, optional): The message to display in the webview. Required for `'notification'` and `'dialog'` modes. Can be used as fallback content for `'custom-dialog'` if `html` is not provided.
*   `options` (array, optional): An array of strings to be displayed as buttons in `'dialog'` and `'custom-dialog'` modes.
*   `prompt` (string, optional): The prompt to display in `'input'` mode. Can be used as fallback content for `'custom-input'` if `html` is not provided.
*   `html` (string, optional): The full HTML content to display in the webview. Required for `'custom'` mode. Used as the primary content for `'custom-dialog'` and `'custom-input'` modes, overriding `message` or `prompt`. For `'custom-dialog'` and `'custom-input'`, your provided HTML will be embedded within the node's default themed container, meaning the overall theme (light/dark) and basic layout are still applied.
*   `title` (string, optional): The title of the webview window. Defaults to `'Qflow'`.
*   `width` (number, optional): The width of the webview window. Defaults to `400`.
*   `height` (number, optional): The height of the webview window. Defaults to `220`.
*   `theme` (string, optional): The theme of the webview. Can be `'light'` or `'dark'`. Defaults to `'light'`.
*   `multilineInput` (boolean, optional): If `true` and `mode` is `'input'` or `'custom-input'`, displays a multi-line textarea instead of a single-line input field. Defaults to `false`.

## Output

The result of the user's interaction is passed to the next node in the flow.
*   For `'dialog'` and `'custom-dialog'` modes, the result is the text of the button the user clicked.
*   For `'input'` and `'custom-input'` modes, the result is the text the user entered.
*   For `'notification'` mode, the result is the string `'closed'`.
*   For `'custom'` mode, the result is whatever value is passed to the `qflow()` JavaScript function called from within your custom HTML.

## Examples

### Basic Interactive Demo

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

### Custom Dialog Example

This example demonstrates using `custom-dialog` mode to display custom HTML content along with predefined options.

```javascript
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { InteractiveWebviewNode } from '@fractal-solutions/qflow/nodes';

async function runCustomDialogDemo() {
  const customDialog = new InteractiveWebviewNode();
  customDialog.setParams({
    mode: 'custom-dialog',
    title: 'Custom Action Required',
    html: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #00ffff;">System Alert!</h2>
        <p style="color: #e0e0e0;">A critical process requires your immediate attention.</p>
        <p style="color: #e0e0e0;">Please choose an action to proceed.</p>
      </div>
    `,
    options: ['Acknowledge', 'Investigate', 'Ignore'],
    theme: 'dark',
    width: 600,
    height: 350,
  });

  class ProcessCustomDialogResult extends AsyncNode {
    async execAsync(prepRes, shared) {
      console.log('Custom Dialog Result:', shared.customActionResult);
      // Further processing based on the user's choice
      return 'default';
    }
  }
  const processResult = new ProcessCustomDialogResult();

  customDialog.next(processResult);

  const flow = new AsyncFlow(customDialog);
  customDialog.postAsync = async (shared, _, execRes) => { shared.customActionResult = execRes; return 'default'; };

  await flow.runAsync({});
}

await runCustomDialogDemo();
```

### Custom Input Example

This example demonstrates using `custom-input` mode to display custom HTML content along with a text input field.

```javascript
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { InteractiveWebviewNode } from '@fractal-solutions/qflow/nodes';

async function runCustomInputDemo() {
  const customInput = new InteractiveWebviewNode();
  customInput.setParams({
    mode: 'custom-input',
    title: 'User Feedback',
    html: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #00ffff;">We Value Your Feedback</h2>
        <p style="color: #e0e0e0;">Please enter your suggestions or comments below:</p>
      </div>
    `,
    multilineInput: true,
    theme: 'dark',
    width: 700,
    height: 400,
  });

  class ProcessCustomInputResult extends AsyncNode {
    async execAsync(prepRes, shared) {
      console.log('User Feedback:', shared.userFeedback);
      // Further processing of the user's input
      return 'default';
    }
  }
  const processResult = new ProcessCustomInputResult();

  customInput.next(processResult);

  const flow = new AsyncFlow(customInput);
  customInput.postAsync = async (shared, _, execRes) => { shared.userFeedback = execRes; return 'default'; };

  await flow.runAsync({});
}

await runCustomInputDemo();
```