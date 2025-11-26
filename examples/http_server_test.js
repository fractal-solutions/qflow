import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { HttpServerNode } from '../src/nodes/http_server.js';
import { HttpRequestNode } from '../src/nodes/http.js';
import { WriteFileNode } from '../src/nodes/filesystem.js';
import { ShellCommandNode } from '../src/nodes/shell.js';
import path from 'path';

// --- Define Flows to be served by the HTTP Server ---

// 1. A simple flow that returns a JSON welcome message
class WelcomeFlow extends AsyncNode {
    async execAsync(prepRes, shared) {
        console.log('[WelcomeFlow] Handling request for /');
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: { message: 'Welcome to the qflow HTTP Server!' }
        };
    }
}
const welcomeFlow = new AsyncFlow(new WelcomeFlow());

// 2. A flow that uses path parameters
class UserFlow extends AsyncNode {
    async execAsync(prepRes, shared) {
        const userId = shared.request.params.id;
        console.log(`[UserFlow] Handling request for user: ${userId}`);
        return {
            statusCode: 200,
            body: { user: { id: userId, name: `User ${userId}` } }
        };
    }
}
const userFlow = new AsyncFlow(new UserFlow());

// 3. A flow that handles POST requests
class CreateItemFlow extends AsyncNode {
    async execAsync(prepRes, shared) {
        const item = shared.request.body;
        console.log('[CreateItemFlow] Creating new item:', item);
        // In a real app, you'd save this to a database
        return {
            statusCode: 201, // Created
            body: { status: 'created', item: { ...item, id: Date.now() } }
        };
    }
}
const createItemFlow = new AsyncFlow(new CreateItemFlow());


// --- Main Flow to Start the Server and Test It ---

(async () => {
    console.log('--- Running HttpServerNode Test Workflow ---');

    const PORT = 3001;
    const STATIC_DIR = path.join(process.cwd(), 'http_server_static_test');
    const STATIC_FILE_PATH = path.join(STATIC_DIR, 'index.html');
    const STATIC_FILE_CONTENT = '<h1>Hello Static World!</h1>';

    // --- Setup Static File ---
    const createStaticDir = new ShellCommandNode();
    createStaticDir.setParams({ command: `mkdir -p ${STATIC_DIR}` });

    const createStaticFile = new WriteFileNode();
    createStaticFile.setParams({
        filePath: STATIC_FILE_PATH,
        content: STATIC_FILE_CONTENT
    });

    // 1. Define the server routes
    const serverRoutes = {
        '/': {
            'GET': welcomeFlow
        },
        '/users/:id': {
            'GET': userFlow
        },
        '/items': {
            'POST': createItemFlow
        }
    };

    // 2. Instantiate the HttpServerNode
    const serverNode = new HttpServerNode();
    serverNode.setParams({
        port: PORT,
        routes: serverRoutes,
        staticDir: STATIC_DIR,
        cors: { // Add CORS config for demonstration
            origin: '*',
            methods: 'GET,POST,OPTIONS',
            headers: 'Content-Type,Authorization'
        }
    });

    // 3. Define nodes to test the server after it starts
    const testGetRoot = new HttpRequestNode();
    testGetRoot.setParams({ url: `http://localhost:${PORT}/` });
    testGetRoot.postAsync = async (s, p, res) => {
        console.log('\n--- Test GET / ---');
        console.log('Response:', res.body);
        console.log('------------------\n');
        return 'default';
    };

    const testGetUser = new HttpRequestNode();
    testGetUser.setParams({ url: `http://localhost:${PORT}/users/123` });
    testGetUser.postAsync = async (s, p, res) => {
        console.log('--- Test GET /users/123 ---');
        console.log('Response:', res.body);
        console.log('-------------------------\n');
        return 'default';
    };

    const testPostItem = new HttpRequestNode();
    testPostItem.setParams({
        url: `http://localhost:${PORT}/items`,
        method: 'POST',
        body: { name: 'My New Item', value: 42 }
    });
    testPostItem.postAsync = async (s, p, res) => {
        console.log('--- Test POST /items ---');
        console.log('Response:', res.body);
        console.log('------------------------\n');
        return 'default';
    };

    const testGetStaticFile = new HttpRequestNode();
    testGetStaticFile.setParams({ url: `http://localhost:${PORT}/index.html` });
    testGetStaticFile.postAsync = async (s, p, res) => {
        console.log('--- Test GET /index.html (Static) ---');
        console.log('Response Body:', res.body);
        if (res.body.trim() === STATIC_FILE_CONTENT) {
            console.log('Static file content matches. Test PASSED.');
        } else {
            console.error('Static file content MISMATCH. Test FAILED.');
        }
        console.log('-------------------------------------\n');
        return 'default';
    };

    // A node to stop the server after tests
    class StopServerNode extends AsyncNode {
        async execAsync(prepRes, shared) {
            if (shared.httpServer) {
                console.log('[MainFlow] Stopping HTTP server...');
                shared.httpServer.close();
                return { message: 'Server stopped' };
            }
            return { message: 'Server instance not found.' };
        }
    }
    const stopServerNode = new StopServerNode();

    // A node to clean up the static directory
    const cleanupNode = new ShellCommandNode();
    cleanupNode.setParams({ command: `rm -rf ${STATIC_DIR}` });
    cleanupNode.postAsync = async () => {
        console.log('[MainFlow] Cleaned up static test directory.');
        return 'default';
    };

    // 4. Chain the nodes for the main flow
    const delayNode = new (class extends AsyncNode {
        async execAsync() {
            await new Promise(resolve => setTimeout(resolve, 500));
            return 'default';
        }
    })();

    createStaticDir.next(createStaticFile)
	    .next(serverNode)
	    .next(delayNode)
	    .next(testGetRoot)
	    .next(testGetUser)
	    .next(testPostItem)
	    .next(testGetStaticFile)
	    .next(stopServerNode)
	    .next(cleanupNode);

    // 5. Create and run the main flow
    const mainFlow = new AsyncFlow(createStaticDir);

    try {
        await mainFlow.runAsync({});
        console.log('\n--- HttpServerNode Test Workflow Finished ---');
    } catch (error) {
        console.error('\n--- HttpServerNode Test Workflow Failed ---', error);
        // Ensure server is closed on failure too
        const server = serverNode.server;
        if (server && server.listening) {
            server.close();
        }
        // Also attempt cleanup on failure
        await new ShellCommandNode().setParams({ command: `rm -rf ${STATIC_DIR}` }).runAsync({});
    }
})();
