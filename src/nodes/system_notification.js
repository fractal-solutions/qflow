import { AsyncNode } from '../qflow.js';
import { exec } from 'child_process';
import os from 'os';
import { log } from '../logger.js';

export class SystemNotificationNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "system_notification",
      description: "Displays a system-level notification across OSs.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The main message content of the notification."
          },
          title: {
            type: "string",
            description: "Optional. The title of the notification. Defaults to 'QFlow Notification'."
          },
          icon: {
            type: "string",
            description: "Optional. Path to an icon file or a system icon name (Linux specific). Ignored on macOS/Windows."
          }
        },
        required: ["message"]
      }
    };
  }

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

    log(`[SystemNotificationNode] Executing: ${command}`, this.params.logging);

    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          log(`SystemNotificationNode error: ${error.message}`, this.params.logging, { type: 'error' });
          return reject(error);
        }
        if (stderr) {
          log(`SystemNotificationNode stderr: ${stderr}`, this.params.logging, { type: 'warn' });
        }
        log(`Notification displayed: "${message}"`, this.params.logging);
        resolve({ message, title, stdout, stderr });
      });
    });
  }
}
