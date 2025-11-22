## HttpServerNode

The `HttpServerNode` is a powerful, general-purpose node designed to create a web server and handle HTTP requests by triggering a qflow flow.

### Parameters

When you create an `HttpServerNode`, you can configure it with the following parameters in the `setParams` method:

*   `port` (number, optional, default: 3000): The port on which the server will listen for requests.
*   `flow` (AsyncFlow, required): The qflow `AsyncFlow` instance that will be triggered to handle every incoming HTTP request.
*   `waitForFlow` (boolean, optional, default: false): This parameter controls the response behavior:
    *   If `false` (the default), the server triggers the flow in a "fire-and-forget" manner. It does not wait for the flow to complete, and it is up to your flow to send a response to the client using the `res` object.
    *   If `true`, the server will await the completion of the entire flow. It will then automatically take the return value of the flow, convert it to a JSON string, and send it as the HTTP response with a 200 OK status. If the flow throws an error, it will send a generic `500 Flow execution failed` error.

### Request Handling

For every HTTP request the server receives, regardless of the path or method, it does the following:

1.  **Parses the Request**: It parses the URL, including the path and any query string parameters. It also attempts to parse the request body as JSON if a body exists.
2.  **Creates a `shared` Object**: It constructs a `shared` object that contains all the information about the request and passes it to the flow you provided. This `shared` object has the following structure:

    ```json
    {
      "webhook": {
        "req": "The raw Node.js HTTP request object.",
        "res": "The raw Node.js HTTP response object.",
        "headers": "An object containing all the request headers.",
        "payload": "The parsed JSON request body (or undefined if no body).",
        "method": "The HTTP method of the request (e.g., 'GET', 'POST').",
        "path": "The path of the request (e.g., '/workflows').",
        "query": "An object containing the parsed query string parameters."
      }
    }
    ```

3.  **Triggers the Flow**: It calls `runAsync` on your flow, passing in the `shared` object.

### Response Handling

Your flow has full control over the HTTP response by using the `res` object located at `shared.webhook.res`. You can:

*   Set the status code: `res.writeHead(201, { 'Content-Type': 'application/json' });`
*   Set headers: `res.setHeader('X-Custom-Header', 'value');`
*   Send a response and end the connection: `res.end(JSON.stringify({ message: 'Success!' }));`

The `waitForFlow: true` parameter provides a convenient shortcut for simple request-response flows where the entire result of the flow is the response body. For more complex scenarios, you can leave `waitForFlow: false` and manage the `res` object manually within your flow.

### Example Usage

#### Simple "Hello World" Server

This example shows a basic server that sends a simple text response.

```javascript
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { HttpServerNode } from '@fractal-solutions/qflow/nodes';

const simpleFlow = new AsyncFlow();
const helloNode = new AsyncNode();

helloNode.execAsync = async (prepRes, shared) => {
    const { res } = shared.webhook;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World!');
};

simpleFlow.start(helloNode);

const server = new HttpServerNode();
server.setParams({
    port: 3000,
    flow: simpleFlow,
    waitForFlow: false
});

console.log('Server running at http://localhost:3000/');
```

#### Handling Multiple Routes

The `HttpServerNode` listens on a single port and passes all requests to your flow. You can handle different paths and methods within your flow to create a complete API.

This example demonstrates a router that handles multiple endpoints (`/status`, `/workflows`, `/users/:id`).

```javascript
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { HttpServerNode } from '@fractal-solutions/qflow/nodes';

const routerFlow = new AsyncFlow();
const routerNode = new AsyncNode();

// This single node is your entire API router.
// It receives EVERY request that comes into the server.
rrouterNode.execAsync = async function(prepRes, shared) {
    const { path, method, payload, query, res } = shared.webhook;

    // --- Route 1: GET /status ---
    if (path === '/status' && method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok', timestamp: new Date() }));
    }

    // --- Route 2: POST /workflows ---
    if (path === '/workflows' && method === 'POST') {
        const { id } = payload;
        // In a real app, you would trigger a workflow based on the ID
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: `Triggering workflow ${id}` }));
    }

    // --- Route 3: GET /users/:id (with path parameters) ---
    const userMatch = path.match(/^\/users\/([a-zA-Z0-9]+)$/);
    if (userMatch && method === 'GET') {
        const userId = userMatch[1]; // Extract the user ID from the path
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: `Fetching data for user ${userId}` }));
    }

    // --- Route 4: GET /search (with query parameters) ---
    if (path === '/search' && method === 'GET') {
        const searchTerm = query.q; // Access the 'q' query parameter
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: `You searched for: ${searchTerm}` }));
    }

    // --- Default 404 Not Found ---
    // This is the catch-all if no other routes match.
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Not Found' }));
};

routerFlow.start(routerNode);

export const server = new HttpServerNode();
server.setParams({
    port: 3000,
    flow: routerFlow,
    waitForFlow: false // Set to false so we can control the response in the node
});

console.log('Multi-route server running at http://localhost:3000/');
console.log('Try the following endpoints:');
console.log('  curl http://localhost:3000/status');
console.log('  curl -X POST -H "Content-Type: application/json" -d \'{"id":"2"}\' http://localhost:3000/workflows');
console.log('  curl http://localhost:3000/users/123');
console.log('  curl "http://localhost:3000/search?q=hello+world"');
```