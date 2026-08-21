/**
 * Delivery Analytics — Public API
 *
 * Orchestrates consent check, tracker init, audio analysis, and metric submission.
 * Only imported by InterviewPage — not part of the core interview flow.
 */

import { checkSupport, startTracking } from './tracker';
import { startAudioAnalysis, finalizeAudioMetrics } from './audio';
import { aggregateVideoMetrics, buildDeliveryPayload } from './aggregator';
import { MIN_SESSION_DURATION_S } from './config';

let trackingStop = null;
let audioStop = null;
let frameMetricsBuffer = [];
let sessionStartTime = null;
let cameraEnabled = false;

/**
 * Initialize delivery analytics for a session.
 * @param {HTMLVideoElement} videoEl - hidden video element
 * @param {boolean} consentGranted - user opted in to camera
 * @returns {Promise<boolean>} true if analytics started successfully
 */
export async function initDeliveryAnalytics(videoEl, consentGranted) {
  cameraEnabled = consentGranted;
  if (!consentGranted) return false;

  const supported = await checkSupport();
  if (!supported) {
    cameraEnabled = false;
    return false;
  }

  frameMetricsBuffer = [];
  sessionStartTime = Date.now();

  try {
    trackingStop = await startTracking(videoEl, (metrics) => {
      frameMetricsBuffer.push(metrics);
    });
    return true;
  } catch (error) {
    console.warn('Delivery analytics could not start; continuing text-only.', error);
    stopDeliveryAnalytics();
    return false;
  }
}

/**
 * Start audio analysis on a MediaStream.
 * Called separately because audio consent is implicit in camera consent
 * (mic is part of the same permission prompt).
 */
export function initAudioAnalysis(mediaStream) {
  if (!cameraEnabled || !mediaStream) return;
  audioStop = startAudioAnalysis(mediaStream);
}

/**
 * Finalize and return the delivery metrics payload.
 * Returns null if camera was not enabled or session was too short.
 * @param {string[]} transcriptTexts - candidate answer texts
 * @returns {Object|null} delivery payload or null
 */
export function finalizeDeliveryMetrics(transcriptTexts) {
  if (!cameraEnabled) return null;

  const durationS = (Date.now() - (sessionStartTime || Date.now())) / 1000;
  if (durationS < MIN_SESSION_DURATION_S) return null;

  const videoMetrics = aggregateVideoMetrics(frameMetricsBuffer);
  const audioMetrics = finalizeAudioMetrics(transcriptTexts, durationS);

  return buildDeliveryPayload(videoMetrics, audioMetrics, true);
}

/**
 * Stop all tracking (called on session end or cleanup).
 */
export function stopDeliveryAnalytics() {
  if (trackingStop) { trackingStop(); trackingStop = null; }
  if (audioStop) { audioStop(); audioStop = null; }
  frameMetricsBuffer = [];
  sessionStartTime = null;
  cameraEnabled = false;
}

/**
 * Check if browser supports the delivery analytics feature.
 */
export { checkSupport as checkDeliverySupport };
