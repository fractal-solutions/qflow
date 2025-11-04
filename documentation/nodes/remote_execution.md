## RemoteExecutionNode

The `RemoteExecutionNode` executes commands on remote machines via SSH.

### Parameters

*   `host`: The hostname or IP address of the remote machine.
*   `port`: Optional. The SSH port. Defaults to 22.
*   `username`: The username for SSH authentication.
*   `password`: Optional. The password for SSH authentication (use with caution, prefer privateKey).
*   `privateKey`: Optional. The content of the private SSH key or its absolute path.
*   `passphrase`: Optional. The passphrase for an encrypted private key.
*   `action`: The action to perform. Currently only 'execute_command' is supported.
*   `command`: The command string to execute on the remote machine.
*   `timeout`: Optional. Timeout in milliseconds for the command execution. Defaults to 30000 (30 seconds).

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { RemoteExecutionNode } from '@fractal-solutions/qflow/nodes';
import path from 'path';
import os from 'os';

(async () => {
  console.log('--- Running RemoteExecutionNode Example ---');

  // --- IMPORTANT: Configuration ---
  // Replace with your actual remote server details.
  // For security, prefer using SSH keys over passwords.
  const REMOTE_HOST = 'your_remote_host_or_ip'; // e.g., '192.168.1.100', 'my-server.example.com'
  const REMOTE_USERNAME = 'your_username'; // e.g., 'ubuntu', 'ec2-user'
  // const REMOTE_PASSWORD = process.env.REMOTE_SSH_PASSWORD; // Set as environment variable (use with caution!)
  const REMOTE_PRIVATE_KEY_PATH = path.join(os.homedir(), '.ssh', 'id_rsa'); // Path to your private key
  // const REMOTE_PASSPHRASE = process.env.REMOTE_SSH_PASSPHRASE; // Set as environment variable if key is encrypted

  console.log(`\n[Setup] This example requires a remote SSH server and proper authentication configured.`);
  console.log("[Setup] Ensure 'ssh2' library is installed (`npm install ssh2` or `bun add ssh2`).");

  // --- Example: Execute a simple command ---
  console.log('\n--- Executing "ls -l /" on remote host ---');
  const lsCommandNode = new RemoteExecutionNode();
  lsCommandNode.setParams({
    host: REMOTE_HOST,
    username: REMOTE_USERNAME,
    // password: REMOTE_PASSWORD, // Uncomment if using password auth
    privateKey: REMOTE_PRIVATE_KEY_PATH, // Uncomment if using private key auth
    // passphrase: REMOTE_PASSPHRASE, // Uncomment if private key is encrypted
    action: 'execute_command',
    command: 'ls -l /'
  });

  try {
    const result = await new AsyncFlow(lsCommandNode).runAsync({});
    console.log('Command executed successfully:');
    console.log('  Stdout:\n', result.stdout);
    if (result.stderr) console.warn('  Stderr:\n', result.stderr);
    console.log('  Exit Code:', result.exitCode);
  } catch (error) {
    console.error('Command execution failed:', error.message);
  }

  console.log('\n--- RemoteExecutionNode Example Finished ---');
})();
```
```
