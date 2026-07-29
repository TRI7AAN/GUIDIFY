/**
 * Delivery Analytics — Metrics Aggregator
 *
 * Combines video (face/pose) and audio metrics into a single payload
 * ready for POST /interview/session/{id}/delivery-metrics.
 */

/**
 * Aggregate frame-level video metrics into session-level metrics.
 * @param {Object[]} frameMetrics - array of { eye_contact_pct, posture_score, expression_stability_score, fidget_frequency }
 * @returns {Object} aggregated metrics (averages)
 */
export function aggregateVideoMetrics(frameMetrics) {
  if (!frameMetrics || frameMetrics.length === 0) {
    return { eye_contact_pct: 0, posture_score: 0, expression_stability_score: 0, fidget_frequency: 0 };
  }

  const n = frameMetrics.length;
  const sum = frameMetrics.reduce(
    (acc, m) => ({
      eye_contact_pct: acc.eye_contact_pct + m.eye_contact_pct,
      posture_score: acc.posture_score + m.posture_score,
      expression_stability_score: acc.expression_stability_score + m.expression_stability_score,
      fidget_frequency: acc.fidget_frequency + m.fidget_frequency,
    }),
    { eye_contact_pct: 0, posture_score: 0, expression_stability_score: 0, fidget_frequency: 0 }
  );

  return {
    eye_contact_pct: Math.round(sum.eye_contact_pct / n),
    posture_score: Math.round((sum.posture_score / n) * 100) / 100,
    expression_stability_score: Math.round((sum.expression_stability_score / n) * 100) / 100,
    fidget_frequency: Math.round((sum.fidget_frequency / n) * 100) / 100,
  };
}

/**
 * Build the final delivery-metrics payload for the backend.
 * @param {Object} videoMetrics - aggregated video metrics
 * @param {Object} audioMetrics - { words_per_minute, filler_word_rate, pause_frequency }
 * @param {boolean} cameraEnabled
 * @returns {Object} payload matching api.md POST /delivery-metrics schema
 */
export function buildDeliveryPayload(videoMetrics, audioMetrics, cameraEnabled) {
  return {
    camera_enabled: cameraEnabled,
    eye_contact_pct: videoMetrics.eye_contact_pct,
    posture_score: videoMetrics.posture_score,
    expression_stability_score: videoMetrics.expression_stability_score,
    fidget_frequency: videoMetrics.fidget_frequency,
    words_per_minute: audioMetrics.words_per_minute,
    filler_word_rate: audioMetrics.filler_word_rate,
    pause_frequency: audioMetrics.pause_frequency,
  };
}
