import { AsyncNode } from '../qflow.js';
import { exec } from 'child_process';
import os from 'os';

export class DisplayImageNode extends AsyncNode {
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

    console.log(`[DisplayImageNode] Executing: ${command}`);

    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`DisplayImageNode error: ${error.message}`);
          return reject(error);
        }
        if (stderr) {
          console.warn(`DisplayImageNode stderr: ${stderr}`);
        }
        console.log(`Image opened: ${imagePath}`);
        resolve({ imagePath, stdout, stderr });
      });
    });
  }
}
