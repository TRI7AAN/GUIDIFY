/**
 * Course Service
 * 
 * Provides methods for fetching and managing courses.
 */

import apiClient from './apiClient';

const courseService = {
  /**
   * Get all courses
   * @param {Object} params - Query parameters
   * @returns {Promise} - Promise with courses data
   */
  getCourses: async (params = {}) => {
    const response = await apiClient.get('/courses', { params });
    return response.data;
  },

  /**
   * Get course by ID
   * @param {string} id - Course ID
   * @returns {Promise} - Promise with course data
   */
  getCourseById: async (id) => {
    const response = await apiClient.get(`/courses/${id}`);
    return response.data;
  },

  /**
   * Get recommended courses based on user profile
   * @returns {Promise} - Promise with recommended courses
   */
  getRecommendedCourses: async () => {
    const response = await apiClient.get('/ai/recommend/courses');
    return response.data;
  },

  /**
   * Enroll in a course
   * @param {string} courseId - Course ID
   * @returns {Promise} - Promise with enrollment status
   */
  enrollCourse: async (courseId) => {
    const response = await apiClient.post(`/courses/${courseId}/enroll`);
    return response.data;
  },

  /**
   * Get user's enrolled courses
   * @returns {Promise} - Promise with enrolled courses
   */
  getEnrolledCourses: async () => {
    const response = await apiClient.get('/courses/enrolled');
    return response.data;
  }
};

export default courseService;