import { AsyncNode, AsyncFlow } from '../qflow.js';
import http from 'http';
import { URL } from 'url'; // Node.js built-in
import crypto from 'crypto'; // Node.js built-in

export class WebHookNode extends AsyncNode {
  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
    this.server = null;
    this.flowToTrigger = null;
    this.webhookPath = null;
    this.sharedSecret = null;
  }

  async execAsync() {
    const {
      port = 3000, // Port to listen on
      path = '/webhook', // URL path for the webhook
      flow, // The qflow AsyncFlow instance to trigger
      sharedSecret, // Optional: for HMAC verification
      responseStatus = 200, // HTTP status to send back
      responseBody = { status: 'received' } // HTTP body to send back
    } = this.params;

    if (!flow || !(flow instanceof AsyncFlow)) {
      throw new Error('WebHookNode requires a `flow` parameter of type AsyncFlow to trigger.');
    }

    this.flowToTrigger = flow;
    this.webhookPath = path;
    this.sharedSecret = sharedSecret;

    // Ensure server is not already running
    if (this.server && this.server.listening) {
      console.warn(`[WebHookNode] Server already listening on port ${port}. Reusing existing server.`);
      return { status: 'server_already_running', port, path };
    }

    this.server = http.createServer(async (req, res) => {
      const requestUrl = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === 'POST' && requestUrl.pathname === this.webhookPath) {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          let payload;
          try {
            payload = JSON.parse(body);
          } catch (e) {
            console.error('[WebHookNode] Failed to parse webhook body as JSON:', e);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            return;
          }

          // --- Security: HMAC Verification (if sharedSecret is provided) ---
          if (this.sharedSecret) {
            const signature = req.headers['x-hub-signature-256'] || req.headers['x-webhook-signature']; // Common headers
            if (!signature) {
              console.warn('[WebHookNode] Webhook received without signature, but sharedSecret is configured.');
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing signature' }));
              return;
            }

            const hmac = crypto.createHmac('sha256', this.sharedSecret);
            hmac.update(body);
            const digest = `sha256=${hmac.digest('hex')}`; // Format might vary (e.g., 'v1=...')

            if (digest !== signature) { // Simple comparison, real-world might need more robust parsing
              console.warn('[WebHookNode] Webhook signature mismatch. Request rejected.');
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid signature' }));
              return;
            }
            console.log('[WebHookNode] Webhook signature verified.');
          }

          console.log(`[WebHookNode] Webhook received on ${this.webhookPath}. Triggering flow...`);
          // Trigger the flow in the background
          // Create a new shared object for the triggered flow, including the webhook payload
          const triggeredFlowShared = { webhook: { headers: req.headers, payload: payload, method: req.method, path: requestUrl.pathname } };
          this.flowToTrigger.runAsync(triggeredFlowShared)
            .then(flowResult => {
              console.log('[WebHookNode] Triggered flow completed successfully:', flowResult);
            })
            .catch(flowError => {
              console.error('[WebHookNode] Triggered flow failed:', flowError);
            });

          // Send response back to webhook sender
          res.writeHead(responseStatus, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(responseBody));
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    await new Promise(resolve => {
      this.server.listen(port, () => {
        console.log(`[WebHookNode] Listening for webhooks on http://localhost:${port}${this.webhookPath}`);
        resolve();
      });
    });

    // This node returns immediately after starting the server.
    // The flow continues, and the server runs in the background.
    return { status: 'listening', port, path: this.webhookPath };
  }

  // Cleanup: Ensure the server is closed when the node's flow completes or is cancelled
  async postAsync(shared, prepRes, execRes) {
    // For a long-running webhook listener, the server should NOT be closed here.
    // The server is intended to run in the background.
    // Cleanup (server.close()) should be handled by the application's shutdown logic
    // or if the WebHookNode is explicitly stopped by another part of the flow.
    // We will remove the automatic server closing here.
    return execRes;
  }
}
