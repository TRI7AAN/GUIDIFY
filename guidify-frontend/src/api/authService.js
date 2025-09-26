/**
 * Authentication Service
 * 
 * Provides methods for user authentication, registration, and profile management.
 */

import apiClient from './apiClient';

const authService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.name - User's full name
   * @param {string} userData.email - User's email
   * @param {string} userData.password - User's password
   * @returns {Promise} - Promise with user data and token
   */
  register: async (userData) => {
    const response = await apiClient.post('/auth/signup', userData);
    if (response.user?.session?.access_token) {
      localStorage.setItem('guidify_token', response.user.session.access_token);
      localStorage.setItem('guidify_user', JSON.stringify(response.user));
    }
    return response;
  },

  /**
   * Login a user
   * @param {Object} credentials - User login credentials
   * @param {string} credentials.email - User's email
   * @param {string} credentials.password - User's password
   * @returns {Promise} - Promise with user data and token
   */
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    if (response.session?.access_token) {
      localStorage.setItem('guidify_token', response.session.access_token);
      localStorage.setItem('guidify_user', JSON.stringify(response.user));
    }
    return response;
  },

  /**
   * Get current user profile
   * @returns {Promise} - Promise with user profile data
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/profile');
    return response;
  },

  /**
   * Update user profile
   * @param {Object} profileData - Updated profile data
   * @returns {Promise} - Promise with updated user data
   */
  updateProfile: async (profileData) => {
    const response = await apiClient.put('/auth/profile', profileData);
    return response;
  },

  /**
   * Logout current user
   * @returns {Promise} - Promise with logout status
   */
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    // Always clear local storage on logout attempt
    localStorage.removeItem('guidify_token');
    localStorage.removeItem('guidify_user');
    return response;
  }
};

export default authService;