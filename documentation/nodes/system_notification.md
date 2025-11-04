## SystemNotificationNode

The `SystemNotificationNode` displays a system-level notification across OSs.

### Parameters

*   `message`: The main message content of the notification.
*   `title`: Optional. The title of the notification. Defaults to 'QFlow Notification'.
*   `icon`: Optional. Path to an icon file or a system icon name (Linux specific). Ignored on macOS/Windows.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { SystemNotificationNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running SystemNotificationNode Example ---');

  const notifyNode = new SystemNotificationNode();
  notifyNode.setParams({
    message: 'Your QFlow task is complete!',
    title: 'Task Status',
    icon: 'dialog-information' // Linux specific icon name, ignored on macOS/Windows
  });

  const flow = new AsyncFlow(notifyNode);
  try {
    await flow.runAsync({});
    console.log('Notification workflow finished.');
  } catch (error) {
    console.error('Notification Workflow Failed:', error);
  }
})();
```
