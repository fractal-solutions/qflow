import { AsyncNode } from '../qflow.js';
import { exec } from 'child_process';
import os from 'os';

export class SystemNotificationNode extends AsyncNode {
  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
  }

  async execAsync() {
    const { message, title = 'QFlow', icon = '' } = this.params;

    if (!message) {
      throw new Error('SystemNotificationNode requires a `message` parameter.');
    }

    let command = '';
    const platform = os.platform();

    switch (platform) {
      case 'linux':
        // Requires 'notify-send' (libnotify-bin package)
        command = `notify-send "${title}" "${message}"`;
        if (icon) command += ` -i "${icon}"`;
        break;
      case 'darwin': // macOS
        command = `osascript -e 'display notification "${message}" with title "${title}"'`;
        // osascript doesn't directly support icons in this simple form
        break;
      case 'win32': // Windows
        // Using PowerShell for a simple message box.
        // For more advanced toast notifications, a dedicated module or more complex script would be needed.
        command = `powershell -Command "[System.Windows.Forms.MessageBox]::Show(\"${message}\", \"${title}\")"`;
        break;
      default:
        throw new Error(`Unsupported platform for SystemNotificationNode: ${platform}`);
    }

    console.log(`[SystemNotificationNode] Executing: ${command}`);

    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`SystemNotificationNode error: ${error.message}`);
          return reject(error);
        }
        if (stderr) {
          console.warn(`SystemNotificationNode stderr: ${stderr}`);
        }
        console.log(`Notification displayed: "${message}"`);
        resolve({ message, title, stdout, stderr });
      });
    });
  }
}
