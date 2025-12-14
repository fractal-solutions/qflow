import { AsyncNode } from '../qflow.js';
import { exec } from 'child_process';
import os from 'os';
import { log } from '../logger.js';

export class DisplayImageNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "display_image",
      description: "Displays an image file using the system's default image viewer.",
      parameters: {
        type: "object",
        properties: {
          imagePath: {
            type: "string",
            description: "The absolute path to the image file to display."
          }
        },
        required: ["imagePath"]
      }
    };
  }

  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
  }

  async execAsync() {
    const { imagePath } = this.params;

    if (!imagePath) {
      throw new Error('DisplayImageNode requires an `imagePath` parameter.');
    }

    let command = '';
    const platform = os.platform();

    switch (platform) {
      case 'linux':
        // 'xdg-open' is a standard way to open files with default application on Linux desktops
        command = `xdg-open "${imagePath}"`;
        break;
      case 'darwin': // macOS
        // 'open' command opens files with their default application
        command = `open "${imagePath}"`;
        break;
      case 'win32': // Windows
        // 'start' command opens files with their default application
        command = `start "" "${imagePath}"`; // The first "" is for the title, which is optional but good practice
        break;
      default:
        throw new Error(`Unsupported platform for DisplayImageNode: ${platform}`);
    }

    log(`[DisplayImageNode] Executing: ${command}`, this.params.logging);

    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          log(`DisplayImageNode error: ${error.message}`, this.params.logging, { type: 'error' });
          return reject(error);
        }
        if (stderr) {
          log(`DisplayImageNode stderr: ${stderr}`, this.params.logging, { type: 'warn' });
        }
        log(`Image opened: ${imagePath}`, this.params.logging);
        resolve({ imagePath, stdout, stderr });
      });
    });
  }
}
