
import { AsyncNode } from '@/qflow.js';
import { promises as fs } from 'fs';
import path from 'path';
import { log } from '@/logger.js';

/**
 * Reads a file from the file system.
 * @param {object} params - The parameters for the node.
 * @param {string} params.filePath - The path to the file to read.
 * @returns {Promise<string>} A promise that resolves to the content of the file.
 */
export class ReadFileNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "read_file",
      description: "Reads file content.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "The absolute path to the file to read."
          }
        },
        required: ["filePath"]
      }
    };
  }

  async execAsync() {
    const { filePath } = this.params;

    if (!filePath) {
      throw new Error('Missing required parameter: filePath');
    }

    log(`[FileSystem] Reading file: ${filePath}`, this.params.logging);
    const content = await fs.readFile(filePath, 'utf-8');
    log(`[FileSystem] Successfully read file: ${filePath}`, this.params.logging);
    return content;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.fileContent = execRes;
    return 'default';
  }
}

/**
 * Writes a file to the file system.
 * @param {object} params - The parameters for the node.
 * @param {string} params.filePath - The path to the file to write.
 * @param {string} params.content - The content to write to the file.
 * @returns {Promise<void>} A promise that resolves when the file has been written.
 */
export class WriteFileNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "write_file",
      description: "Writes content to a file.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "The absolute path to the file to write to."
          },
          content: {
            type: "string",
            description: "The content to write to the file."
          }
        },
        required: ["filePath", "content"]
      }
    };
  }

  async execAsync() {
    const { filePath, content } = this.params;

    if (!filePath || content === undefined) {
      throw new Error('Missing required parameters: filePath, content');
    }

    log(`[FileSystem] Writing to file: ${filePath}`, this.params.logging);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    log(`[FileSystem] Successfully wrote to file: ${filePath}`, this.params.logging);
    return 'default';
  }
}

/**
 * Appends content to a file.
 * @param {object} params - The parameters for the node.
 * @param {string} params.filePath - The path to the file to append to.
 * @param {string} params.content - The content to append to the file.
 * @returns {Promise<void>} A promise that resolves when the content has been appended.
 */
export class AppendFileNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "append_file",
      description: "Appends content to a file.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "The absolute path to the file to append to."
          },
          content: {
            type: "string",
            description: "The content to append to the file."
          }
        },
        required: ["filePath", "content"]
      }
    };
  }

  async execAsync() {
    const { filePath, content } = this.params;

    if (!filePath || content === undefined) {
      throw new Error('Missing required parameters: filePath, content');
    }

    log(`[FileSystem] Appending to file: ${filePath}`, this.params.logging);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, content, 'utf-8');
    log(`[FileSystem] Successfully appended to file: ${filePath}`, this.params.logging);
    return 'default';
  }
}

/**
 * Lists the files in a directory.
 * @param {object} params - The parameters for the node.
 * @param {string} params.directoryPath - The path to the directory to list.
 * @returns {Promise<string[]>} A promise that resolves to an array of file names.
 */
export class ListDirectoryNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "list_directory",
      description: "Lists directory contents.",
      parameters: {
        type: "object",
        properties: {
          directoryPath: {
            type: "string",
            description: "The absolute path to the directory to list."
          }
        },
        required: ["directoryPath"]
      }
    };
  }

  async execAsync() {
    const { directoryPath } = this.params;

    if (!directoryPath) {
      throw new Error('Missing required parameter: directoryPath');
    }

    log(`[FileSystem] Listing directory: ${directoryPath}`, this.params.logging);
    const files = await fs.readdir(directoryPath);
    log(`[FileSystem] Successfully listed directory: ${directoryPath}`, this.params.logging);
    return files;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.directoryFiles = execRes;
    return 'default';
  }
}
