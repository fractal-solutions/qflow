## WebhookNode

The `WebhookNode` exposes an HTTP endpoint to receive webhooks, triggering a specified qflow flow.

### Parameters

*   `port`: Optional. The port number to listen on. Defaults to 3000.
*   `path`: Optional. The URL path for the webhook endpoint. Defaults to '/webhook'.
*   `flow`: The name of the qflow AsyncFlow instance to trigger when a webhook is received.
*   `sharedSecret`: Optional. A shared secret for HMAC verification of incoming webhooks.
*   `responseStatus`: Optional. The HTTP status code to send back to the webhook sender. Defaults to 200.
*   `responseBody`: Optional. The JSON body to send back to the webhook sender. Defaults to { status: 'received' }.

### Example Usage

```javascript
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { WebhookNode, HttpRequestNode } from '@fractal-solutions/qflow/nodes';

// --- Define a flow to be triggered by the webhook ---
class WebhookTriggeredFlow extends AsyncNode {
  async execAsync(prepRes, shared) {
    console.log('\n[WebhookTriggeredFlow] Webhook received!');
    console.log('[WebhookTriggeredFlow] Received data:', shared.webhookData);
    // Process the webhook data here
    return { processed: true, data: shared.webhookData };
  }
}

const myWebhookFlow = new AsyncFlow(new WebhookTriggeredFlow());

// --- Main Flow: Set up the WebhookNode and simulate a call ---
(async () => {
  console.log('--- Running WebhookNode Example ---');

  // 1. Set up the WebhookNode
  const webhookNode = new WebhookNode();
  webhookNode.setParams({
    port: 3000,
    path: '/my-custom-webhook',
    flow: myWebhookFlow // Pass the flow instance to be triggered
  });

  // Start the webhook listener in the background
  const webhookFlow = new AsyncFlow(webhookNode);
  webhookFlow.runAsync({}); // Run without awaiting to keep it listening
  console.log('Webhook listener started on http://localhost:3000/my-custom-webhook');
  console.log('Waiting for 3 seconds before simulating a webhook call...');

  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for server to start

  // 2. Simulate an incoming webhook call using HttpRequestNode
  console.log('\n--- Simulating incoming webhook call ---');
  const simulateWebhookCall = new HttpRequestNode();
  simulateWebhookCall.setParams({
    url: 'http://localhost:3000/my-custom-webhook',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { event: 'user.created', data: { id: 123, name: 'John Doe' } }
  });

  try {
    const response = await new AsyncFlow(simulateWebhookCall).runAsync({});
    console.log('Simulated Webhook Call Response:', response);
  } catch (error) {
    console.error('Simulated Webhook Call Failed:', error.message);
  }

  console.log('\n--- WebhookNode Example Finished ---');
  // In a real application, you would keep the process alive for the webhook to continue listening.
  // For this example, the process will exit after the simulated call.
})();
```
