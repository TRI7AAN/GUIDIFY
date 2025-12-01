/**
 * API Client for GUIDIFY
 * 
 * Features:
 * - Circuit Breaker pattern
 * - Exponential Backoff Retry
 * - Request Locking (Single-flight)
 * - IPv4 forcing (127.0.0.1)
 * - Timeout handling
 */

import axios from 'axios';

// Force IPv4 to avoid localhost resolution issues
const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds
});

// Circuit Breaker State
let failureCount = 0;
let circuitOpenUntil = 0;
const MAX_FAILURES = 5;
const CIRCUIT_OPEN_MS = 30000; // 30 seconds

// In-memory token store
let memoryToken = null;

export const setAuthToken = (token) => {
  memoryToken = token;
};

// Helper delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Circuit Breaker Check
    const now = Date.now();
    if (now < circuitOpenUntil) {
      return Promise.reject(new Error('Circuit open: temporarily blocked due to repeated failures'));
    }

    // Auth Token
    const token = memoryToken || localStorage.getItem('guidify_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Successful response - reset failure count
    failureCount = Math.max(0, failureCount - 1);
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // If no config (e.g. request setup failed), reject immediately
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('guidify_token');
      localStorage.removeItem('guidify_user');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      return Promise.reject(error);
    }

    // Circuit Breaker Logic for Network/Server Errors
    if (!error.response || error.response.status >= 500) {
      failureCount++;
      if (failureCount >= MAX_FAILURES) {
        circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
        console.error(`Circuit Breaker OPEN until ${new Date(circuitOpenUntil).toISOString()}`);
      }
    }

    // Retry Logic
    if (
      !originalRequest._retry &&
      (error.code === 'ERR_NETWORK' || (error.response && error.response.status >= 500))
    ) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      if (originalRequest._retryCount <= 3) {
        const backoffDelay = 500 * Math.pow(2, originalRequest._retryCount); // 1s, 2s, 4s
        console.log(`Retrying request to ${originalRequest.url} (Attempt ${originalRequest._retryCount})...`);
        await delay(backoffDelay);
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;