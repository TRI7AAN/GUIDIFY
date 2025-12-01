# GUIDIFY Routing System Documentation

## Overview

This document outlines the routing architecture for the GUIDIFY frontend application. The routing system is built using React Router v7 and follows a centralized configuration approach for better maintainability.

## Route Structure

All routes are defined in `src/routes/index.js` and categorized as follows:

### Public Routes

These routes are accessible without authentication:

- `/` - Landing page
- `/modern` - Alternative modern landing page
- `/login` - User login page
- `/register` - User registration page

### Protected Routes

These routes require authentication and are further categorized by feature:

#### Main
- `/dashboard` - User dashboard with access to all features

#### Learning
- `/courses` - Browse and access learning courses
- `/courses/modern` - Alternative modern courses UI

#### Career
- `/jobs` - Job listings and application form
- `/org-profiles` - Organization profiles and information

#### Tools
- `/stats` - User statistics and analytics dashboard
- `/pdf-loader` - Upload and analyze PDF documents
- `/pdf-loader/modern` - Alternative modern PDF tools UI
- `/interview` - AI-powered interview practice tool

### Error Routes
- `/404` - Page not found error

## Authentication Flow

The authentication flow is handled by the `AuthContext` and `ProtectedRoute` components:

1. When a user attempts to access a protected route, the `ProtectedRoute` component checks if they are authenticated.
2. If authenticated, the user is allowed to access the route.
3. If not authenticated, the user is redirected to the login page.
4. After successful login, the user is redirected back to the originally requested page.

## Adding New Routes

To add a new route to the application:

1. Create the new page component in the `src/pages` directory.
2. Import and add the component to `App.jsx` using React.lazy() for code splitting.
3. Add the route configuration to the appropriate array in `src/routes/index.js`.

### Example: Adding a new protected route

```javascript
// 1. Create the component in src/pages/NewFeaturePage.jsx

// 2. Import in App.jsx
const NewFeaturePage = React.lazy(() => import('./pages/NewFeaturePage'));

// 3. Add to routes/index.js
export const protectedRoutes = [
  // ... existing routes
  {
    path: "/new-feature",
    name: "New Feature",
    description: "Description of the new feature",
    category: "tools", // or appropriate category
  },
];
```

## Navigation

Navigation is primarily handled through the `Navbar` component, which uses the route configuration to dynamically generate navigation links based on user authentication status.

## Code Splitting

All page components are loaded using React.lazy() to implement code splitting, which improves initial load performance by only loading the code needed for the current route.

## SEO

Page titles and metadata are managed using `react-helmet-async` in each page component. This ensures proper SEO for all routes.

## Styling

The routing system maintains the GUIDIFY dark + neon green theme across all pages through:

1. A global theme provided by styled-components
2. Consistent styling components in the Layout wrapper
3. Shared style variables

## Best Practices

1. Always use the `Link` component from react-router-dom for internal navigation
2. Use the route utility functions from `routes/index.js` to reference routes by name
3. Keep route definitions centralized in the routes configuration file
4. Use lazy loading for all page components
5. Implement proper loading states for lazy-loaded components