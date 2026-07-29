/**
 * Delivery Analytics — Face & Pose Tracker
 *
 * Uses MediaPipe Tasks Vision (FaceLandmarker + PoseLandmarker).
 * Lazily initialized — only created when camera consent is granted.
 * Processes frames in-memory; no video is uploaded or stored.
 */

import { VIDEO_SAMPLE_INTERVAL_MS, EYE_CONTACT_THRESHOLDS, POSTURE_THRESHOLDS, EXPRESSION_STABILITY_THRESHOLDS, FIDGET_THRESHOLDS } from './config';

let faceLandmarker = null;
let poseLandmarker = null;
let videoElement = null;
let animationFrameId = null;
let sampleTimerId = null;

// Rolling buffers for stability/fidget calculations
const expressionBuffer = [];
const headPositionBuffer = [];
const MAX_BUFFER = 30;

/**
 * Check if browser supports camera + WASM needed for MediaPipe.
 */
export async function checkSupport() {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const { FaceLandmarker, PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    // Quick smoke test — can we create the fileset?
    return !!vision;
  } catch {
    return false;
  }
}

/**
 * Start face + pose tracking on a given video element.
 * Calls onMetricsUpdate periodically with intermediate data.
 * Returns a stop function.
 */
export async function startTracking(videoEl, onMetricsUpdate) {
  videoElement = videoEl;

  const { FaceLandmarker, PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task', delegate: 'GPU' },
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
    numFaces: 1,
  });

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task', delegate: 'GPU' },
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
  });

  // Start video stream
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false });
  videoElement.srcObject = stream;
  await videoElement.play();

  const sample = () => {
    if (!faceLandmarker || !videoElement || videoElement.paused) return;
    try {
      const faceResult = faceLandmarker.detectForVideo(videoElement, performance.now());
      const poseResult = poseLandmarker.detectForVideo(videoElement, performance.now());
      const metrics = computeFrameMetrics(faceResult, poseResult);
      onMetricsUpdate(metrics);
    } catch {
      // Frame processing error — skip, don't crash
    }
  };

  // Sample at fixed interval
  sampleTimerId = setInterval(sample, VIDEO_SAMPLE_INTERVAL_MS);

  return () => stopTracking(stream);
}

function stopTracking(stream) {
  if (sampleTimerId) { clearInterval(sampleTimerId); sampleTimerId = null; }
  if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (faceLandmarker) { faceLandmarker.close(); faceLandmarker = null; }
  if (poseLandmarker) { poseLandmarker.close(); poseLandmarker = null; }
  videoElement = null;
  expressionBuffer.length = 0;
  headPositionBuffer.length = 0;
}

function computeFrameMetrics(faceResult, poseResult) {
  const metrics = { eye_contact_pct: 0, posture_score: 0, expression_stability_score: 0, fidget_frequency: 0 };

  // Eye contact: face facing camera if front-face rotation is near 0
  if (faceResult.faceTransformationMatrixes?.length > 0) {
    const mat = faceResult.faceTransformationMatrixes[0];
    // Extract yaw from rotation matrix (simplified)
    const yaw = Math.asin(Math.min(1, Math.max(-1, mat[8])));
    const gazeOnCamera = 1 - Math.min(1, Math.abs(yaw) / (Math.PI / 4));
    expressionBuffer.push(gazeOnCamera);
    if (expressionBuffer.length > MAX_BUFFER) expressionBuffer.shift();
    metrics.eye_contact_pct = Math.round((expressionBuffer.reduce((a, b) => a + b, 0) / expressionBuffer.length) * 100);
  }

  // Posture: shoulder alignment from pose landmarks
  if (poseResult.landmarks?.length > 0) {
    const lm = poseResult.landmarks[0];
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    const nose = lm[0];
    const midShoulder = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
    const lean = Math.abs(nose.x - midShoulder.x);
    metrics.posture_score = Math.round(Math.max(0, 1 - shoulderDiff * 5 - lean * 3) * 100) / 100;
  }

  // Expression stability: stddev of expression blendshapes
  if (faceResult.faceBlendshapes?.length > 0) {
    const shapes = faceResult.faceBlendshapes[0];
    const avg = shapes.reduce((s, b) => s + b.score, 0) / shapes.length;
    const variance = shapes.reduce((s, b) => s + (b.score - avg) ** 2, 0) / shapes.length;
    const stddev = Math.sqrt(variance);
    const stability = Math.max(0, 1 - stddev * 3);
    metrics.expression_stability_score = Math.round(stability * 100) / 100;
  }

  // Fidget: head position movement rate
  if (poseResult.landmarks?.length > 0) {
    const nose = poseResult.landmarks[0][0];
    const headPos = { x: nose.x, y: nose.y, t: performance.now() };
    headPositionBuffer.push(headPos);
    if (headPositionBuffer.length > MAX_BUFFER) headPositionBuffer.shift();
    if (headPositionBuffer.length >= 2) {
      let totalDist = 0;
      for (let i = 1; i < headPositionBuffer.length; i++) {
        const dx = headPositionBuffer[i].x - headPositionBuffer[i - 1].x;
        const dy = headPositionBuffer[i].y - headPositionBuffer[i - 1].y;
        totalDist += Math.sqrt(dx * dx + dy * dy);
      }
      const durationS = (headPositionBuffer[headPositionBuffer.length - 1].t - headPositionBuffer[0].t) / 1000;
      metrics.fidget_frequency = durationS > 0 ? Math.round((totalDist / durationS) * 100) / 100 : 0;
    }
  }

  return metrics;
}
