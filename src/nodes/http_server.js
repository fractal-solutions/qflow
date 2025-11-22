import { AsyncNode, AsyncFlow } from '../qflow.js';
import http from 'http';
import { URL } from 'url';

export class HttpServerNode extends AsyncNode {
    constructor(maxRetries = 1, wait = 0) {
        super(maxRetries, wait);
        this.server = null;
        this.flowToTrigger = null;
    }

    async execAsync() {
        const {
            port = 3000,
            flow,
            waitForFlow = false
        } = this.params;

        if (!flow || !(flow instanceof AsyncFlow)) {
            throw new Error('HttpServerNode requires a `flow` parameter of type AsyncFlow to trigger.');
        }
        this.flowToTrigger = flow;

        if (this.server && this.server.listening) {
            console.warn(`[HttpServerNode] Server already listening on port ${port}. Reusing existing server.`);
            return { status: 'server_already_running', port };
        }

        this.server = http.createServer(async (req, res) => {
            const requestUrl = new URL(req.url, `http://${req.headers.host}`);
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                let payload;
                if (body) {
                    try {
                        payload = JSON.parse(body);
                    } catch (e) {
                        console.error('[HttpServerNode] Failed to parse request body as JSON:', e);
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
                        return;
                    }
                }

                const triggeredFlowShared = {
                    webhook: {
                        req,
                        res,
                        headers: req.headers,
                        payload,
                        method: req.method,
                        path: requestUrl.pathname,
                        query: Object.fromEntries(requestUrl.searchParams)
                    }
                };

                if (waitForFlow) {
                    try {
                        const flowResult = await this.flowToTrigger.runAsync(triggeredFlowShared);
                        if (!res.writableEnded) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(flowResult));
                        }
                    } catch (flowError) {
                        console.error('[HttpServerNode] Triggered flow failed:', flowError);
                        if (!res.writableEnded) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Flow execution failed' }));
                        }
                    }
                } else {
                    this.flowToTrigger.runAsync(triggeredFlowShared).catch(flowError => {
                        console.error('[HttpServerNode] Triggered flow failed:', flowError);
                    });
                }
            });
        });

        await new Promise(resolve => {
            this.server.listen(port, () => {
                console.log(`[HttpServerNode] Listening for requests on http://localhost:${port}`);
                resolve();
            });
        });

        return { status: 'listening', port };
    }

    async postAsync(shared, prepRes, execRes) {
        // The server should not be closed here.
        return execRes;
    }
}
