/**
 * Job Service
 * 
 * Provides methods for fetching and managing jobs.
 */

import apiClient from './apiClient';

const jobService = {
  /**
   * Get all jobs
   * @param {Object} params - Query parameters
   * @returns {Promise} - Promise with jobs data
   */
  getJobs: async (params = {}) => {
    const response = await apiClient.get('/jobs', { params });
    return response.data;
  },

  /**
   * Get job by ID
   * @param {string} id - Job ID
   * @returns {Promise} - Promise with job data
   */
  getJobById: async (id) => {
    const response = await apiClient.get(`/jobs/${id}`);
    return response.data;
  },

  /**
   * Get recommended jobs based on user profile
   * @returns {Promise} - Promise with recommended jobs
   */
  getRecommendedJobs: async () => {
    const response = await apiClient.get('/ai/recommend/jobs');
    return response.data;
  },
  
  /**
   * Recommend jobs based on resume and preferences
   * @param {FormData} formData - Form data with resume and preferences
   * @returns {Promise} - Promise with recommended jobs
   */
  recommendJobs: async (formData) => {
    const response = await apiClient.post('/recommend/jobs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Apply for a job
   * @param {string} jobId - Job ID
   * @param {Object} applicationData - Application data
   * @returns {Promise} - Promise with application status
   */
  applyForJob: async (jobId, applicationData) => {
    const response = await apiClient.post(`/jobs/${jobId}/apply`, applicationData);
    return response.data;
  },

  /**
   * Get user's job applications
   * @returns {Promise} - Promise with job applications
   */
  getJobApplications: async () => {
    const response = await apiClient.get('/jobs/applications');
    return response.data;
  },

  /**
   * Get confidence score for a job
   * @param {string} jobId - Job ID
   * @returns {Promise} - Promise with confidence score
   */
  getConfidenceScore: async (jobId) => {
    const response = await apiClient.get(`/ai/confidence-score/job/${jobId}`);
    return response.data;
  }
};

export default jobService;