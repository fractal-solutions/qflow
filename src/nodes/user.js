
import { AsyncNode } from '../qflow.js';
import readline from 'readline';

/**
 * Prompts the user for input and waits for their response.
 * @param {object} params - The parameters for the node.
 * @param {string} params.prompt - The message to display to the user.
 * @returns {Promise<string>} A promise that resolves to the user's input.
 */
export class UserInputNode extends AsyncNode {
  async execAsync() {
    const { prompt } = this.params;

    if (!prompt) {
      throw new Error('Missing required parameter: prompt');
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  async postAsync(shared, prepRes, execRes) {
    shared.userInput = execRes;
    return 'default';
  }
}
