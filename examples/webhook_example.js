import { AsyncFlow, AsyncNode, Flow } from '@fractal-solutions/qflow';
import { WebHookNode, SystemNotificationNode } from '@fractal-solutions/qflow/nodes';
import { HttpRequestNode } from '@fractal-solutions/qflow/nodes'; // To simulate a webhook call from within the example

// --- Define a sub-flow to be triggered by the webhook ---
class WebhookTriggeredNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    console.log('\n[WebhookTriggeredFlow] Webhook received! Processing payload...');
    console.log('  Webhook Payload:', shared.webhook.payload);
    console.log('  Webhook Headers:', shared.webhook.headers);

    // Example: Send a system notification based on the webhook payload
    const notificationMessage = `Webhook received from ${shared.webhook.payload.source || 'unknown'}: ${shared.webhook.payload.message || 'No message'}`;
    const notifyNode = new SystemNotificationNode();
    notifyNode.setParams({
      message: notificationMessage,
      title: 'QFlow Webhook Alert'
    });
    await new AsyncFlow(notifyNode).runAsync({});

    return { status: 'processed', payload: shared.webhook.payload };
  }
}

const webhookTriggeredFlow = new AsyncFlow(new WebhookTriggeredNode());

// --- Main Flow: Start the WebHookNode ---
(async () => {
  console.log('--- Running WebHookNode Example ---');

  const WEBHOOK_PORT = 8080; // Choose an available port
  const WEBHOOK_PATH = '/my-custom-webhook';
  const WEBHOOK_SECRET = 'my_super_secret_key'; // Keep this secret!

  // 1. Instantiate the WebHookNode
  const webhookListenerNode = new WebHookNode();
  webhookListenerNode.setParams({
    port: WEBHOOK_PORT,
    path: WEBHOOK_PATH,
    flow: webhookTriggeredFlow, // Pass the actual flow instance
    sharedSecret: WEBHOOK_SECRET,
    responseBody: { status: 'webhook_processed', timestamp: new Date().toISOString() }
  });

  console.log(`[Setup] Starting WebHookNode listener on http://localhost:${WEBHOOK_PORT}${WEBHOOK_PATH}`);
  console.log(`[Setup] Shared Secret for HMAC verification: ${WEBHOOK_SECRET}`);
  console.log(`[Setup] To test, open a new terminal and run:
[Setup]   curl -X POST -H "Content-Type: application/json" 
[Setup]        -H "x-hub-signature-256: sha256=$(echo -n '{"source":"test","message":"Hello from curl!"}' | openssl dgst -sha256 -hmac '${WEBHOOK_SECRET}' | sed 's/^.* //')" 
[Setup]        -d '{"source":"test","message":"Hello from curl!"}' 
[Setup]        http://localhost:${WEBHOOK_PORT}${WEBHOOK_PATH}`);
  console.log(`[Setup] Or, for a simpler test without signature verification (if sharedSecret is removed from params):\n[Setup]   curl -X POST -H "Content-Type: application/json" -d '{\"source\":\"test\",\"message\":\"Simple test\"}' http://localhost:${WEBHOOK_PORT}${WEBHOOK_PATH}`);
  console.log(`[Setup] The WebHookNode will keep listening. Press Ctrl+C to stop this example.`);

  try {
    // Start the webhook listener. This will run in the background.
    const listenerResult = await new AsyncFlow(webhookListenerNode).runAsync({});
    console.log('[MainFlow] WebHookNode started:', listenerResult);

    // Keep the main flow alive so the server continues listening.
    // In a real application, this flow might be long-running or part of a daemon.
    // For this example, we'll just wait indefinitely.
    await new Promise(() => {}); // This promise never resolves, keeping the process alive

  } catch (error) {
    console.error('\n--- WebHookNode Example Failed ---', error);
  } finally {
    // Cleanup is handled by the WebHookNode's postAsync when the flow eventually ends.
    // For this example, it will only run on Ctrl+C or process termination.
  }
})();

/*
To test this webhook example, open a new terminal and run one of the following curl commands:

1. With HMAC Signature Verification (recommended for security):
   Replace 'my_super_secret_key' with the actual secret used in the example.

   curl -X POST -H "Content-Type: application/json" \
        -H "x-hub-signature-256: sha256=$(echo -n '{"source":"test","message":"Hello from curl!"}' | openssl dgst -sha256 -hmac 'my_super_secret_key' | sed 's/^.* //')" \
        -d '{"source":"test","message":"Hello from curl!"}' \
        http://localhost:8080/my-custom-webhook

2. Without Signature Verification (if 'sharedSecret' is removed from WebHookNode params):

   curl -X POST -H "Content-Type: application/json" \
        -d '{"source":"test","message":"Simple test"}' \
        http://localhost:8080/my-custom-webhook

Remember to keep the `bun examples/webhook_example.js` process running in its own terminal.
*/