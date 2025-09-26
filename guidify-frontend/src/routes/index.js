/**
 * GUIDIFY Routing Configuration
 * 
 * This file centralizes all route definitions for the application.
 * It exports route objects that can be used throughout the app.
 */

/**
 * Public Routes - Accessible without authentication
 */
export const publicRoutes = [
  {
    path: "/",
    name: "Home",
    description: "Landing page for GUIDIFY",
  },
  {
    path: "/modern",
    name: "Modern UI",
    description: "Alternative modern landing page",
  },
  {
    path: "/login",
    name: "Login",
    description: "User login page",
  },
  {
    path: "/register",
    name: "Register",
    description: "User registration page",
  },
  {
    path: "/auth/callback",
    name: "Auth Callback",
    description: "OAuth authentication callback handler",
  },
];

/**
 * Protected Routes - Require authentication
 */
export const protectedRoutes = [
  // Onboarding
  {
    path: "/onboarding",
    name: "Onboarding",
    description: "Complete your profile and aptitude assessment",
    category: "main",
  },

  // Dashboard
  {
    path: "/dashboard",
    name: "Dashboard",
    description: "User dashboard with access to all features",
    category: "main",
  },

  // Career
  {
    path: "/org-profiles",
    name: "Organizations",
    description: "Organization profiles and information",
    category: "career",
  },
  {
    path: "/roadmap",
    name: "Career Roadmap",
    description: "AI-powered career roadmap generator",
    category: "career",
  },

  // Tools
  {
    path: "/stats",
    name: "Statistics",
    description: "User statistics and analytics dashboard",
    category: "tools",
  },
];

/**
 * Error Routes
 */
export const errorRoutes = [
  {
    path: "/404",
    name: "Not Found",
    description: "Page not found error",
  },
];

/**
 * All Routes Combined
 */
export const allRoutes = [...publicRoutes, ...protectedRoutes, ...errorRoutes];

/**
 * Get route by path
 * @param {string} path - The route path to find
 * @returns {Object|null} - The route object or null if not found
 */
export const getRouteByPath = (path) => {
  return allRoutes.find(route => route.path === path) || null;
};

/**
 * Get routes by category
 * @param {string} category - The category to filter by
 * @returns {Array} - Array of route objects in the category
 */
export const getRoutesByCategory = (category) => {
  return protectedRoutes.filter(route => route.category === category);
};

/**
 * Get route name by path
 * @param {string} path - The route path
 * @returns {string} - The route name or the path if not found
 */
export const getRouteNameByPath = (path) => {
  const route = getRouteByPath(path);
  return route ? route.name : path;
};

export default {
  publicRoutes,
  protectedRoutes,
  errorRoutes,
  allRoutes,
  getRouteByPath,
  getRoutesByCategory,
  getRouteNameByPath,
};