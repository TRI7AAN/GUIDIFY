import React, { useState, useEffect } from "react";
import SEO from "../components/ui/SEO";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import styled from "styled-components";
import { supabase } from "../utils/supabaseClient";
import AuthErrorFallback from "../components/auth/AuthErrorFallback";
import AuthLoadingFallback from "../components/auth/AuthLoadingFallback";

const FormContainer = styled.div`
  max-width: 400px;
  margin: 5vh auto;
  padding: 2rem;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const FormTitle = styled.h2`
  color: var(--primary, #39FF14);
  margin-bottom: 1.5rem;
  font-size: 1.75rem;
  text-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-md);
  color: var(--cyber-white);
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--primary, #39FF14);
    box-shadow: 0 0 0 2px rgba(57, 255, 20, 0.2);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: var(--primary, #39FF14);
  color: #000;
  border: none;
  border-radius: var(--border-radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 15px rgba(57, 255, 20, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 20px rgba(57, 255, 20, 0.5);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  color: var(--status-error);
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: rgba(255, 51, 102, 0.1);
  border-radius: var(--border-radius-sm);
  font-size: 0.875rem;
`;

const RegisterLink = styled.div`
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--cyber-white);
  
  a {
    color: var(--primary, #39FF14);
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showFallback, setShowFallback] = useState(false);

  const { login, authError, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect path from location state or default to dashboard
  const from = location.state?.from || "/onboarding";

  // Reset error when auth context error changes
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  // Reset form if too many failed attempts
  useEffect(() => {
    if (loginAttempts >= 5) {
      // Show fallback UI after 5 failed attempts
      setShowFallback(true);

      // Reset after 30 seconds
      const timer = setTimeout(() => {
        setLoginAttempts(0);
        setShowFallback(false);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [loginAttempts]);

  const validateForm = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }

    if (!password) {
      setError("Password is required");
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({ email, password });

      if (result.error) throw result.error;

      if (result.data && result.data.user) {
        // Reset login attempts on success
        setLoginAttempts(0);

        // Check onboarding status and redirect accordingly
        // Note: We might need to fetch the profile here or rely on AuthContext to update it
        // For now, we'll assume the context will update and we can redirect
        // But since we can't easily check onboardingComplete from the result immediately without a profile fetch,
        // we might want to let the AuthContext handling in App.jsx or a separate check handle it.
        // However, the original code tried to check `result.onboardingComplete` which definitely doesn't exist on the supabase response.
        // We will redirect to /dashboard and let the ProtectedRoute/OnboardingCheck handle the rest.
        navigate("/dashboard");
      } else {
        // Increment failed attempts
        setLoginAttempts(prev => prev + 1);
        setError("Invalid email or password. Please try again.");
      }
    } catch (err) {
      // Increment failed attempts
      setLoginAttempts(prev => prev + 1);

      // Handle specific error cases
      if (err.message?.includes("clock skew")) {
        setError("Authentication error: Your device clock may be incorrect. Please check your system time.");
      } else if (err.message?.includes("rate limit")) {
        setError("Too many login attempts. Please try again later.");
        setShowFallback(true);
      } else {
        setError(err.message || "Invalid email or password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      // Auth callback will handle redirection based on onboarding status
    } catch (err) {
      if (err.message?.includes("popup")) {
        setError("Login popup was blocked. Please allow popups for this site.");
      } else {
        setError(err.message || "Google login failed. Please try again.");
      }
    }
  };

  // Show fallback UI if too many failed attempts
  if (showFallback) {
    return (
      <AuthErrorFallback
        title="Login Temporarily Disabled"
        message="Too many failed login attempts. Please try again later or reset your password."
        actionText="Back to Home"
        actionPath="/"
      />
    );
  }

  // Show loading fallback if auth is loading
  if (authLoading) {
    return <AuthLoadingFallback message="Authenticating..." />;
  }

  return (
    <FormContainer>
      <SEO title="Login" description="Sign in to your GUIDIFY account" canonicalUrl="/login" />
      <FormTitle>Login to GUIDIFY</FormTitle>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <form onSubmit={handleSubmit}>
        <FormInput
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
        <FormInput
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
        <SubmitButton type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </SubmitButton>
      </form>

      <SubmitButton
        onClick={handleGoogleLogin}
        style={{ marginTop: '1rem', background: '#39FF14' }}
        disabled={isLoading}
      >
        Login with Google
      </SubmitButton>

      <RegisterLink>
        Don't have an account? <Link to="/register">Register</Link>
      </RegisterLink>
    </FormContainer>
  );
};

export default LoginPage;
