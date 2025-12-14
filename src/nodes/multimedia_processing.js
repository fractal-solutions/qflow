import { AsyncNode, AsyncFlow } from '../qflow.js';
import { ShellCommandNode } from './index.js'; // Assuming ShellCommandNode is available
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { log } from '../logger.js';

export class MultimediaProcessingNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "multimedia_processing",
      description: "Performs various multimedia operations on audio and video files using ffmpeg.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["convert", "trim", "extract_audio", "extract_frame", "custom"],
            description: "The multimedia operation to perform."
          },
          inputPath: {
            type: "string",
            description: "Path to the input multimedia file."
          },
          outputPath: {
            type: "string",
            description: "Path for the output file."
          },
          format: {
            type: "string",
            description: "Required for 'convert' and 'extract_audio'. The output format (e.g., 'mp4', 'mp3', 'gif', 'wav')."
          },
          startTime: {
            type: "string",
            description: "Required for 'trim'. Start time in HH:MM:SS or seconds (e.g., '00:00:10', '10')."
          },
          duration: {
            type: "string",
            description: "Required for 'trim'. Duration in HH:MM:SS or seconds (e.g., '00:00:05', '5')."
          },
          resolution: {
            type: "string",
            description: "Optional for video 'convert'. Resolution (e.g., '1280x720')."
          },
          frameTime: {
            type: "string",
            description: "Required for 'extract_frame'. Time to extract frame from in HH:MM:SS or seconds (e.g., '00:00:05')."
          },
          ffmpegArgs: {
            type: "string",
            description: "Required for 'custom'. Raw ffmpeg arguments to execute directly."
          }
        },
        required: ["action", "inputPath", "outputPath"]
      }
    };
  }

  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
  }

  async execAsync() {
    const {
      action, // e.g., 'convert', 'trim', 'extract_audio', 'extract_frame'
      inputPath, // Path to the input multimedia file
      outputPath, // Path for the output file
      // Parameters specific to actions
      format, // For 'convert' (e.g., 'mp4', 'mp3', 'gif')
      startTime, // For 'trim' (e.g., '00:00:10')
      duration, // For 'trim' (e.g., '00:00:05')
      resolution, // For 'convert' video (e.g., '1280x720')
      frameTime, // For 'extract_frame' (e.g., '00:00:05')
      ffmpegArgs // Optional: raw ffmpeg arguments for advanced users
    } = this.params;

    if (!action) {
      throw new Error('MultimediaProcessingNode requires an `action`.');
    }
    if (!inputPath && action !== 'list_codecs') { // list_codecs doesn't need input
      throw new Error('MultimediaProcessingNode requires an `inputPath`.');
    }
    if (!outputPath && !['list_codecs'].includes(action)) { // list_codecs doesn't need output
        throw new Error('MultimediaProcessingNode requires an `outputPath`.');
    }

    let ffmpegCommand = `ffmpeg -y`; // -y to overwrite output files without asking

    switch (action) {
      case 'convert':
        if (!format) throw new Error('Convert action requires `format`.');
        ffmpegCommand += ` -i "${inputPath}"`;
        if (resolution) ffmpegCommand += ` -vf scale=${resolution}`;
        ffmpegCommand += ` "${outputPath}"`;
        break;

      case 'trim':
        if (!startTime || !duration) throw new Error('Trim action requires `startTime` and `duration`.');
        ffmpegCommand += ` -ss ${startTime} -i "${inputPath}" -t ${duration} -c copy "${outputPath}"`;
        break;

      case 'extract_audio':
        if (!format) throw new Error('Extract audio requires `format` (e.g., "mp3", "wav").');
        // Re-encode audio to the specified format
        ffmpegCommand += ` -i "${inputPath}" -vn -c:a libmp3lame "${outputPath}"`; // -vn: no video, -c:a libmp3lame: re-encode audio to MP3
        break;

      case 'extract_frame':
        if (!frameTime) throw new Error('Extract frame requires `frameTime` (e.g., "00:00:05").');
        ffmpegCommand += ` -ss ${frameTime} -i "${inputPath}" -vframes 1 "${outputPath}"`; // -vframes 1: extract one frame
        break;

      case 'custom': // For advanced users to pass raw ffmpeg arguments
        if (!ffmpegArgs) throw new Error('Custom action requires `ffmpegArgs`.');
        ffmpegCommand = `ffmpeg -y ${ffmpegArgs}`;
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    log(`[MultimediaProcessingNode] Executing: ${ffmpegCommand}`, this.params.logging);

    const shellNode = new ShellCommandNode();
    shellNode.setParams({ command: ffmpegCommand });

    try {
      const result = await new AsyncFlow(shellNode).runAsync({});
      if (result.stderr) {
        log(`[MultimediaProcessingNode] ffmpeg warnings/errors: ${result.stderr}`, this.params.logging, { type: 'warn' });
      }
      return { status: 'success', action: action, outputPath: outputPath, stdout: result.stdout, stderr: result.stderr };
    } catch (e) {
      throw new Error(`Multimedia processing failed: ${e.message}. Ensure ffmpeg is installed and input/output paths are valid.`);
    }
  }
}
