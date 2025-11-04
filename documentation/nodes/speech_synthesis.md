## SpeechSynthesisNode

The `SpeechSynthesisNode` converts text to spoken audio using OS capabilities or cloud APIs.

### Parameters

*   `text`: The text to convert to speech.
*   `provider`: Optional. The speech synthesis provider to use. Defaults to OS-specific. 'google' requires GOOGLE_TTS_API_KEY.
*   `voice`: Optional. The specific voice to use (e.g., 'Alex' for macOS, 'en-us' for espeak, 'en-US-Wavenet-D' for Google).
*   `outputFilePath`: Optional. If provided, saves the audio to this file path instead of playing it directly.
