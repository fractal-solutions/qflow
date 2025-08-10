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
  const REMOTE_PASSWORD = process.env.REMOTE_SSH_PASSWORD; // Set as environment variable (use with caution!)
  const REMOTE_PRIVATE_KEY_PATH = path.join(os.homedir(), '.ssh', 'id_rsa'); // Path to your private key
  const REMOTE_PASSPHRASE = process.env.REMOTE_SSH_PASSPHRASE; // Set as environment variable if key is encrypted

  console.log(`\n[Setup] Attempting to connect to ${REMOTE_USERNAME}@${REMOTE_HOST}`);
  console.log("[Setup] Ensure 'ssh2' library is installed (`npm install ssh2` or `bun add ssh2`).");
  console.log("[Setup] Ensure remote SSH server is running and accessible.");
  console.log("[Setup] Configure REMOTE_SSH_PASSWORD or REMOTE_PRIVATE_KEY_PATH/REMOTE_PASSPHRASE.");

  // --- Example 1: Execute a simple command ---
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

  // --- Example 2: Execute a command that might not exist (demonstrate error handling) ---
  console.log('\n--- Executing "non_existent_command" on remote host (expecting error) ---');
  const errorCommandNode = new RemoteExecutionNode();
  errorCommandNode.setParams({
    host: REMOTE_HOST,
    username: REMOTE_USERNAME,
    // password: REMOTE_PASSWORD, // Uncomment if using password auth
    privateKey: REMOTE_PRIVATE_KEY_PATH, // Uncomment if using private key auth
    // passphrase: REMOTE_PASSPHRASE, // Uncomment if private key is encrypted
    action: 'execute_command',
    command: 'non_existent_command'
  });

  try {
    const result = await new AsyncFlow(errorCommandNode).runAsync({});
    console.log('Command executed successfully (unexpected):', result);
  } catch (error) {
    console.error('Command execution failed as expected:', error.message);
  }

  console.log('\n--- RemoteExecutionNode Example Finished ---');
})();