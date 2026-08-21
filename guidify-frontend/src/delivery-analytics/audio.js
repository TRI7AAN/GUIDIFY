/**
 * Delivery Analytics — Audio Prosody Analysis
 *
 * Uses Web Audio API for amplitude/pause detection.
 * Does NOT do speech-to-text — WPM comes from the existing transcript text.
 * Filler words are counted against the transcript, not audio.
 */

import { FILLER_WORDS } from './config';

let audioContext = null;
let analyser = null;
let sourceNode = null;
let sampleTimerId = null;
let silenceTimer = 0;
let pauseCount = 0;
let speechStart = 0;
let totalSpeechTime = 0;
let isSpeaking = false;

const SAMPLE_INTERVAL_MS = 50;
const SILENCE_THRESHOLD = 0.02;
const PAUSE_MIN_DURATION_S = 1.5;

/**
 * Start audio analysis from a MediaStream (with or without video).
 * Returns a stop function.
 */
export function startAudioAnalysis(mediaStream) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  sourceNode = audioContext.createMediaStreamSource(mediaStream);
  sourceNode.connect(analyser);

  silenceTimer = 0;
  pauseCount = 0;
  totalSpeechTime = 0;
  isSpeaking = false;
  speechStart = 0;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const tick = () => {
    analyser.getByteFrequencyData(dataArray);
    const rms = Math.sqrt(dataArray.reduce((s, v) => s + v * v, 0) / dataArray.length) / 255;

    if (rms > SILENCE_THRESHOLD) {
      silenceTimer = 0;
      if (!isSpeaking) {
        isSpeaking = true;
        speechStart = performance.now();
      }
    } else {
      if (isSpeaking) {
        silenceTimer += SAMPLE_INTERVAL_MS / 1000;
        if (silenceTimer >= PAUSE_MIN_DURATION_S) {
          pauseCount++;
          totalSpeechTime += (performance.now() - speechStart) / 1000;
          isSpeaking = false;
          silenceTimer = 0;
        }
      }
    }

  };

  sampleTimerId = setInterval(tick, SAMPLE_INTERVAL_MS);

  return () => stopAudioAnalysis();
}

function stopAudioAnalysis() {
  if (sampleTimerId) { clearInterval(sampleTimerId); sampleTimerId = null; }
  if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
  if (audioContext) { audioContext.close(); audioContext = null; }
  analyser = null;
}

/**
 * Finalize audio metrics using the session transcript.
 * Call this when the session ends.
 * @param {string[]} transcriptTexts - all candidate answer texts joined
 * @param {number} sessionDurationS - total session duration in seconds
 */
export function finalizeAudioMetrics(transcriptTexts, sessionDurationS) {
  if (isSpeaking && speechStart) {
    totalSpeechTime += (performance.now() - speechStart) / 1000;
    isSpeaking = false;
  }
  // Stop audio processing
  if (sampleTimerId) stopAudioAnalysis();

  // WPM from transcript
  const allWords = transcriptTexts.join(' ').split(/\s+/).filter(Boolean);
  const wordCount = allWords.length;
  // If no speech was detected (the current interview UI accepts typed answers),
  // fall back to session duration instead of reporting an absurd words/minute value.
  const effectiveSpeechSeconds = totalSpeechTime >= 1 ? totalSpeechTime : sessionDurationS;
  const speakingMinutes = Math.max(effectiveSpeechSeconds, 1) / 60;
  const words_per_minute = Math.round(wordCount / speakingMinutes);

  // Filler word rate
  const fillerCount = allWords.filter(w => FILLER_WORDS.has(w.toLowerCase())).length;
  const filler_word_rate = wordCount > 0 ? Math.round((fillerCount / wordCount) * 100) / 100 : 0;

  // Pause frequency (pauses per minute of speech)
  const pause_frequency = speakingMinutes > 0 ? Math.round((pauseCount / speakingMinutes) * 100) / 100 : 0;

  return { words_per_minute, filler_word_rate, pause_frequency };
}
