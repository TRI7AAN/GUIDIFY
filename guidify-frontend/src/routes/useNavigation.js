import { useNavigate, useLocation } from 'react-router-dom';
import { getRouteByPath, allRoutes } from './index';

/**
 * Custom hook for enhanced navigation functionality
 * 
 * Provides utilities for working with the centralized route configuration
 */
export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  /**
   * Navigate to a route by its path
   * @param {string} path - The route path
   * @param {Object} options - Navigation options
   */
  const navigateTo = (path, options = {}) => {
    navigate(path, options);
  };
  
  /**
   * Navigate to a route and store the current location for returning later
   * @param {string} path - The route path
   */
  const navigateWithReturn = (path) => {
    navigate(path, { state: { from: location.pathname } });
  };
  
  /**
   * Return to the previous location or fallback to a default path
   * @param {string} defaultPath - Default path to navigate to if no return path exists
   */
  const navigateBack = (defaultPath = '/') => {
    const returnPath = location.state?.from || defaultPath;
    navigate(returnPath);
  };
  
  /**
   * Check if the current path matches or starts with the given path
   * @param {string} path - The path to check
   * @param {boolean} exact - Whether to check for exact match
   * @returns {boolean} - Whether the path matches
   */
  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  
  /**
   * Get the current route object
   * @returns {Object|null} - The current route object or null if not found
   */
  const getCurrentRoute = () => {
    return getRouteByPath(location.pathname) || null;
  };
  
  /**
   * Get breadcrumbs for the current path
   * @returns {Array} - Array of breadcrumb objects with path and name
   */
  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    // Always include home
    breadcrumbs.push({
      path: '/',
      name: 'Home',
    });
    
    // Build up paths and find matching routes
    let currentPath = '';
    for (const segment of pathSegments) {
      currentPath += `/${segment}`;
      const route = getRouteByPath(currentPath);
      
      if (route) {
        breadcrumbs.push({
          path: currentPath,
          name: route.name,
        });
      } else {
        // Handle dynamic segments or unknown routes
        breadcrumbs.push({
          path: currentPath,
          name: segment.charAt(0).toUpperCase() + segment.slice(1),
        });
      }
    }
    
    return breadcrumbs;
  };
  
  return {
    navigateTo,
    navigateWithReturn,
    navigateBack,
    isActive,
    getCurrentRoute,
    getBreadcrumbs,
    currentPath: location.pathname,
  };
};

export default useNavigation;