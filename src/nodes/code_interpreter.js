import { AsyncNode, AsyncFlow } from '@/qflow.js';
import { UserInputNode } from './user.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { log } from '@/logger.js';

let nodeChildProcess = null;
if (!process.versions.bun) {
  nodeChildProcess = require('child_process');
}

function syntaxHighlight(code) {
  return code
    .replace(/\b(def|class|import|from|return|if|else|elif|for|while|with|try|except|finally|raise|assert|yield|lambda|pass|continue|break)\b/g, chalk.blue.bold('$1'))
    .replace(/("""[\s\S]*?""")/g, chalk.hex('#6272a4').italic('$1')) 
    .replace(/('''[\s\S]*?''')/g, chalk.hex('#6272a4').italic('$1')) 
    .replace(/(".*?")/g, chalk.hex('#f1fa8c')('$1')) 
    .replace(/('.*?')/g, chalk.hex('#f1fa8c')('$1')) 
    .replace(/#.*/g, chalk.hex('#6272a4').italic('$&'))
    .replace(/\b(True|False|None)\b/g, chalk.hex('#bd93f9').bold('$1'))
    .replace(/\b(self|cls)\b/g, chalk.hex('#ffb86c').italic('$1'));
}

export class CodeInterpreterNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "code_interpreter",
      description: "Executes Python code (requires user confirmation).",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The Python code snippet to execute."
          },
          timeout: {
            type: "number",
            description: "Optional. Maximum execution time in milliseconds. Defaults to 30000 (30 seconds)."
          },
          args: {
            type: "array",
            items: { type: "string" },
            description: "Optional. Command-line arguments to pass to the script."
          },
          requireConfirmation: {
            type: "boolean",
            description: "Optional. If true, the user will be prompted for confirmation before executing the code. Defaults to true."
          }
        },
        required: ["code"]
      }
    };
  }

  async execAsync() {
    const { code, timeout = 30000, args = [], requireConfirmation = true, interpreterPath } = this.params;

    if (!code) {
      throw new Error('CodeInterpreterNode requires a `code` parameter.');
    }

    const tempDir = os.tmpdir();
    const tempFileName = `qflow_python_code_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.py`;
    const tempFilePath = path.join(tempDir, tempFileName);
    const interpreterCommand = interpreterPath || 'python';

    log(`Executing code with interpreter: ${interpreterCommand}`, this.params.logging);
    if (!requireConfirmation) log(`Code to execute:\n${code}`, this.params.logging);

    if (requireConfirmation) {
      const confirmNode = new UserInputNode();
      confirmNode.setParams({
        prompt: `The agent wants to execute the following Python code:\n${syntaxHighlight(code)}\nDo you approve? (yes/no): `
      });
      const confirmFlow = new AsyncFlow(confirmNode);
      const confirmation = await confirmFlow.runAsync({});

      if (confirmation.toLowerCase() !== 'yes') {
        throw new Error('Code execution denied by user.');
      }
    }

    try {
      await fs.writeFile(tempFilePath, code, 'utf-8');

      let stdout = '';
      let stderr = '';
      let exitCode = 1;

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeout);

      try {
        if (process.versions.bun) {
          const childProcess = Bun.spawn([interpreterCommand, tempFilePath, ...args], {
            stdin: 'inherit',
            stdout: 'pipe',
            stderr: 'pipe',
            signal: abortController.signal,
          });

          stdout = await new Response(childProcess.stdout).text();
          stderr = await new Response(childProcess.stderr).text();

          const bunExitResult = await childProcess.exited;

          if (abortController.signal.aborted) {
            stderr += `\nExecution timed out after ${timeout}ms.`;
            exitCode = 1;
          } else {
            exitCode = Number(bunExitResult !== null ? bunExitResult : 1);
          }

        } else if (nodeChildProcess) {
          const childProcess = nodeChildProcess.spawn(interpreterCommand, [tempFilePath, ...args], {
            stdio: ['inherit', 'pipe', 'pipe'],
            signal: abortController.signal,
          });

          const stdoutChunks = [];
          const stderrChunks = [];

          childProcess.stdout.on('data', (data) => stdoutChunks.push(data));
          childProcess.stderr.on('data', (data) => stderrChunks.push(data));

          const { code: exitCodeFromClose, signal: signalFromClose } = await new Promise((resolve, reject) => {
            childProcess.on('close', (code, signal) => resolve({ code, signal }));
            childProcess.on('error', (err) => reject(err));
          });

          stdout = Buffer.concat(stdoutChunks).toString('utf-8');
          stderr = Buffer.concat(stderrChunks).toString('utf-8');
          exitCode = exitCodeFromClose !== null ? exitCodeFromClose : (signalFromClose ? 1 : 1);

        } else {
          throw new Error('Unsupported runtime environment.');
        }

      } catch (error) {
        if (error.name === "AbortError" || error.code === "ABORT_ERR") {
          stderr += `\nExecution timed out after ${timeout}ms.`;
          exitCode = 1;
        } else if (error.code === 'ENOENT') {
          stderr += `\nError: Command '${interpreterCommand}' not found. Please ensure it is installed and in your system's PATH.`;
          exitCode = 1;
        } else {
          stderr += `\nError during execution: ${error.message}`;
          exitCode = 1;
        }
      } finally {
        clearTimeout(timeoutId);
      }

      return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };

    } finally {
      await fs.unlink(tempFilePath).catch(e => log(`Failed to delete temp file ${tempFilePath}:`, this.params.logging, { type: 'error' }));
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.codeInterpreterResult = execRes;
    return 'default';
  }
}
