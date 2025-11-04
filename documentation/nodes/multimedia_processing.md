## MultimediaProcessingNode

The `MultimediaProcessingNode` performs various multimedia operations on audio and video files using ffmpeg.

### Parameters

*   `action`: The multimedia operation to perform.
*   `inputPath`: Path to the input multimedia file.
*   `outputPath`: Path for the output file.
*   `format`: Required for 'convert' and 'extract_audio'. The output format (e.g., 'mp4', 'mp3', 'gif', 'wav').
*   `startTime`: Required for 'trim'. Start time in HH:MM:SS or seconds (e.g., '00:00:10', '10').
*   `duration`: Required for 'trim'. Duration in HH:MM:SS or seconds (e.g., '00:00:05', '5').
*   `resolution`: Optional for video 'convert'. Resolution (e.g., '1280x720').
*   `frameTime`: Required for 'extract_frame'. Time to extract frame from in HH:MM:SS or seconds (e.g., '00:00:05').
*   `ffmpegArgs`: Required for 'custom'. Raw ffmpeg arguments to execute directly.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { MultimediaProcessingNode } from '@fractal-solutions/qflow/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

(async () => {  
        console.log('--- Running MultimediaProcessingNode Example ---');
        const tempDir = os.tmpdir();
        const inputVideoPath = path.join('sample_video.mp4'); // User should provide this  
        const outputGifPath = path.join(tempDir, 'output_video.gif');  

        // --- IMPORTANT: Prerequisites ---
        console.log(`[Setup] This example requires an input video file: ${inputVideoPath}`);  
        console.log("[Setup] Please place a 'sample_video.mp4' file in your project root directory.");  
        console.log("[Setup] Also, ensure 'ffmpeg' is installed and in your system's PATH.");  

        // Check if input video exists  
        try {    
            await fs.access(inputVideoPath);    
            console.log(`[Setup] Input video found: ${inputVideoPath}`);  
        } catch (error) {    
            console.error(`[Setup] Input video not found at ${inputVideoPath}. Please place it there to run the example.`);    
            return;  
        }  

        // --- Example: Convert video to GIF ---  
        console.log('\n--- Converting video to GIF ---');  
        const convertNode = new MultimediaProcessingNode();  
        convertNode.setParams({    
            action: 'convert',    
            inputPath: inputVideoPath,    
            outputPath: outputGifPath,    
            format: 'gif',    
            resolution: '320x240' // Smaller resolution for GIF  
        });  
        
        try {    
            const result = await new AsyncFlow(convertNode).runAsync({});    
            console.log('Video to GIF conversion successful:', result);  
        } catch (error) {    
            console.error('Video to GIF conversion failed:', error.message);  
        }  
        
        console.log('\n--- MultimediaProcessingNode Example Finished ---');  
        
        // --- Cleanup ---  
        try {    
            console.log('\n[Cleanup] Removing generated files...');    
            await fs.unlink(outputGifPath).catch(() => {});    
            console.log('[Cleanup] Cleanup complete.');  
        } catch (e) {    
            console.warn('[Cleanup] Failed to remove some temporary files:', e.message);  
        } 
})();
