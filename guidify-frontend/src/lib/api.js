/**
 * API Client for GUIDIFY v2
 * 
 * Per architecture.md §2: Centralized API client in src/lib/
 * Targets /api/v1 prefix per api.md §8.
 * Attaches Supabase JWT automatically from session.
 * 
 * Features:
 * - Auto JWT attachment from Supabase session
 * - Circuit breaker pattern
 * - Exponential backoff retry (3 attempts)
 * - Consistent error format per api.md: { error: { code, message } }
 */

import axios from 'axios';
import { supabase } from '../utils/supabaseClient';

const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Circuit breaker state
let failureCount = 0;
let circuitOpenUntil = 0;
let lastFailureTime = 0;
const MAX_FAILURES = 8;
const CIRCUIT_OPEN_MS = 10000;

// Request interceptor — attach Supabase JWT
api.interceptors.request.use(async (config) => {
  // Circuit breaker check — allow through in half-open state to test recovery
  if (Date.now() < circuitOpenUntil) {
    // Half-open: if enough time has passed since last failure, allow one probe request
    if (Date.now() - lastFailureTime > CIRCUIT_OPEN_MS / 2) {
      // Allow this request through as a probe
    } else {
      return Promise.reject(new Error('Circuit open: temporarily blocked'));
    }
  }

  // Get current session token from Supabase
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (e) {
    // Silent — request will proceed without auth, server will reject if needed
  }

  return config;
}, (error) => Promise.reject(error));

// Response interceptor
api.interceptors.response.use(
  (response) => {
    failureCount = Math.max(0, failureCount - 1);
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Handle 401/403
    if (error.response?.status === 401 || error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      return Promise.reject(error);
    }

    // Circuit breaker
    if (!error.response || error.response.status >= 500) {
      failureCount++;
      lastFailureTime = Date.now();
      if (failureCount >= MAX_FAILURES) {
        circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
      }
    }

    // Retry with backoff (network errors + 5xx)
    if (
      (error.code === 'ERR_NETWORK' || error.response?.status >= 500) &&
      (originalRequest._retryCount || 0) < 3
    ) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      const delay = 500 * Math.pow(2, originalRequest._retryCount);
      await new Promise(r => setTimeout(r, delay));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

// ── Typed API methods matching api.md endpoints ──

/** Auth & Profile — api.md §1 */
export const authAPI = {
  submitOnboarding: (data) => api.post('/api/v1/auth/onboarding', data),
  getProfile: () => api.get('/api/v1/profile/me'),
  updateTargetRole: (targetRole) => api.patch('/api/v1/profile/target-role', { target_role: targetRole }),
};

/** Resume — api.md §2 */
export const resumeAPI = {
  upload: (formData) => api.post('/api/v1/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  get: (resumeId) => api.get(`/api/v1/resume/${resumeId}`),
  getCurrent: () => api.get('/api/v1/resume/current'),
  matchJD: (data) => api.post('/api/v1/resume/match-jd', data),
};

/** Roadmap — api.md §3 */
export const roadmapAPI = {
  getCurrent: () => api.get('/api/v1/roadmap/current'),
  getHistory: () => api.get('/api/v1/roadmap/history'),
  regenerate: () => api.post('/api/v1/roadmap/regenerate'),
};

/** Missions — api.md §4 */
export const missionsAPI = {
  getToday: () => api.get('/api/v1/missions/today'),
  complete: (missionId, notes) => api.post(`/api/v1/missions/${missionId}/complete`, { notes }),
  updateStatus: (missionId, status) => api.post(`/api/v1/missions/${missionId}/status`, { status }),
};

/** Interview — api.md §5 */
export const interviewAPI = {
  startSession: (track) => api.post('/api/v1/interview/session', { track }),
  submitAnswer: (sessionId, answer) => api.post(`/api/v1/interview/session/${sessionId}/answer`, { answer }),
  getSession: (sessionId) => api.get(`/api/v1/interview/session/${sessionId}`),
  submitDeliveryMetrics: (sessionId, metrics) => api.post(`/api/v1/interview/session/${sessionId}/delivery-metrics`, metrics),
};

/** Dashboard — api.md §6 */
export const dashboardAPI = {
  get: () => api.get('/api/v1/dashboard'),
  getDeliveryTrends: () => api.get('/api/v1/dashboard/delivery-trends'),
};

/** Adaptation — rules.md §1-4 */
export const adaptationAPI = {
  getStatus: () => api.get('/api/v1/adaptation/status'),
  getSkillGap: () => api.get('/api/v1/adaptation/skill-gap'),
};

/** Psychometric Test — yes/maybe/no assessment */
export const psychometricTestAPI = {
  getQuestions: () => api.get('/api/v1/psychometric-test/questions'),
  startTest: () => api.post('/api/v1/psychometric-test/start', {}),
  submitTest: (data) => api.post('/api/v1/psychometric-test/submit', data),
  getResult: (sessionId) => api.get(`/api/v1/psychometric-test/result/${sessionId}`),
  getLatest: () => api.get('/api/v1/psychometric-test/latest'),
};

export default api;
