import { AsyncNode, AsyncFlow } from '../qflow.js';
import { UserInputNode } from './user.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

let nodeChildProcess = null;
if (!process.versions.bun) {
  nodeChildProcess = require('child_process');
}

export class CodeInterpreterNode extends AsyncNode {
  async execAsync() {
    const { code, timeout = 30000, args = [], requireConfirmation = true } = this.params;

    if (!code) {
      throw new Error('CodeInterpreterNode requires a `code` parameter.');
    }

    const tempDir = os.tmpdir();
    const tempFileName = `qflow_python_code_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.py`;
    const tempFilePath = path.join(tempDir, tempFileName);
    const interpreterCommand = 'python';

    console.log(`[CodeInterpreter] Proposed execution: ${interpreterCommand} ${tempFilePath}`);
    console.log(`[CodeInterpreter] Code to execute:\n${code}`);

    // --- User Confirmation ---
    // --- User Confirmation ---
    if (requireConfirmation) {
      const confirmNode = new UserInputNode();
      confirmNode.setParams({
        prompt: `The agent wants to execute the following Python code:\n${code}\nDo you approve? (yes/no): `
      });
      const confirmFlow = new AsyncFlow(confirmNode);
      const confirmation = await confirmFlow.runAsync({});

      if (confirmation.toLowerCase() !== 'yes') {
        throw new Error('Code execution denied by user.');
      }
    }
    // --- End User Confirmation ---
    // --- End User Confirmation ---

    try {
      await fs.writeFile(tempFilePath, code, 'utf-8');

      let stdout = '';
      let stderr = '';
      let exitCode = 1; // Default to failure

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

          // Await stdout and stderr first
          stdout = await new Response(childProcess.stdout).text();
          stderr = await new Response(childProcess.stderr).text();

          const bunExitResult = await childProcess.exited;

          if (abortController.signal.aborted) {
            stderr += `\nExecution timed out after ${timeout}ms.`;
            exitCode = 1; // Indicate failure due to timeout
          } else {
            exitCode = Number(bunExitResult !== null ? bunExitResult : 1); // Ensure exitCode is a number
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
          exitCode = exitCodeFromClose !== null ? exitCodeFromClose : (signalFromClose ? 1 : 1); // If signal, treat as failure

        } else {
          throw new Error('Unsupported runtime environment.');
        }

      } catch (error) {
        if (error.name === "AbortError" || error.code === "ABORT_ERR") { // Handle AbortError for both Bun and Node
          stderr += `
Execution timed out after ${timeout}ms.`;
          exitCode = 1; // Indicate failure due to timeout
        } else if (error.code === 'ENOENT') {
          stderr += `\nError: Command '${interpreterCommand}' not found. Please ensure it is installed and in your system's PATH.`;
          exitCode = 1;
        } else {
          stderr += `
Error during execution: ${error.message}`;
          exitCode = 1;
        }
      } finally {
        clearTimeout(timeoutId);
      }

      

      return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };

    } finally {
      // Clean up temporary file
      await fs.unlink(tempFilePath).catch(e => console.error(`Failed to delete temp file ${tempFilePath}:`, e));
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.codeInterpreterResult = execRes;
    return 'default';
  }
}