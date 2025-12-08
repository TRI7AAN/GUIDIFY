import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import PublicLayout from "./components/layout/PublicLayout";
import PrivateLayout from "./components/layout/PrivateLayout";
import { publicRoutes, protectedRoutes, errorRoutes } from "./routes";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Loading from "./components/common/Loading";

// Lazy load components
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const CareerRoadmap = lazy(() => import("./pages/CareerRoadmap"));

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading message="Verifying Identity..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Onboarding check component
const OnboardingCheck = () => {
  const { loading, onboardingComplete } = useAuth();

  if (loading) {
    return <Loading message="Checking Profile..." />;
  }

  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

// Component map for route configuration
const componentMap = {
  // Public routes
  "/": LandingPage,
  "/modern": LandingPage,
  "/login": LoginPage,
  "/register": RegisterPage,
  "/auth/callback": AuthCallback,

  // Protected routes
  "/dashboard": Dashboard,
  "/onboarding": Onboarding,
  "/roadmap": CareerRoadmap,

  // Error routes
  "/404": NotFound
};


function App() {
  React.useEffect(() => {
    // circuit breaker cleanup
    localStorage.removeItem('api-circuit-breaker');
  }, []);

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <OnboardingProvider>
            <BrowserRouter>
              <Suspense fallback={<Loading message="Initializing GUIDIFY..." />}>
                <Routes>
                  {/* Public Routes - Wrapped in PublicLayout (Has Navbar) */}
                  {publicRoutes.map(route => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={
                        <PublicLayout>
                          {React.createElement(componentMap[route.path])}
                        </PublicLayout>
                      }
                    />
                  ))}

                  {/* Auth Callback Route - Public Layout */}
                  <Route
                    path="/auth/callback"
                    element={
                      <PublicLayout>
                        <AuthCallback />
                      </PublicLayout>
                    }
                  />

                  {/* Protected Routes - require authentication */}
                  <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>

                    {/* Onboarding - PrivateLayout (No Navbar) */}
                    <Route
                      path="/onboarding"
                      element={
                        <PrivateLayout>
                          <Onboarding />
                        </PrivateLayout>
                      }
                    />

                    {/* Dashboard & others - PrivateLayout (No Navbar) */}
                    <Route element={<OnboardingCheck><Outlet /></OnboardingCheck>}>
                      <Route
                        path="/dashboard"
                        element={
                          <PrivateLayout>
                            <Dashboard />
                          </PrivateLayout>
                        }
                      />

                      {protectedRoutes.filter(route =>
                        route.path !== "/dashboard" &&
                        route.path !== "/onboarding"
                      ).map(route => (
                        <Route
                          key={route.path}
                          path={route.path}
                          element={
                            <PrivateLayout>
                              {React.createElement(componentMap[route.path])}
                            </PrivateLayout>
                          }
                        />
                      ))}
                    </Route>
                  </Route>

                  {/* Error routes - Public Layout */}
                  {errorRoutes.map(route => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={
                        <PublicLayout>
                          {React.createElement(componentMap[route.path])}
                        </PublicLayout>
                      }
                    />
                  ))}

                  {/* Catch-all route */}
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </OnboardingProvider>
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
