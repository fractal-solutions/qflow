import { AsyncNode, AsyncFlow } from '../qflow.js';
import http from 'http';
import { URL } from 'url';
import path from 'path';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import { log } from '../logger.js';

// Basic mime-type lookup to avoid adding new dependencies
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.txt': 'text/plain',
    };
    return types[ext] || 'application/octet-stream';
}

export class HttpServerNode extends AsyncNode {
    constructor() {
        super();
        this.server = null;
    }

    // Helper to find a matching route and extract params
    findMatchingRoute(routes, method, path) {
        for (const routePath in routes) {
            const routeHandlers = routes[routePath];
            const paramNames = [];
            // Convert route path to regex, e.g., /users/:id -> /users/([^/]+)
            const regexPath = routePath.replace(/:(\w+)/g, (_, paramName) => {
                paramNames.push(paramName);
                return '([^/]+)';
            });
            const regex = new RegExp(`^${regexPath}$`);
            const match = path.match(regex);

            if (match) {
                const handler = routeHandlers[method.toUpperCase()];
                if (handler) {
                    const params = {};
                    paramNames.forEach((name, index) => {
                        params[name] = match[index + 1];
                    });
                    return { flow: handler, params };
                }
            }
        }
        return null;
    }

    // Helper to serve static files
    async handleStatic(staticDir, reqPath, res) {
        if (!staticDir) return false;

        // Prevent directory traversal attacks
        const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.join(staticDir, safePath);

        try {
            const stats = await fsPromises.stat(filePath);
            if (stats.isFile()) {
                const mimeType = getMimeType(filePath);
                res.writeHead(200, { 'Content-Type': mimeType });
                // Create a read stream and pipe it to the response
                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(res);
                return true;
            }
        } catch (e) {
            // File doesn't exist, fall through to dynamic routing
        }
        return false;
    }

    // Helper to apply CORS headers
    applyCorsHeaders(res, corsConfig) {
        if (!corsConfig) return;
        if (corsConfig.origin) {
            res.setHeader('Access-Control-Allow-Origin', corsConfig.origin);
        }
        if (corsConfig.methods) {
            res.setHeader('Access-Control-Allow-Methods', corsConfig.methods);
        }
        if (corsConfig.headers) {
            res.setHeader('Access-Control-Allow-Headers', corsConfig.headers);
        }
    }

    async execAsync() {
        const {
            port = 3000,
            routes = {},
            staticDir,
            cors
        } = this.params;

        if (this.server && this.server.listening) {
            log(`[HttpServerNode] Server already listening on port ${port}.`, this.params.logging, { type: 'warn' });
            return { status: 'server_already_running', port };
        }

        this.server = http.createServer(async (req, res) => {
            // Apply CORS headers to all responses
            this.applyCorsHeaders(res, cors);

            // Handle CORS pre-flight OPTIONS request
            if (cors && req.method === 'OPTIONS') {
                res.writeHead(204); // No Content
                res.end();
                return;
            }

            const requestUrl = new URL(req.url, `http://${req.headers.host}`);
            const reqPath = requestUrl.pathname;

            // 1. Try to serve static file
            if (staticDir) {
                const served = await this.handleStatic(staticDir, reqPath, res);
                if (served) return;
            }

            // 2. Find a matching dynamic route
            const routeMatch = this.findMatchingRoute(routes, req.method, reqPath);

            if (!routeMatch) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not Found' }));
                return;
            }

            const { flow, params: pathParams } = routeMatch;
            if (!(flow instanceof AsyncFlow)) {
                log(`[HttpServerNode] Handler for ${req.method} ${reqPath} is not an AsyncFlow.`, this.params.logging, { type: 'error' });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal Server Error: Invalid handler' }));
                return;
            }

            // 3. Process request body and trigger flow
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                let payload;
                if (body) {
                    try {
                        payload = JSON.parse(body);
                    } catch (e) {
                        payload = body; // Not JSON, treat as raw string
                    }
                }

                const requestContext = {
                    headers: req.headers,
                    body: payload,
                    method: req.method,
                    path: reqPath,
                    query: Object.fromEntries(requestUrl.searchParams),
                    params: pathParams
                };

                try {
                    const flowResult = await flow.runAsync({ request: requestContext });

                    const response = flowResult || { statusCode: 204, body: '' };
                    const statusCode = response.statusCode || 200;
                    const headers = response.headers || {};
                    let responseBody = response.body;

                    if (typeof responseBody === 'object' && !(responseBody instanceof Buffer)) {
                        responseBody = JSON.stringify(responseBody);
                        if (!headers['Content-Type']) {
                            headers['Content-Type'] = 'application/json';
                        }
                    }

                    res.writeHead(statusCode, headers);
                    res.end(responseBody);

                } catch (flowError) {
                    log(`[HttpServerNode] Flow for ${req.method} ${reqPath} failed:`, this.params.logging, { type: 'error' });
                    if (!res.writableEnded) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Flow execution failed', details: flowError.message }));
                    }
                }
            });
        });

        await new Promise((resolve, reject) => {
            this.server.on('error', (err) => {
                log(`[HttpServerNode] Failed to start server on port ${port}:`, this.params.logging, { type: 'error' });
                reject(err);
            });
            this.server.listen(port, () => {
                log(`[HttpServerNode] Listening on http://localhost:${port}`, this.params.logging);
                resolve();
            });
        });

        return { status: 'listening', port };
    }

    async postAsync(shared, prepRes, execRes) {
        shared.httpServer = this.server;
        return 'default';
    }
}
