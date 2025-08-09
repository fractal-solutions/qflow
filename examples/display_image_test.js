import { AsyncFlow } from '@fractal-solutions/qflow';
import { DisplayImageNode } from '@fractal-solutions/qflow/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

(async () => {  
    console.log('--- Running DisplayImageNode Example ---');  
    const tempDir = os.tmpdir();  
    const dummyImagePath = path.join(tempDir, `dummy_image_${Date.now()}.png`);  
    // --- Create a dummy image file ---  
    // This is a very simple 1x1 transparent PNG base64 encoded.  
    // In a real scenario, this would be a generated plot or an existing image.  
    
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';  
    const imageBuffer = Buffer.from(base64Png, 'base64');  
    
    try {    
        await fs.writeFile(dummyImagePath, imageBuffer);    
        console.log(`[Setup] Created dummy image file: ${dummyImagePath}`);  
    } catch (error) {    
        console.error('[Setup] Failed to create dummy image file:', error);    
        return;  
    }  
    
    // --- Display the image ---  
    console.log('\n--- Displaying Image ---');  
    const displayNode = new DisplayImageNode();  
    displayNode.setParams({    
        imagePath: dummyImagePath  
    });  

    try {    
        await new AsyncFlow(displayNode).runAsync({});    
        console.log('Image display workflow finished.');  
    } catch (error) {    
        console.error('Image display workflow Failed:', error.message);  
    } finally {    
        // --- Cleanup ---    
        // try {      
        //     console.log(`\n[Cleanup] Removing dummy image file: ${dummyImagePath}`);      
        //     await fs.unlink(dummyImagePath);      
        //     console.log('[Cleanup] Cleanup complete.');    
        // } catch (e) {      
        //     console.warn('[Cleanup] Failed to remove dummy image file:', e.message);    
        // }  
    }  
    console.log('\n--- DisplayImageNode Example Finished ---');})();