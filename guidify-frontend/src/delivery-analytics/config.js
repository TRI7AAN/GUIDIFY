/**
 * Delivery Analytics — Threshold & Config
 *
 * Raw-metric-to-proficiency-level mapping.
 * Thresholds are provisional — tune post-beta with real usage data.
 * Version-controlled here, not hardcoded in tracker logic.
 */

// Eye contact: % of time gaze is directed at camera
export const EYE_CONTACT_THRESHOLDS = { advanced: 70, proficient: 55, applied: 40 };

// Posture: MediaPipe pose score (0-1 normalized)
export const POSTURE_THRESHOLDS = { advanced: 0.85, proficient: 0.7, applied: 0.5 };

// Expression stability: 1 - (stddev of expression vectors), 0-1
export const EXPRESSION_STABILITY_THRESHOLDS = { advanced: 0.8, proficient: 0.65, applied: 0.5 };

// Fidget: movements per second (lower is better)
export const FIDGET_THRESHOLDS = { advanced: 0.3, proficient: 0.6, applied: 1.0 };

// Words per minute
export const WPM_THRESHOLDS = { too_slow: 100, slow: 120, good_min: 120, good_max: 170, fast: 200 };

// Filler word rate (filler words / total words)
export const FILLER_RATE_THRESHOLDS = { advanced: 0.03, proficient: 0.06, applied: 0.1 };

// Pause frequency (pauses > 1.5s per minute of speech)
export const PAUSE_THRESHOLDS = { advanced: 1, proficient: 3, applied: 5 };

// Filler words dictionary (Indian English + common global)
export const FILLER_WORDS = new Set([
  'um', 'uh', 'er', 'ah', 'like', 'you know', 'basically', 'actually',
  'literally', 'right', 'so', 'i mean', 'sort of', 'kind of',
  'hmm', 'huh', 'well', 'see', 'see the thing is',
]);

// How often to sample video frames (ms) — 200ms = 5 fps analysis
export const VIDEO_SAMPLE_INTERVAL_MS = 200;

// How often to analyse audio (ms)
export const AUDIO_ANALYSIS_INTERVAL_MS = 500;

// Minimum session duration (seconds) before delivery metrics are considered valid
export const MIN_SESSION_DURATION_S = 10;

/**
 * Map a raw metric value to a proficiency level (0-4) using threshold config.
 * Returns 0 (None) if below 'applied', 1 (Aware) if below 'proficient', etc.
 */
export function rawToProficiency(value, thresholds, invert = false) {
  const v = invert ? 1 - value : value;
  if (v >= thresholds.advanced) return 4;
  if (v >= thresholds.proficient) return 3;
  if (v >= thresholds.applied) return 2;
  if (v > 0) return 1;
  return 0;
}
