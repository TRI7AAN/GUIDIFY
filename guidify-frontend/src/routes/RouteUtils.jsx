import React from 'react';
import { Route, Navigate } from 'react-router-dom';

/**
 * Maps route configuration objects to React Router Route components
 * 
 * @param {Array} routes - Array of route configuration objects
 * @param {Object} componentMap - Map of path to component
 * @param {React.Component} wrapper - Optional wrapper component (like ProtectedRoute)
 * @returns {Array} - Array of Route components
 */
export const mapRoutesToComponents = (routes, componentMap, wrapper = null) => {
  return routes.map(route => {
    const Component = componentMap[route.path];
    
    if (!Component) {
      console.warn(`No component found for route: ${route.path}`);
      return null;
    }
    
    const routeElement = <Route key={route.path} path={route.path} element={<Component />} />;
    
    if (wrapper) {
      return <Route key={route.path} element={wrapper}>{routeElement}</Route>;
    }
    
    return routeElement;
  }).filter(Boolean); // Remove null routes
};

/**
 * Creates a catch-all route that redirects to the 404 page
 * 
 * @returns {React.Component} - Route component
 */
export const createCatchAllRoute = () => {
  return <Route path="*" element={<Navigate to="/404" replace />} />;
};

export default {
  mapRoutesToComponents,
  createCatchAllRoute
};