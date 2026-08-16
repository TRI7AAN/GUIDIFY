import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import PublicLayout from "./components/layout/PublicLayout";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/layout/ProtectedRoute";
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
const ResumePage = lazy(() => import("./pages/ResumePage"));
const InterviewPage = lazy(() => import("./pages/InterviewPage"));
const PsychometricTestPage = lazy(() => import("./pages/PsychometricTestPage"));
const OrgProfilesPage = lazy(() => import("./pages/OrgProfilesPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));



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
  "/resume": ResumePage,
  "/interview": InterviewPage,
  "/psychometric-test": PsychometricTestPage,
  // F-16 FIX: /org-profiles and /stats are linked from Navbar/Footer but had no
  // component — React.createElement(undefined) crashed the SPA via ErrorBoundary.
  "/org-profiles": OrgProfilesPage,
  "/stats": StatsPage,


  // Error routes
  "/404": NotFound
};


function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
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

                  {/* Onboarding — wrapped in OnboardingProvider (no sidebar shell) */}
                  <Route
                    path="/onboarding"
                    element={
                      <OnboardingProvider>
                        <Onboarding />
                      </OnboardingProvider>
                    }
                  />

                  {/* Dashboard & others — with AppShell (sidebar + topbar) */}
                  <Route
                    path="/dashboard"
                    element={
                      <AppShell>
                        <Dashboard />
                      </AppShell>
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
                        <AppShell>
                          {React.createElement(componentMap[route.path])}
                        </AppShell>
                      }
                    />
                  ))}
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
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
