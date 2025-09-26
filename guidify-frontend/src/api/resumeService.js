/**
 * Resume Service
 * 
 * Provides methods for managing user resumes and getting AI-powered insights.
 */

import apiClient from './apiClient';

const resumeService = {
  /**
   * Upload a resume
   * @param {FormData} formData - Form data containing the resume file
   * @param {string} userId - Logged-in user's ID
   * @returns {Promise} - Promise with upload status
   */
  uploadResume: async (formData, userId) => {
    formData.append('userId', userId); // Attach user ID to the form data
    const response = await apiClient.post('/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Get user's resumes
   * @returns {Promise} - Promise with resumes data
   */
  getUserResumes: async () => {
    const response = await apiClient.get('/resumes');
    return response.data;
  },

  /**
   * Get resume by ID
   * @param {string} id - Resume ID
   * @returns {Promise} - Promise with resume data
   */
  getResumeById: async (id) => {
    const response = await apiClient.get(`/resumes/${id}`);
    return response.data;
  },

  /**
   * Delete resume
   * @param {string} id - Resume ID
   * @returns {Promise} - Promise with deletion status
   */
  deleteResume: async (id) => {
    const response = await apiClient.delete(`/resumes/${id}`);
    return response.data;
  },

  /**
   * Parse resume with AI
   * @param {string} resumeId - Resume ID
   * @returns {Promise} - Promise with parsed resume data
   */
  parseResume: async (resumeId) => {
    const response = await apiClient.get(`/ai/parse-resume/${resumeId}`);
    return response.data;
  },

  /**
   * Get resume feedback
   * @param {string} resumeId - Resume ID
   * @returns {Promise} - Promise with resume feedback
   */
  getResumeFeedback: async (resumeId) => {
    const response = await apiClient.get(`/ai/resume-feedback/${resumeId}`);
    return response.data;
  }
};

export default resumeService;