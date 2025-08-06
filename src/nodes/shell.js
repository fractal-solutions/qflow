
import { AsyncNode } from '../qflow.js';
import { exec } from 'child_process';

/**
 * Executes a shell command as if in a terminal.
 * @param {object} params - The parameters for the node.
 * @param {string} params.command - The command string to execute (e.g., "ls -l" or "echo 'hello' > file.txt").
 * @returns {Promise<object>} A promise that resolves to an object containing the stdout and stderr of the command.
 */
export class ShellCommandNode extends AsyncNode {
  async execAsync() {
    const { command } = this.params;

    if (!command) {
      throw new Error('Missing required parameter: command');
    }

    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  }

  async postAsync(shared, prepRes, execRes) {
    shared.shellResult = execRes;
    return 'default';
  }
}
