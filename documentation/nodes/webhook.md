## WebhookNode

The `WebhookNode` exposes an HTTP endpoint to receive webhooks, triggering a specified qflow flow.

### Parameters

*   `port`: Optional. The port number to listen on. Defaults to 3000.
*   `path`: Optional. The URL path for the webhook endpoint. Defaults to '/webhook'.
*   `flow`: The name of the qflow AsyncFlow instance to trigger when a webhook is received.
*   `sharedSecret`: Optional. A shared secret for HMAC verification of incoming webhooks.
*   `responseStatus`: Optional. The HTTP status code to send back to the webhook sender. Defaults to 200.
*   `responseBody`: Optional. The JSON body to send back to the webhook sender. Defaults to { status: 'received' }.
