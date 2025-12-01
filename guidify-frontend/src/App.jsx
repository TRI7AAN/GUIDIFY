import React, { Suspense, lazy, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { supabase } from "./utils/supabaseClient";
import Layout from "./components/layout/Layout";
import { publicRoutes, protectedRoutes, errorRoutes } from "./routes";

// Lazy load components
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const CareerRoadmap = lazy(() => import("./pages/CareerRoadmap"));

// Loading component with GUIDIFY styling
const LoadingFallback = () => (
  <div className="loading-container" style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100%',
    position: 'fixed',
    top: 0,
    left: 0,
    background: 'var(--deep-space-blue)',
    zIndex: 9999
  }}>
    <div className="loading neon" style={{
      color: 'var(--primary, #39FF14)',
      fontSize: '1.5rem',
      textShadow: '0 0 10px var(--primary, #39FF14)'
    }}>
      Loading...
    </div>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Onboarding check component
const OnboardingCheck = () => {
  const { user, loading, onboardingComplete } = useAuth();

  if (loading) {
    return <LoadingFallback />;
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

// This component has been replaced by the OnboardingCheck component above
// Keeping the useEffect logic for reference
// This component has been replaced by the OnboardingCheck component above
// Keeping the useEffect logic for reference
/*
const OldOnboardingCheck = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // Check if user has completed onboarding
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        
        setHasCompletedOnboarding(data?.onboarding_completed || false);
      } catch (err) {
        console.error("Error checking onboarding status:", err);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  if (loading) {
    return <LoadingFallback />;
  }

  // If user hasn't completed onboarding and isn't on the onboarding page, redirect
  if (!hasCompletedOnboarding && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};
*/

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <OnboardingProvider>
          <BrowserRouter>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* Public Routes */}
                  {publicRoutes.map(route => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={React.createElement(componentMap[route.path])}
                    />
                  ))}

                  {/* Auth Callback Route */}
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* Protected Routes - Require Authentication */}
                  <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                    {/* Onboarding Route */}
                    <Route path="/onboarding" element={<Onboarding />} />

                    {/* Routes that require onboarding completion */}
                    <Route element={<OnboardingCheck><Outlet /></OnboardingCheck>}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      {protectedRoutes.filter(route =>
                        route.path !== "/dashboard" &&
                        route.path !== "/onboarding"
                      ).map(route => (
                        <Route
                          key={route.path}
                          path={route.path}
                          element={React.createElement(componentMap[route.path])}
                        />
                      ))}
                    </Route>
                  </Route>

                  {/* Error routes */}
                  {errorRoutes.map(route => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={React.createElement(componentMap[route.path])}
                    />
                  ))}

                  {/* Catch-all route */}
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
              </Suspense>
            </Layout>
          </BrowserRouter>
        </OnboardingProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
