import { AsyncNode } from '../qflow.js';
import { exec } from 'child_process';
import os from 'os';

export class InteractiveInputNode extends AsyncNode {
  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
  }

  async execAsync() {
    const { prompt, title = 'QFlow Input', defaultValue = '' } = this.params;

    if (!prompt) {
      throw new Error('InteractiveInputNode requires a `prompt` parameter.');
    }

    let command = '';
    const platform = os.platform();

    switch (platform) {
      case 'linux':
        let linuxCommand = '';
        try {
          await new Promise((res, rej) => exec('which zenity', (e) => e ? rej(e) : res()));
          linuxCommand = `zenity --entry --title="${title}" --text="${prompt}" --entry-text="${defaultValue}"`;
        } catch (e) {
          try {
            await new Promise((res, rej) => exec('which kdialog', (e) => e ? rej(e) : res()));
            linuxCommand = `kdialog --inputbox "${prompt}" "${defaultValue}" --title "${title}"`;
          } catch (e2) {
            throw new Error('No GUI input tool (zenity or kdialog) found on Linux. Please install one or use UserInputNode.');
          }
        }
        command = linuxCommand;
        break;
      case 'darwin': // macOS
        // osascript -e 'set T to text returned of (display dialog "PROMPT" default answer "DEFAULT" with title "TITLE")'
        command = `osascript -e 'set T to text returned of (display dialog "${prompt}" default answer "${defaultValue}" with title "${title}")'`;
        break;
      case 'win32': // Windows
        // PowerShell for input box
        // (New-Object -TypeName Microsoft.VisualBasic.Interaction).InputBox("PROMPT", "TITLE", "DEFAULT")
        command = `powershell -Command "(New-Object -TypeName Microsoft.VisualBasic.Interaction).InputBox(\"${prompt}\", \"${title}\", \"${defaultValue}\")"`;
        break;
      default:
        throw new Error(`Unsupported platform for InteractiveInputNode: ${platform}`);
    }

    console.log(`[InteractiveInputNode] Executing: ${command}`);

    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          // User cancelled the dialog or tool not found
          console.error(`InteractiveInputNode error: ${error.message}`);
          // Differentiate between user cancellation and actual error
          if (error.code === 1 && platform === 'linux' && error.message.includes('zenity')) {
            // Zenity returns 1 on cancel
            return resolve(null); // Or reject with a specific message
          }
          if (error.message.includes('User canceled')) { // osascript cancel
            return resolve(null);
          }
          return reject(error);
        }
        if (stderr) {
          console.warn(`InteractiveInputNode stderr: ${stderr}`);
        }
        const userInput = stdout.trim();
        console.log(`User input received: "${userInput}"`);
        resolve(userInput);
      });
    });
  }
}