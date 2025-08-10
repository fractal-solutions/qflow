
import { AsyncFlow } from '../src/qflow.js';
import { WebSocketsNode } from '../src/nodes/websockets.js';

(async () => {
  console.log('--- Running WebSockets Test Workflow ---');

  // 1. Connect to the WebSocket server
  const connectNode = new WebSocketsNode();
  connectNode.setParams({
    action: 'connect',
    url: 'wss://echo.websocket.org/', // A public echo server
  });

  // 2. Send a message
  const sendNode = new WebSocketsNode();
  sendNode.setParams({
    action: 'send',
    message: { text: 'Hello from qflow!' },
  });

  // 3. Receive the echoed message
  const receiveNode = new WebSocketsNode();
  receiveNode.setParams({
    action: 'receive',
  });

  // 4. Close the connection
  const closeNode = new WebSocketsNode();
  closeNode.setParams({
    action: 'close',
  });

  // Chain the nodes
  connectNode.next(sendNode);
  sendNode.next(receiveNode);
  receiveNode.next(closeNode);

  // Create and run the flow
  const webSocketFlow = new AsyncFlow(connectNode);

  try {
    const finalResult = await webSocketFlow.runAsync({});
    console.log('WebSocket workflow finished successfully.');
    console.log('Final received message:', finalResult);
  } catch (error) {
    console.error('WebSocket workflow failed:', error);
  }
})();
