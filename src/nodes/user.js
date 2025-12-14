
import { AsyncNode } from '../qflow.js';
import readline from 'readline';

/**
 * Prompts the user for input and waits for their response.
 * @param {object} params - The parameters for the node.
 * @param {string} params.prompt - The message to display to the user.
 * @returns {Promise<string>} A promise that resolves to the user's input.
 */
export class UserInputNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "user_input",
      description: "Prompts user for input.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The message to display to the user."
          }
        },
        required: ["prompt"]
      }
    };
  }

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
      // ANSI escape codes for yellow text
      const yellowPrompt = `\x1b[33m${prompt}\x1b[0m`;
      rl.question(yellowPrompt, (answer) => {
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
