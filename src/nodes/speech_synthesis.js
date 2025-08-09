import { AsyncNode, AsyncFlow } from '../qflow.js';
import { ShellCommandNode, HttpRequestNode } from './index.js'; // Assuming these are available
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

// --- Provider Implementations ---

// macOS 'say' command provider
class MacOSSayProvider {
  async synthesize(text, voice) {
    let command = `say "${text}"`;
    if (voice) command += ` -v "${voice}"`;
    return { command: command, type: 'shell' };
  }
}

// Linux 'espeak' command provider
class LinuxEspeakProvider {
  async synthesize(text, voice) {
    let command = `espeak "${text}"`;
    if (voice) command += ` -v "${voice}"`; // espeak voices are different (e.g., 'en-us', 'en-gb')
    return { command: command, type: 'shell' };
  }
}

// Windows PowerShell/SAPI provider (conceptual)
class WindowsSAPIProvider {
  async synthesize(text, voice) {
    // This is more complex. Requires PowerShell script to use System.Speech.Synthesis.SpeechSynthesizer
    // and save to file, then play. Or directly play.
    // For simplicity, we'll just throw an error for now.
    throw new Error("Windows SAPI synthesis not implemented directly via shell command for this node.");
  }
}

// Google Cloud Text-to-Speech Provider (conceptual - requires API key)
class GoogleCloudTTSProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://texttospeech.googleapis.com/v1/text:synthesize";
  }

  async synthesize(text, voiceConfig = { languageCode: 'en-US', name: 'en-US-Wavenet-D', ssmlGender: 'NEUTRAL' }) {
    if (!this.apiKey) {
      throw new Error("Google Cloud TTS API Key is not configured.");
    }
    const payload = {
      input: { text: text },
      voice: voiceConfig,
      audioConfig: { audioEncoding: 'MP3' } // Or LINEAR16 for WAV
    };
    const url = `${this.baseUrl}?key=${this.apiKey}`;

    const httpRequest = new HttpRequestNode();
    httpRequest.setParams({
      url: url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    const response = await new AsyncFlow(httpRequest).runAsync({});
    if (response.status === 200 && response.body && response.body.audioContent) {
      // Google returns base64 encoded audio
      const audioBuffer = Buffer.from(response.body.audioContent, 'base64');
      const tempAudioPath = path.join(os.tmpdir(), `qflow_tts_${Date.now()}.mp3`);
      await fs.writeFile(tempAudioPath, audioBuffer);
      return { filePath: tempAudioPath, type: 'file' };
    } else {
      throw new Error(`Google Cloud TTS failed: ${response.status} - ${JSON.stringify(response.body)}`);
    }
  }
}


export class SpeechSynthesisNode extends AsyncNode {
  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
    this.providers = {
      macos: new MacOSSayProvider(),
      linux: new LinuxEspeakProvider(),
      windows: new WindowsSAPIProvider(), // Placeholder for Windows
      google: new GoogleCloudTTSProvider(process.env.GOOGLE_TTS_API_KEY), // Requires API key
      // Add other providers here
    };
  }

  async execAsync() {
    const { text, provider, voice, outputFilePath } = this.params;

    if (!text) {
      throw new Error('SpeechSynthesisNode requires `text` to synthesize.');
    }

    let selectedProvider;
    let audioOutput;

    // Determine provider based on OS or explicit parameter
    if (provider) {
      selectedProvider = this.providers[provider];
      if (!selectedProvider) {
        throw new Error(`Specified provider '${provider}' not supported or configured.`);
      }
    } else {
      // Default to OS-specific provider
      const platform = os.platform();
      if (platform === 'darwin') selectedProvider = this.providers.macos;
      else if (platform === 'linux') selectedProvider = this.providers.linux;
      else if (platform === 'win32') selectedProvider = this.providers.windows;
      else throw new Error(`Speech synthesis not supported on platform: ${platform}`);
    }

    // Synthesize speech
    const synthesisResult = await selectedProvider.synthesize(text, voice);

    // Handle audio output (play or save to file)
    if (synthesisResult.type === 'shell') {
      // Directly execute the shell command to play audio
      const shellNode = new ShellCommandNode();
      shellNode.setParams({ command: synthesisResult.command });
      await new AsyncFlow(shellNode).runAsync({});
      audioOutput = { status: 'played_via_shell' };
    } else if (synthesisResult.type === 'file') {
      // Audio is saved to a file, now play it
      const audioFilePath = outputFilePath || synthesisResult.filePath;
      if (!outputFilePath) { // If not saving to a specific path, play it
        const playCommand = os.platform() === 'darwin' ? `afplay "${audioFilePath}"` :
                            os.platform() === 'linux' ? `aplay "${audioFilePath}"` : // Requires aplay (alsa-utils)
                            os.platform() === 'win32' ? `start "" "${audioFilePath}"` : // Plays with default player
                            null;
        if (!playCommand) throw new Error(`Audio playback not supported on platform: ${os.platform()}`);

        const shellNode = new ShellCommandNode();
        shellNode.setParams({ command: playCommand });
        await new AsyncFlow(shellNode).runAsync({});
        audioOutput = { status: 'played_from_file', filePath: audioFilePath };
      } else {
        // If outputFilePath was provided, just return the path
        audioOutput = { status: 'saved_to_file', filePath: audioFilePath };
      }
    } else {
      throw new Error('Unsupported synthesis result type.');
    }

    return audioOutput;
  }
}
