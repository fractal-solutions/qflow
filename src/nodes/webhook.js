import { AsyncNode, AsyncFlow } from '../qflow.js';
import http from 'http';
import { URL } from 'url'; // Node.js built-in
import crypto from 'crypto'; // Node.js built-in
import { log } from '../logger.js';
export class WebHookNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "webhook",
      description: "Exposes an HTTP endpoint to receive webhooks, triggering a specified qflow flow.",
      parameters: {
        type: "object",
        properties: {
          port: {
            type: "number",
            description: "Optional. The port number to listen on. Defaults to 3000."
          },
          path: {
            type: "string",
            description: "Optional. The URL path for the webhook endpoint. Defaults to '/webhook'."
          },
          flow: {
            type: "string", // This will be the name of a flow in the flowRegistry
            description: "The name of the qflow AsyncFlow instance to trigger when a webhook is received."
          },
          sharedSecret: {
            type: "string",
            description: "Optional. A shared secret for HMAC verification of incoming webhooks."
          },
          responseStatus: {
            type: "number",
            description: "Optional. The HTTP status code to send back to the webhook sender. Defaults to 200."
          },
          responseBody: {
            type: "object",
            description: "Optional. The JSON body to send back to the webhook sender. Defaults to { status: 'received' }."
          }
        },
        required: ["flow"]
      }
    };
  }

  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
    this.server = null;
    this.flowToTrigger = null;
    this.webhookPath = null;
    this.sharedSecret = null;
  }
    async execAsync() {
        const { port = 3000, // Port to listen on
        path = '/webhook', // URL path for the webhook
        flow, // The qflow AsyncFlow instance to trigger
        sharedSecret, // Optional: for HMAC verification
        responseStatus = 200, // HTTP status to send back
        responseBody = { status: 'received' }, // HTTP body to send back
        waitForFlow = false // Whether to wait for the flow to complete
         } = this.params;
        if (!flow || !(flow instanceof AsyncFlow)) {
            throw new Error('WebHookNode requires a `flow` parameter of type AsyncFlow to trigger.');
        }
        this.flowToTrigger = flow;
        this.webhookPath = path;
        this.sharedSecret = sharedSecret;
        // Ensure server is not already running
        if (this.server && this.server.listening) {
            log(`[WebHookNode] Server already listening on port ${port}. Reusing existing server.`, this.params.logging, { type: 'warn' });
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
                    }
                    catch (e) {
                        log('[WebHookNode] Failed to parse webhook body as JSON:', this.params.logging, { type: 'error' });
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
                        return;
                    }
                    // --- Security: HMAC Verification (if sharedSecret is provided) ---
                    if (this.sharedSecret) {
                        const signature = req.headers['x-hub-signature-256'] || req.headers['x-webhook-signature']; // Common headers
                        if (!signature) {
                            log('[WebHookNode] Webhook received without signature, but sharedSecret is configured.', this.params.logging, { type: 'warn' });
                            res.writeHead(401, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Missing signature' }));
                            return;
                        }
                        const hmac = crypto.createHmac('sha256', this.sharedSecret);
                        hmac.update(body);
                        const digest = `sha256=${hmac.digest('hex')}`; // Format might vary (e.g., 'v1=...')
                        if (digest !== signature) { // Simple comparison, real-world might need more robust parsing
                            log('[WebHookNode] Webhook signature mismatch. Request rejected.', this.params.logging, { type: 'warn' });
                            res.writeHead(403, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Invalid signature' }));
                            return;
                        }
                        log('[WebHookNode] Webhook signature verified.', this.params.logging);
                    }
                    log(`[WebHookNode] Webhook received on ${this.webhookPath}. Triggering flow...`, this.params.logging);
                    const triggeredFlowShared = { webhook: { headers: req.headers, payload: payload, method: req.method, path: requestUrl.pathname } };

                    if (this.params.waitForFlow) {
                        try {
                            const flowResult = await this.flowToTrigger.runAsync(triggeredFlowShared);
                            log('[WebHookNode] Triggered flow completed successfully:', this.params.logging);
                            res.writeHead(this.params.responseStatus || 200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(flowResult));
                        } catch (flowError) {
                            log('[WebHookNode] Triggered flow failed:', this.params.logging, { type: 'error' });
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Flow execution failed' }));
                        }
                    } else {
                        this.flowToTrigger.runAsync(triggeredFlowShared)
                            .then(flowResult => {
                            log('[WebHookNode] Triggered flow completed successfully:', this.params.logging);
                        })
                            .catch(flowError => {
                            log('[WebHookNode] Triggered flow failed:', this.params.logging, { type: 'error' });
                        });
                        // Send response back to webhook sender
                        res.writeHead(this.params.responseStatus || 200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(this.params.responseBody || { status: 'received' }));
                    }
                });
            }
            else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        });
        await new Promise(resolve => {
            this.server.listen(port, () => {
                log(`[WebHookNode] Listening for webhooks on http://localhost:${port}${this.webhookPath}`, this.params.logging);
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
