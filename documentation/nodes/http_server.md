# HttpServerNode

The `HttpServerNode` is a powerful node that allows you to create a fully-featured HTTP server within a qflow workflow. It can handle dynamic routes by triggering other flows, serve static files, and manage CORS headers, making it ideal for building simple APIs or web backends.

## Purpose

Use the `HttpServerNode` to listen for incoming HTTP requests and delegate them to specific `AsyncFlow` instances based on the request's path and method. This turns your qflow workflows into web-accessible endpoints.

## Parameters

| Parameter   | Type     | Description                                                                                                                                                           | Default     |
|-------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------|
| `port`      | `number` | The port number for the server to listen on.                                                                                                                          | `3000`      |
| `routes`    | `object` | An object defining the dynamic routes. The keys are URL paths (e.g., `/`, `/users/:id`), and the values are objects mapping HTTP methods (e.g., `GET`, `POST`) to `AsyncFlow` instances. | `{}`        |
| `staticDir` | `string` | The absolute or relative path to a directory from which to serve static files (e.g., HTML, CSS, images).                                                               | `undefined` |
| `cors`      | `object` | A configuration object for enabling and customizing Cross-Origin Resource Sharing (CORS) headers.                                                                     | `undefined` |

### `routes` Object Structure

The `routes` object maps URL paths to method-specific flow handlers.

```javascript
const serverRoutes = {
    // A simple GET route
    '/': {
        'GET': welcomeFlow
    },
    // A route with a path parameter
    '/users/:id': {
        'GET': userFlow
    },
    // A route that handles POST requests
    '/items': {
        'POST': createItemFlow
    }
};
```

### `cors` Object Structure

The `cors` object allows you to specify standard CORS headers.

```javascript
const corsConfig = {
    origin: '*', // or 'https://your-frontend-domain.com'
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    headers: 'Content-Type,Authorization'
};
```

## Triggered Flow Context

When a dynamic route is matched, the corresponding `AsyncFlow` is triggered. The flow receives a `request` object within its `shared` state (`shared.request`).

The `shared.request` object contains:
- `headers`: An object of request headers.
- `body`: The parsed JSON payload (if the request body is valid JSON) or the raw string body.
- `method`: The HTTP request method (e.g., `GET`, `POST`).
- `path`: The URL path.
- `query`: An object containing the URL query string parameters.
- `params`: An object containing parameters extracted from the URL path (e.g., `{ id: '123' }` for a `/users/123` request to a `/users/:id` route).

## Triggered Flow Response

The triggered flow is expected to return a response object that the `HttpServerNode` will use to reply to the client.

The response object should have the following structure:
- `statusCode` (optional, `number`): The HTTP status code. Defaults to `200`.
- `headers` (optional, `object`): An object of response headers. Defaults to `{ 'Content-Type': 'application/json' }` if the body is an object.
- `body` (optional, `string | object | Buffer`): The response body. Objects will be automatically stringified as JSON.

If the flow returns `null` or `undefined`, a `204 No Content` response will be sent.

## Example: Mock API with Static Files

Here is a more robust example demonstrating how to build a simple mock API that also serves static files (e.g., an `index.html`).

### 1. File Structure

For this example, assume you have the following file structure. The server will serve dynamic API routes and also serve any files placed in the `public` directory.

```
.
├── your_script.js
└── public/
    └── index.html
```

Create a `public` directory and place an `index.html` file inside it with some content, like `<h1>Welcome to the Static Site!</h1>`.

### 2. Server Script (`your_script.js`)

The script will define the API routes and tell the server to serve static files from the `public` directory.

```javascript
import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { HttpServerNode } from '../src/nodes/http_server.js';
import path from 'path'; // Import path module

// --- In-Memory "Database" ---
const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
];
let nextUserId = 3;

// --- API Logic Flows ---

// Flow to handle GET /api/users
class ListUsersFlow extends AsyncNode {
    async execAsync() {
        console.log('[API] Responding with all users.');
        return { statusCode: 200, body: users };
    }
}
const listUsersFlow = new AsyncFlow(new ListUsersFlow());

// Flow to handle GET /api/users/:id
class GetUserFlow extends AsyncNode {
    async execAsync(prepRes, shared) {
        const userId = parseInt(shared.request.params.id, 10);
        const user = users.find(u => u.id === userId);
        console.log(`[API] Searching for user with ID: ${userId}`);

        if (user) {
            return { statusCode: 200, body: user };
        } else {
            return { statusCode: 404, body: { error: 'User not found' } };
        }
    }
}
const getUserFlow = new AsyncFlow(new GetUserFlow());

// Flow to handle POST /api/users
class CreateUserFlow extends AsyncNode {
    async execAsync(prepRes, shared) {
        const { name } = shared.request.body;
        if (!name) {
            return { statusCode: 400, body: { error: 'Name is required' } };
        }
        const newUser = { id: nextUserId++, name };
        users.push(newUser);
        console.log('[API] Created new user:', newUser);
        return { statusCode: 201, body: newUser };
    }
}
const createUserFlow = new AsyncFlow(new CreateUserFlow());


// --- Server Setup ---

// 1. Define the routes for our User API
const apiRoutes = {
    '/api/users': {
        'GET': listUsersFlow,
        'POST': createUserFlow
    },
    '/api/users/:id': {
        'GET': getUserFlow
    }
};

// 2. Create a flow to start the server
(async () => {
    const serverNode = new HttpServerNode();
    serverNode.setParams({
        port: 3001,
        routes: apiRoutes,
        staticDir: path.join(process.cwd(), 'public'), // Serve files from the 'public' directory
        cors: { origin: '*' } // Allow all origins for the example
    });

    const serverFlow = new AsyncFlow(serverNode);

    try {
        // This will start the server and keep the process running
        await serverFlow.runAsync({});
        console.log('API server and static file server is running on http://localhost:3001. Press Ctrl+C to stop.');
    } catch (error) {
        console.error('Failed to start server:', error);
    }
})();
```

### Testing the API and Static Files

You can test this server with `curl` in another terminal:

**Get the static `index.html` file:**
```sh
curl http://localhost:3001/index.html
```

**Get all users (dynamic API route):**
```sh
curl http://localhost:3001/api/users
```

**Get user with ID 1 (dynamic API route):**
```sh
curl http://localhost:3001/api/users/1
```

**Create a new user named "Charlie" (dynamic API route):**
```sh
curl -X POST -H "Content-Type: application/json" -d '{"name": "Charlie"}' http://localhost:3001/api/users
```
