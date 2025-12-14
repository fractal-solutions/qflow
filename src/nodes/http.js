import { AsyncNode } from '../qflow.js';
import { log } from '../logger.js';

/**
 * A flexible node for making generic HTTP requests to any REST API.
 * @param {object} params - The parameters for the node.
 * @param {string} params.url - The full URL of the API endpoint.
 * @param {string} [params.method='GET'] - The HTTP method (e.g., 'POST', 'PUT', 'DELETE').
 * @param {object} [params.headers] - Custom headers for the request.
 * @param {*} [params.body] - The request payload. If it's an object, it will be stringified as JSON.
 * @param {object} [params.auth] - Authentication configuration.
 * @param {'bearer'|'basic'} [params.auth.type] - The type of authentication.
 * @param {string} [params.auth.token] - The bearer token.
 * @param {string} [params.auth.username] - The username for basic auth.
 * @param {string} [params.auth.password] - The password for basic auth.
 * @returns {Promise<object>} A promise that resolves to a structured object containing the status, headers, and body of the response.
 */
export class HttpRequestNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "http_request",
      description: "Makes HTTP requests.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full URL of the API endpoint."
          },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            default: "GET",
            description: "The HTTP method to use."
          },
          headers: {
            type: "object",
            description: "Custom headers for the request (key-value pairs)."
          },
          body: {
            type: "object", // Can be any type, but object is common for JSON
            description: "The request payload. If an object, it will be stringified as JSON."
          },
          auth: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["bearer", "basic"],
                description: "The type of authentication."
              },
              token: {
                type: "string",
                description: "The bearer token."
              },
              username: {
                type: "string",
                description: "The username for basic auth."
              },
              password: {
                type: "string",
                description: "The password for basic auth."
              }
            },
            description: "Authentication configuration."
          }
        },
        required: ["url"]
      }
    };
  }

  async execAsync() {
    const { url, method = 'GET', headers = {}, body, auth } = this.params;

    if (!url) {
      throw new Error('HttpRequestNode requires a `url` parameter.');
    }

    const fetchOptions = {
      method,
      headers: { ...headers }, // Create a mutable copy
    };

    // Handle Authentication
    if (auth) {
      if (auth.type === 'bearer' && auth.token) {
        fetchOptions.headers['Authorization'] = `Bearer ${auth.token}`;
      } else if (auth.type === 'basic' && auth.username && auth.password) {
        const credentials = btoa(`${auth.username}:${auth.password}`);
        fetchOptions.headers['Authorization'] = `Basic ${credentials}`;
      }
    }

    // Handle Body
    if (body) {
      if (typeof body === 'object' && !fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(body);
      } else {
        fetchOptions.body = body;
      }
    }

    log(`[HTTP] ${method} ${url}`, this.params.logging);
    const response = await fetch(url, fetchOptions);

    const responseBody = await this.parseResponseBody(response);

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
    };
  }

  async parseResponseBody(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  }

  async postAsync(shared, prepRes, execRes) {
    shared.httpResult = execRes;
    return 'default';
  }
}
