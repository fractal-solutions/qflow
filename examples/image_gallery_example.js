import { AsyncFlow } from '@fractal-solutions/qflow';
import { ImageGalleryNode } from '@fractal-solutions/qflow/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

(async () => {
  console.log('--- Running ImageGalleryNode Example ---');

  const tempDir = os.tmpdir();
  const dummyImageDir = path.join(tempDir, `qflow_gallery_test_images_${Date.now()}`);
  await fs.mkdir(dummyImageDir, { recursive: true });

  const imagePaths = [];
  const base64Png1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 transparent
  const base64PngRed = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='; // 1x1 red
  const base64PngBlue = 'iVBORw0KGgoAAAANSUlEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGD4z8DAwMAAAwAB/w401QAAAABJRU5CYII='; // 1x1 blue

  // Create dummy image files
  for (let i = 0; i < 3; i++) {
    const imgPath = path.join(dummyImageDir, `image_${i + 1}.png`);
    let buffer;
    if (i === 0) buffer = Buffer.from(base64Png1x1, 'base64');
    else if (i === 1) buffer = Buffer.from(base64PngRed, 'base64');
    else buffer = Buffer.from(base64PngBlue, 'base64');

    await fs.writeFile(imgPath, buffer);
    imagePaths.push(imgPath);
    console.log(`[Setup] Created dummy image: ${imgPath}`);
  }

  // --- Display the image gallery ---
  console.log('\n--- Displaying Image Gallery ---');
  const galleryNode = new ImageGalleryNode();
  galleryNode.setParams({
    imagePaths: imagePaths,
    title: 'My QFlow Generated Images',
    description: 'A collection of images created by the agent.'
  });

  let galleryHtmlPath = null;
  try {
    const result = await new AsyncFlow(galleryNode).runAsync({});
    console.log('Image gallery workflow finished:', result);
    galleryHtmlPath = result.htmlFilePath;
  } catch (error) {
    console.error('Image gallery workflow Failed:', error.message);
  } finally {
    // --- Cleanup ---
    try {
      console.log('\n[Cleanup] Cleaning up dummy images and generated HTML...');
      if (galleryHtmlPath) {
        // await fs.unlink(galleryHtmlPath).catch(() => {}); // Delete HTML file
      }
      //await fs.rm(dummyImageDir, { recursive: true, force: true }).catch(() => {}); // Delete image directory
      //console.log('[Cleanup] Cleanup complete.');
    } catch (e) {
      console.warn('[Cleanup] Failed to remove some temporary files/directories:', e.message);
    }
  }

  console.log('\n--- ImageGalleryNode Example Finished ---');
})();