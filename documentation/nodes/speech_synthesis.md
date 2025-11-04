## SpeechSynthesisNode

The `SpeechSynthesisNode` converts text to spoken audio using OS capabilities or cloud APIs.

### Parameters

*   `text`: The text to convert to speech.
*   `provider`: Optional. The speech synthesis provider to use. Defaults to OS-specific. 'google' requires GOOGLE_TTS_API_KEY.
*   `voice`: Optional. The specific voice to use (e.g., 'Alex' for macOS, 'en-us' for espeak, 'en-US-Wavenet-D' for Google).
*   `outputFilePath`: Optional. If provided, saves the audio to this file path instead of playing it directly.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { SpeechSynthesisNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running SpeechSynthesisNode Example ---');

  // --- IMPORTANT: Prerequisites ---
  console.log("[Setup] For macOS: 'say' command is built-in.");
  console.log("[Setup] For Linux: Install 'espeak' (`sudo apt install espeak` or `sudo pacman -S espeak`) and 'alsa-utils' (`sudo apt install alsa-utils` or `sudo pacman -S alsa-utils`).");

  // --- Example: Default OS Provider (play directly) ---
  console.log('\n--- Synthesizing speech using default OS provider ---');
  const defaultTtsNode = new SpeechSynthesisNode();
  defaultTtsNode.setParams({
    text: 'Hello, this is a test from QFlow using your default system voice.'
  });

  try {
    const result = await new AsyncFlow(defaultTtsNode).runAsync({});
    console.log('Default TTS successful:', result);
  } catch (error) {
    console.error('Default TTS failed:', error.message);
  }

  console.log('\n--- SpeechSynthesisNode Example Finished ---');
})();
```
