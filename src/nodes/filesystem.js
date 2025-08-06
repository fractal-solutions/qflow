
import { AsyncNode } from '../qflow.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Reads a file from the file system.
 * @param {object} params - The parameters for the node.
 * @param {string} params.filePath - The path to the file to read.
 * @returns {Promise<string>} A promise that resolves to the content of the file.
 */
export class ReadFileNode extends AsyncNode {
  async execAsync() {
    const { filePath } = this.params;

    if (!filePath) {
      throw new Error('Missing required parameter: filePath');
    }

    console.log(`[FileSystem] Reading file: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`[FileSystem] Successfully read file: ${filePath}`);
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
  async execAsync() {
    const { filePath, content } = this.params;

    if (!filePath || content === undefined) {
      throw new Error('Missing required parameters: filePath, content');
    }

    console.log(`[FileSystem] Writing to file: ${filePath}`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`[FileSystem] Successfully wrote to file: ${filePath}`);
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
  async execAsync() {
    const { filePath, content } = this.params;

    if (!filePath || content === undefined) {
      throw new Error('Missing required parameters: filePath, content');
    }

    console.log(`[FileSystem] Appending to file: ${filePath}`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, content, 'utf-8');
    console.log(`[FileSystem] Successfully appended to file: ${filePath}`);
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
  async execAsync() {
    const { directoryPath } = this.params;

    if (!directoryPath) {
      throw new Error('Missing required parameter: directoryPath');
    }

    console.log(`[FileSystem] Listing directory: ${directoryPath}`);
    const files = await fs.readdir(directoryPath);
    console.log(`[FileSystem] Successfully listed directory: ${directoryPath}`);
    return files;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.directoryFiles = execRes;
    return 'default';
  }
}
