import { AsyncFlow } from '@fractal-solutions/qflow';
import { SpeechSynthesisNode } from '@fractal-solutions/qflow/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

(async () => {
  console.log('--- Running SpeechSynthesisNode Example ---');

  // --- IMPORTANT: Prerequisites ---
  console.log("[Setup] For macOS: 'say' command is built-in.");
  console.log("[Setup] For Linux: Install 'espeak' (`sudo apt install espeak` or `sudo pacman -S espeak`) and 'alsa-utils' (`sudo apt install alsa-utils` or `sudo pacman -S alsa-utils`).");
  console.log("[Setup] For Google Cloud TTS: Set GOOGLE_TTS_API_KEY environment variable.");

  // --- Example 1: Default OS Provider (play directly) ---
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

  // --- Example 2: Specific OS Provider (macOS 'Alex' voice) ---
  if (os.platform() === 'darwin') {
    console.log('\n--- Synthesizing speech using macOS "Alex" voice ---');
    const macosTtsNode = new SpeechSynthesisNode();
    macosTtsNode.setParams({
      text: 'This is Alex speaking on a Mac.',
      provider: 'macos',
      voice: 'Alex'
    });

    try {
      const result = await new AsyncFlow(macosTtsNode).runAsync({});
      console.log('macOS TTS successful:', result);
    } catch (error) {
      console.error('macOS TTS failed:', error.message);
    }
  } else if (os.platform() === 'linux') {
    console.log('\n--- Synthesizing speech using Linux "espeak" ---');
    const linuxTtsNode = new SpeechSynthesisNode();
    linuxTtsNode.setParams({
      text: 'This is a test from Linux using espeak.',
      provider: 'linux',
      voice: 'en-us' // Example espeak voice
    });

    try {
      const result = await new AsyncFlow(linuxTtsNode).runAsync({});
      console.log('Linux TTS successful:', result);
    } catch (error) {
      console.error('Linux TTS failed:', error.message);
    }
  }

  // --- Example 3: Google Cloud TTS (requires API Key) ---
  const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;
  if (GOOGLE_TTS_API_KEY) {
    console.log('\n--- Synthesizing speech using Google Cloud TTS ---');
    const googleTtsNode = new SpeechSynthesisNode();
    googleTtsNode.setParams({
      text: 'This is a high-quality voice from Google Cloud Text-to-Speech.',
      provider: 'google',
      voice: 'en-US-Wavenet-F' // Example Wavenet voice
    });

    try {
      const result = await new AsyncFlow(googleTtsNode).runAsync({});
      console.log('Google Cloud TTS successful:', result);
    } catch (error) {
      console.error('Google Cloud TTS failed:', error.message);
    }
  } else {
    console.warn('\nWARNING: GOOGLE_TTS_API_KEY not set. Skipping Google Cloud TTS example.');
  }

  // --- Example 4: Save audio to a file ---
  console.log('\n--- Saving speech to a file ---');
  const tempAudioFilePath = path.join(os.tmpdir(), `qflow_tts_output_${Date.now()}.mp3`);
  const saveTtsNode = new SpeechSynthesisNode();
  saveTtsNode.setParams({
    text: 'This audio will be saved to a file.',
    outputFilePath: tempAudioFilePath,
    provider: 'linux' // Use a local provider for saving to file example
  });

  try {
    const result = await new AsyncFlow(saveTtsNode).runAsync({});
    console.log('Save TTS successful:', result);
    console.log('Audio saved to:', tempAudioFilePath);
  } catch (error) {
    console.error('Save TTS failed:', error.message);
  } finally {
    // --- Cleanup ---
    try {
      console.log(`\n[Cleanup] Removing temporary audio file: ${tempAudioFilePath}`);
      await fs.unlink(tempAudioFilePath).catch(() => {});
      console.log('[Cleanup] Cleanup complete.');
    } catch (e) {
      console.warn('[Cleanup] Failed to remove temporary audio file:', e.message);
    }
  }

  console.log('\n--- SpeechSynthesisNode Example Finished ---');
})();
