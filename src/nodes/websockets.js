
import { AsyncNode } from '@/qflow.js';
import WebSocket from 'ws';

export class WebSocketsNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "websockets",
      description: "Establishes and manages WebSocket connections.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["connect", "send", "receive", "close"],
            description: "The WebSocket action to perform."
          },
          url: {
            type: "string",
            description: "The URL of the WebSocket server (for 'connect' action)."
          },
          message: {
            type: "string",
            description: "The message to send to the server (for 'send' action)."
          }
        },
        required: ["action"]
      }
    };
  }

  async execAsync(prepRes, shared) {
    const {
      action,
      url,
      message,
      timeout = 5000, // 5-second timeout
    } = this.params;

    const connection = shared.webSocketConnection;

    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`WebSocket action '${action}' timed out after ${timeout}ms`)), timeout);

      try {
        switch (action) {
          case 'connect':
            if (!url) throw new Error('`url` parameter is required for `connect` action.');
            const ws = new WebSocket(url);
            ws.on('open', () => {
              clearTimeout(timer);
              shared.webSocketConnection = ws;
              resolve({ message: `WebSocket connected to ${url}` });
            });
            ws.on('error', (err) => {
              clearTimeout(timer);
              reject(err);
            });
            break;

          case 'send':
            if (!connection) throw new Error('No active WebSocket connection found.');
            if (message === undefined) throw new Error('`message` parameter is required for `send` action.');
            const dataToSend = typeof message === 'object' ? JSON.stringify(message) : message;
            connection.send(dataToSend);
            clearTimeout(timer);
            resolve({ message: 'Message sent' });
            break;

          case 'receive':
            if (!connection) throw new Error('No active WebSocket connection found.');
            connection.once('message', (data) => {
              clearTimeout(timer);
              try {
                // Try to parse as JSON, otherwise return as string
                resolve(JSON.parse(data.toString()));
              } catch (e) {
                resolve(data.toString());
              }
            });
            connection.once('error', (err) => {
              clearTimeout(timer);
              reject(err);
            });
            break;

          case 'close':
            if (connection) {
              connection.close();
              delete shared.webSocketConnection;
            }
            clearTimeout(timer);
            resolve({ message: 'WebSocket connection closed' });
            break;

          default:
            clearTimeout(timer);
            throw new Error(`Unsupported WebSocket action: ${action}`);
        }
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }
}
