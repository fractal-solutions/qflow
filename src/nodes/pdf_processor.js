import { AsyncNode, AsyncFlow } from '@/qflow.js';
import { ShellCommandNode, ReadFileNode } from './index.js'; // Assuming these are in the same nodes directory
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

export class PDFProcessorNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "pdf_processor",
      description: "Extracts text or images from PDF documents.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "The absolute path to the PDF file."
          },
          action: {
            type: "string",
            enum: ["extract_text", "extract_images"],
            description: "The action to perform: 'extract_text' or 'extract_images'."
          },
          outputDir: {
            type: "string",
            description: "Optional. Directory to save extracted files. If not provided, a temporary directory will be used."
          },
          pageRange: {
            type: "object",
            properties: {
              start: { type: "number" },
              end: { type: "number" }
            },
            description: "Optional. Page range to process (e.g., {start: 1, end: 5})."
          },
          password: {
            type: "string",
            description: "Optional. Password for encrypted PDFs."
          }
        },
        required: ["filePath", "action"]
      }
    };
  }

  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
  }

  async execAsync() {
    const { filePath, action, outputDir, pageRange, password } = this.params;

    if (!filePath) {
      throw new Error('PDFProcessorNode requires a `filePath` parameter.');
    }
    if (!action || !['extract_text', 'extract_images'].includes(action)) {
      throw new Error('PDFProcessorNode requires an `action` parameter: "extract_text" or "extract_images".');
    }

    const tempOutputDir = outputDir || path.join(os.tmpdir(), `qflow_pdf_output_${Date.now()}`);
    await fs.mkdir(tempOutputDir, { recursive: true });

    let command = '';
    let result = {};

    switch (action) {
      case 'extract_text':
        // Requires 'pdftotext' (from poppler-utils)
        const outputTextFilePath = path.join(tempOutputDir, `${path.basename(filePath, path.extname(filePath))}.txt`);
        command = `pdftotext "${filePath}" "${outputTextFilePath}"`;
        if (pageRange) command += ` -f ${pageRange.start} -l ${pageRange.end}`;
        if (password) command += ` -opw "${password}"`; // Owner password
        // User password: -upw "password"

        try {
          const shellNode = new ShellCommandNode();
          shellNode.setParams({ command: command });
          await new AsyncFlow(shellNode).runAsync({});

          const readNode = new ReadFileNode();
          readNode.setParams({ filePath: outputTextFilePath });
          const textContent = await new AsyncFlow(readNode).runAsync({});
          result = { text: textContent, outputFilePath: outputTextFilePath };
        } catch (e) {
          throw new Error(`Failed to extract text using pdftotext: ${e.message}. Is pdftotext installed and in your PATH?`);
        }
        break;

      case 'extract_images':
        // Requires 'pdfimages' (from poppler-utils)
        const imagePrefix = path.join(tempOutputDir, path.basename(filePath, path.extname(filePath)));
        command = `pdfimages -png "${filePath}" "${imagePrefix}"`; // -png for PNG format
        if (pageRange) command += ` -f ${pageRange.start} -l ${pageRange.end}`;
        if (password) command += ` -opw "${password}"`;

        try {
          const shellNode = new ShellCommandNode();
          shellNode.setParams({ command: command });
          await new AsyncFlow(shellNode).runAsync({});

          const extractedImages = await fs.readdir(tempOutputDir);
          const imageFiles = extractedImages.filter(file => file.startsWith(path.basename(filePath, path.extname(filePath))) && (file.endsWith('.png') || file.endsWith('.jpg')));
          result = { imageCount: imageFiles.length, outputDirectory: tempOutputDir, imageFiles: imageFiles.map(f => path.join(tempOutputDir, f)) };
        } catch (e) {
          throw new Error(`Failed to extract images using pdfimages: ${e.message}. Is pdfimages installed and in your PATH?`);
        }
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    // Clean up temporary directory if it was created by this node and not specified by user
    if (!outputDir) {
      // Consider adding a cleanup mechanism or making it explicit for the user
      // For now, we'll leave it for inspection.
    }

    return result;
  }
}
