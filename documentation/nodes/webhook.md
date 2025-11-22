## WebhookNode

The `WebhookNode` exposes an HTTP endpoint to receive webhooks, triggering a specified qflow flow.

### Parameters

*   `port`: Optional. The port number to listen on. Defaults to 3000.
*   `path`: Optional. The URL path for the webhook endpoint. Defaults to '/webhook'.
*   `flow`: The qflow `AsyncFlow` instance to trigger when a webhook is received.
*   `waitForFlow` (boolean, optional, default: false): This parameter controls the response behavior:
    *   If `false` (the default), the server responds immediately with a predefined status and body, and triggers the flow in a "fire-and-forget" manner.
    *   If `true`, the server will await the completion of the entire flow. It will then automatically take the return value of the flow, convert it to a JSON string, and send it as the HTTP response with a 200 OK status. If the flow throws an error, it will send a generic `500 Flow execution failed` error.
*   `sharedSecret`: Optional. A shared secret for HMAC verification of incoming webhooks.
*   `responseStatus`: Optional. The HTTP status code to send back. **Only used when `waitForFlow` is `false`**. Defaults to 200.
*   `responseBody`: Optional. The JSON body to send back. **Only used when `waitForFlow` is `false`**. Defaults to `{ status: 'received' }`.

### Example Usage

#### Example 1: Fire-and-Forget

This is the default behavior. The webhook responds immediately and triggers a flow in the background.

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

### Example 2: Wait for Flow and Return Result

This example demonstrates how to use `waitForFlow: true` to run a flow and return its result as the HTTP response.

```javascript
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { WebhookNode, HttpRequestNode } from '@fractal-solutions/qflow/nodes';

// --- Define a flow that does some work and returns a result ---
class DataProcessingFlow extends AsyncNode {
  async execAsync(prepRes, shared) {
    console.log('\n[DataProcessingFlow] Webhook received!');
    const inputData = shared.webhookData;
    console.log('[DataProcessingFlow] Processing data:', inputData);
    
    // Simulate some processing
    const result = {
      processed: true,
      original_event: inputData.event,
      timestamp: new Date().toISOString()
    };

    // The return value of this node will be the HTTP response
    return result;
  }
}

const myDataFlow = new AsyncFlow(new DataProcessingFlow());

// --- Main Flow: Set up the WebhookNode and simulate a call ---
(async () => {
  console.log('--- Running WebhookNode Example (waitForFlow: true) ---');

  // 1. Set up the WebhookNode to wait for the flow
  const webhookNode = new WebhookNode();
  webhookNode.setParams({
    port: 3001, // Use a different port for this example
    path: '/webhook-wait',
    flow: myDataFlow,
    waitForFlow: true // Key parameter
  });

  // Start the webhook listener in the background
  const webhookFlow = new AsyncFlow(webhookNode);
  webhookFlow.runAsync({});
  console.log('Webhook listener started on http://localhost:3001/webhook-wait');
  console.log('Waiting for 1 second before simulating a webhook call...');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. Simulate an incoming webhook call
  console.log('\n--- Simulating incoming webhook call ---');
  const simulateWebhookCall = new HttpRequestNode();
  simulateWebhookCall.setParams({
    url: 'http://localhost:3001/webhook-wait',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { event: 'data.process', data: { value: 42 } }
  });

  try {
    // The 'response' here will be the result of myDataFlow
    const response = await new AsyncFlow(simulateWebhookCall).runAsync({});
    console.log('Simulated Webhook Call Response (from flow):', response);
  } catch (error) {
    console.error('Simulated Webhook Call Failed:', error.message);
  }

  console.log('\n--- WebhookNode Example Finished ---');
  // In a real app, you would keep the process alive.
  process.exit();
})();
```
