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
        const outputAudioPath = path.join(tempDir, 'output_audio.mp3');  
        const outputFramePath = path.join(tempDir, 'output_frame.png');  
        const outputTrimmedPath = path.join(tempDir, 'output_trimmed.mp4');  
        // --- IMPORTANT: Provide your own input video ---  
        console.log(`[Setup] This example requires an input video file: ${inputVideoPath}`);  
        console.log("[Setup] Please place a 'sample_video.mp4' file in your system's temporary directory.");  
        console.log("[Setup] You can download a sample video from: https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4");  
        console.log("[Setup] Also, ensure 'ffmpeg' is installed and in your system's PATH.");  

        // Check if input video exists  
        try {    
            await fs.access(inputVideoPath);    
            console.log(`[Setup] Input video found: ${inputVideoPath}`);  
        } catch (error) {    
            console.error(`[Setup] Input video not found at ${inputVideoPath}. Please place it there to run the example.`);    
            return;  
        }  

        // --- Example 1: Convert video to GIF ---  
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

        // --- Example 2: Extract audio from video ---  
        console.log('\n--- Extracting audio from video ---');  
        const extractAudioNode = new MultimediaProcessingNode();  
        extractAudioNode.setParams({    
            action: 'extract_audio',    
            inputPath: inputVideoPath,    
            outputPath: outputAudioPath,    
            format: 'mp3'  
        });  
        
        try {    
            const result = await new AsyncFlow(extractAudioNode).runAsync({});    
            console.log('Audio extraction successful:', result);  
        } catch (error) {    
            console.error('Audio extraction failed:', error.message);  
        }  
        
        // --- Example 3: Extract a frame from video ---  
        console.log('\n--- Extracting a frame from video (at 5 seconds) ---');  
        const extractFrameNode = new MultimediaProcessingNode();  
        extractFrameNode.setParams({    
            action: 'extract_frame',    
            inputPath: inputVideoPath,    
            outputPath: outputFramePath,    
            frameTime: '00:00:05'  
        });  
        
        try {    
            const result = await new AsyncFlow(extractFrameNode).runAsync({});    
            console.log('Frame extraction successful:', result);  
        } catch (error) {    
            console.error('Frame extraction failed:', error.message);  
        }  
        
        // --- Example 4: Trim a video segment ---  
        console.log('\n--- Trimming video segment (from 10s for 5s) ---');  
        const trimNode = new MultimediaProcessingNode();  
        trimNode.setParams({    
            action: 'trim',    
            inputPath: inputVideoPath,    
            outputPath: outputTrimmedPath,    
            startTime: '00:00:10',    
            duration: '00:00:05'  
        });  
        
        try {    
            const result = await new AsyncFlow(trimNode).runAsync({});    
            console.log('Video trimming successful:', result);  
        } catch (error) {    
            console.error('Video trimming failed:', error.message);  
        }  
        
        console.log('\n--- MultimediaProcessingNode Example Finished ---');  
        
        // --- Cleanup ---  
        try {    
            console.log('\n[Cleanup] Removing generated files...');    
            await fs.unlink(outputGifPath).catch(() => {});    
            await fs.unlink(outputAudioPath).catch(() => {});    
            await fs.unlink(outputFramePath).catch(() => {});    
            await fs.unlink(outputTrimmedPath).catch(() => {});    
            console.log('[Cleanup] Cleanup complete.');  
        } catch (e) {    
            console.warn('[Cleanup] Failed to remove some temporary files:', e.message);  
        }
})();