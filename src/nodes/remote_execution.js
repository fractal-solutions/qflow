import { AsyncNode } from '../qflow.js';
// You would need to install the 'ssh2' library: npm install ssh2
import { Client } from 'ssh2';
import { log } from '../logger.js';

export class RemoteExecutionNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "remote_execution",
      description: "Executes commands on remote machines via SSH.",
      parameters: {
        type: "object",
        properties: {
          host: {
            type: "string",
            description: "The hostname or IP address of the remote machine."
          },
          port: {
            type: "number",
            description: "Optional. The SSH port. Defaults to 22."
          },
          username: {
            type: "string",
            description: "The username for SSH authentication."
          },
          password: {
            type: "string",
            description: "Optional. The password for SSH authentication (use with caution, prefer privateKey)."
          },
          privateKey: {
            type: "string",
            description: "Optional. The content of the private SSH key or its absolute path."
          },
          passphrase: {
            type: "string",
            description: "Optional. The passphrase for an encrypted private key."
          },
          action: {
            type: "string",
            enum: ["execute_command"],
            description: "The action to perform. Currently only 'execute_command' is supported."
          },
          command: {
            type: "string",
            description: "The command string to execute on the remote machine."
          },
          timeout: {
            type: "number",
            description: "Optional. Timeout in milliseconds for the command execution. Defaults to 30000 (30 seconds)."
          }
        },
        required: ["host", "username", "action", "command"]
      }
    };
  }

  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
  }

  async execAsync() {
    const {
      host,
      port = 22,
      username,
      password, // Use with caution, prefer privateKey
      privateKey, // Path to private key file or content
      passphrase, // For encrypted private key
      action, // 'execute_command'
      command, // Command to execute
      timeout = 30000 // Timeout for command execution
    } = this.params;

    if (!host || !username) {
      throw new Error('RemoteExecutionNode requires `host` and `username`.');
    }
    if (!action || action !== 'execute_command') {
      throw new Error('RemoteExecutionNode currently only supports `action: "execute_command"`.');
    }
    if (!command) {
      throw new Error('RemoteExecutionNode `execute_command` action requires a `command`.');
    }
    if (!password && !privateKey) {
      throw new Error('RemoteExecutionNode requires either `password` or `privateKey` for authentication.');
    }

    const conn = new Client();
    let result = {};

    try {
      await new Promise((resolve, reject) => {
        conn.on('ready', () => {
          log(`[RemoteExecutionNode] Connected to ${username}@${host}:${port}`, this.params.logging);
          resolve();
        }).on('error', (err) => {
          reject(new Error(`SSH connection error: ${err.message}`));
        }).connect({
          host: host,
          port: port,
          username: username,
          password: password,
          privateKey: privateKey ? (privateKey.startsWith('/') ? require('fs').readFileSync(privateKey) : privateKey) : undefined, // Read from file if path, else use content
          passphrase: passphrase,
          readyTimeout: timeout // Timeout for connection to become ready
        });
      });

      // Execute command
      await new Promise((resolve, reject) => {
        conn.exec(command, { pty: false, x11: false, env: {} }, (err, stream) => {
          if (err) return reject(new Error(`SSH command execution error: ${err.message}`));

          let stdout = '';
          let stderr = '';
          let exitCode = null;
          let signal = null;

          stream.on('data', (data) => {
            stdout += data.toString();
          }).stderr.on('data', (data) => {
            stderr += data.toString();
          }).on('close', (code, sig) => {
            exitCode = code;
            signal = sig;
            resolve();
          }).on('end', () => {
            // Stream ended
          });
        });
      });

      result = { status: 'command_executed', command: command, stdout: stdout, stderr: stderr, exitCode: exitCode, signal: signal };

    } catch (e) {
      throw new Error(`Remote execution failed: ${e.message}`);
    } finally {
      if (conn && conn.connected) {
        conn.end();
        log(`[RemoteExecutionNode] Disconnected from ${host}`, this.params.logging);
      }
    }

    return result;
  }
}
