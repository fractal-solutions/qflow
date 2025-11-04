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
