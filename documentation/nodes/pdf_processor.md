## PDFProcessorNode

The `PDFProcessorNode` extracts text or images from PDF documents.

### Parameters

*   `filePath`: The absolute path to the PDF file.
*   `action`: The action to perform: 'extract_text' or 'extract_images'.
*   `outputDir`: Optional. Directory to save extracted files. If not provided, a temporary directory will be used.
*   `pageRange`: Optional. Page range to process (e.g., {start: 1, end: 5}).
*   `password`: Optional. Password for encrypted PDFs.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { PDFProcessorNode } from '@fractal-solutions/qflow/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

(async () => {  
    console.log('--- Running PDFProcessorNode Example ---');  
    const currentDir = process.cwd(); // Get current working directory
  const tempDir = os.tmpdir(); // Used for temporary output files
  const dummyPdfPath = path.join(currentDir, 'example.pdf'); // Use example.pdf in current directory

  console.log("[Setup] Please ensure you have an 'example.pdf' file in your current directory:");
  console.log(`[Setup] ${dummyPdfPath}`);
  console.log("[Setup] This example will attempt to process that file.");
  console.log("[Setup] If 'example.pdf' does not exist, the example will fail.");

  // --- Example: Extract All Text ---
  console.log('\n--- Extracting All Text from PDF ---');
  const extractAllTextNode = new PDFProcessorNode();
  extractAllTextNode.setParams({
    filePath: dummyPdfPath,
    action: 'extract_text',
    outputDir: tempDir // Save extracted text to tempDir
    // password: 'your_password' // Uncomment and set if PDF is password protected
  });

  try {
    const textResult = await new AsyncFlow(extractAllTextNode).runAsync({});
    console.log('Extracted All Text (first 200 chars):', textResult.text.substring(0, 200) + '...');
    console.log('Extracted All Text saved to:', textResult.outputFilePath);
  } catch (error) {
    console.error('All Text Extraction Failed:', error.message);
  }

  console.log('\n--- PDFProcessorNode Example Finished ---');

  // --- Cleanup ---
  // Clean up all generated files and directories
  try {
    console.log('\n[Cleanup] Cleaning up generated files and directories...');
    await fs.rm(path.join(tempDir, 'example_all_extracted.txt'), { force: true }).catch(() => {});
    console.log('[Cleanup] Cleanup complete.');
  } catch (e) {
    console.warn('[Cleanup] Failed to remove some temporary files/directories:', e.message);
  }
})();
```
