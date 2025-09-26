/**
 * Statistics Service
 * 
 * Provides methods for fetching user statistics and analytics data.
 */

import apiClient from './apiClient';

const statisticsService = {
  /**
   * Get user dashboard statistics
   * @returns {Promise} - Promise with dashboard statistics
   */
  getDashboardStats: async () => {
    const response = await apiClient.get('/statistics/dashboard');
    return response.data;
  },

  /**
   * Get user learning progress
   * @returns {Promise} - Promise with learning progress data
   */
  getLearningProgress: async () => {
    const response = await apiClient.get('/statistics/learning');
    return response.data;
  },

  /**
   * Get user job application statistics
   * @returns {Promise} - Promise with job application statistics
   */
  getJobStats: async () => {
    const response = await apiClient.get('/statistics/jobs');
    return response.data;
  },

  /**
   * Get user resume performance statistics
   * @returns {Promise} - Promise with resume performance data
   */
  getResumeStats: async () => {
    const response = await apiClient.get('/statistics/resumes');
    return response.data;
  },

  /**
   * Get user activity timeline
   * @param {Object} params - Query parameters
   * @returns {Promise} - Promise with activity timeline data
   */
  getActivityTimeline: async (params = {}) => {
    const response = await apiClient.get('/statistics/activity', { params });
    return response.data;
  }
};

export default statisticsService;