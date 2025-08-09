import { AsyncFlow } from '../src/qflow.js';
import { PDFProcessorNode, WriteFileNode, ReadFileNode, ShellCommandNode } from '../src/nodes';
import path from 'path';import os from 'os';
import { promises as fs } from 'fs';

(async () => {  
    console.log('--- Running PDFProcessorNode Example ---');  
    const currentDir = process.cwd(); // Get current working directory
  const tempDir = os.tmpdir(); // Used for temporary output files
  const dummyPdfPath = path.join(currentDir, 'example.pdf'); // Use example.pdf in current directory

  // Define paths for extracted content
  const extractedTextAllPath = path.join(tempDir, 'example_all_extracted.txt');
  const extractedTextPage2Path = path.join(tempDir, 'example_page2_extracted.txt');
  const extractedImagesAllDir = path.join(tempDir, 'example_images_all');
  const extractedImagesPage1Dir = path.join(tempDir, 'example_images_page1');

  console.log("[Setup] Please ensure you have an 'example.pdf' file in your current directory:");
  console.log(`[Setup] ${dummyPdfPath}`);
  console.log("[Setup] This example will attempt to process that file.");
  console.log("[Setup] If 'example.pdf' does not exist, the example will fail.");

  // --- Example 1: Extract All Text ---
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

  // --- Example 2: Extract Text from a Specific Page Range ---
  console.log('\n--- Extracting Text from Page 2 of PDF ---');
  const extractPage2TextNode = new PDFProcessorNode();
  extractPage2TextNode.setParams({
    filePath: dummyPdfPath,
    action: 'extract_text',
    outputDir: tempDir,
    pageRange: { start: 2, end: 2 } // Extract only from page 2
  });

  try {
    const page2TextResult = await new AsyncFlow(extractPage2TextNode).runAsync({});
    console.log('Extracted Page 2 Text (first 200 chars):', page2TextResult.text.substring(0, 200) + '...');
    console.log('Extracted Page 2 Text saved to:', page2TextResult.outputFilePath);
  } catch (error) {
    console.error('Page 2 Text Extraction Failed:', error.message);
  }

  // --- Example 3: Extract All Images ---
  console.log('\n--- Extracting All Images from PDF ---');
  const extractAllImagesNode = new PDFProcessorNode();
  extractAllImagesNode.setParams({
    filePath: dummyPdfPath,
    action: 'extract_images',
    outputDir: extractedImagesAllDir // Save extracted images to a dedicated directory
  });

  try {
    const imageResult = await new AsyncFlow(extractAllImagesNode).runAsync({});
    console.log('Extracted All Image Count:', imageResult.imageCount);
    console.log('Extracted All Images saved to:', imageResult.outputDirectory);
    console.log('All Image Files:', imageResult.imageFiles);
  } catch (error) {
    console.error('All Image Extraction Failed:', error.message);
  }

  // --- Example 4: Extract Images from a Specific Page Range (e.g., Page 1) ---
  console.log('\n--- Extracting Images from Page 1 of PDF ---');
  const extractPage1ImagesNode = new PDFProcessorNode();
  extractPage1ImagesNode.setParams({
    filePath: dummyPdfPath,
    action: 'extract_images',
    outputDir: extractedImagesPage1Dir, // Save extracted images to a dedicated directory
    pageRange: { start: 3, end: 4 } // Extract only from page 1
  });

  try {
    const page1ImageResult = await new AsyncFlow(extractPage1ImagesNode).runAsync({});
    console.log('Extracted Page 1 Image Count:', page1ImageResult.imageCount);
    console.log('Extracted Page 1 Images saved to:', page1ImageResult.outputDirectory);
    console.log('Page 1 Image Files:', page1ImageResult.imageFiles);
  } catch (error) {
    console.error('Page 1 Image Extraction Failed:', error.message);
  }

  console.log('\n--- PDFProcessorNode Example Finished ---');

  // --- Cleanup ---
  // Clean up all generated files and directories
  try {
    console.log('\n[Cleanup] Cleaning up generated files and directories...');
    await fs.rm(extractedTextAllPath, { force: true }).catch(() => {});
    await fs.rm(extractedTextPage2Path, { force: true }).catch(() => {});
    await fs.rm(extractedImagesAllDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(extractedImagesPage1Dir, { recursive: true, force: true }).catch(() => {});
    console.log('[Cleanup] Cleanup complete.');
  } catch (e) {
    console.warn('[Cleanup] Failed to remove some temporary files/directories:', e.message);
  }
})();