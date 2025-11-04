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
