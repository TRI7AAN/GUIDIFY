import React, { useState, useEffect } from "react";
import SEO from "../components/ui/SEO";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import styled from "styled-components";
import { supabase } from "../utils/supabaseClient";

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

const LoginLink = styled.div`
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

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      // Validate form
      if (!validateForm()) {
        setIsLoading(false);
        return;
      }

      // Register with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      // Create a profile with onboarding_complete set to false
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              user_id: data.user.id,
              name: name,
              email: email,
              onboarding_complete: false
            }
          ]);
          
        if (profileError) {
          console.error('Error creating profile:', profileError);
          throw profileError;
        }
      }

      // Redirect to onboarding after successful registration
      navigate("/onboarding");
    } catch (err) {
      console.error("Registration error:", err.message);
      setError(err.message || "An error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return false;
    }
    if (!email.trim()) {
      setError("Please enter your email");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    return true;
  };

  // Alternative registration method using context
  const handleContextRegister = () => {
    setError("");
    setIsLoading(true);
    
    register({
      username: name, // Using name as username for simplicity
      name: name,
      email: email,
      password: password,
      user_type: "B2C" // Default to B2C user type for open registration
    })
    .then(() => {
      // Redirect to onboarding after successful registration
      navigate("/onboarding");
    })
    .catch((err) => {
      console.error('Registration error:', err);

      // Check for different error types
      if (err.response?.data?.message) {
        // Use the backend's specific error message
        setError(err.response.data.message);
      } else if (err.response?.data?.detail) {
        // Use the backend's detail message
        setError(err.response.data.detail);
      } else if (err.response?.data?.error) {
        // Use the backend's error message
        setError(err.response.data.error);
      } else if (err.message && err.message.includes('already exists')) {
        // Check for "already exists" in the error message
        setError("Account already exists. Please use a different email or login instead.");
      } else if (err.response?.status === 409) {
        // HTTP 409 Conflict typically means resource already exists
        setError("Account already exists. Please use a different email or login instead.");
      } else if (err.response?.status === 400) {
        // Bad request - likely validation error
        setError("Invalid registration information. Please check your details.");
      } else {
        // Fallback error message
        setError("Registration failed. Please try again later.");
      }
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/onboarding`
        }
      });
      if (error) throw error;
      // Supabase will handle redirect on success
    } catch (err) {
      setError(err.message || "Google sign up failed. Please try again.");
    }
  };

  return (
    <FormContainer>
      <SEO title="Register" description="Create your GUIDIFY account" canonicalUrl="/register" />
      <FormTitle>Create Your Account</FormTitle>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <form onSubmit={handleSubmit}>
        <FormInput
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <FormInput
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FormInput
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <SubmitButton type="submit" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Register"}
        </SubmitButton>
      </form>

      <SubmitButton
        onClick={handleGoogleSignup}
        style={{ marginTop: '1rem', background: '#39FF14' }}
        type="button"
      >
        Sign up with Google
      </SubmitButton>

      <LoginLink>
        Already have an account? <Link to="/login">Log in</Link>
      </LoginLink>
    </FormContainer>
  );
}

export default RegisterPage;
