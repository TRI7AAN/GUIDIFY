import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: var(--deep-space-gradient);
`;

const LoadingText = styled.div`
  color: var(--emerald-neon);
  font-size: 1.5rem;
  margin-top: 1rem;
  text-shadow: 0 0 10px var(--emerald-neon);
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 3px solid rgba(57, 255, 20, 0.3);
  border-radius: 50%;
  border-top-color: var(--emerald-neon);
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorContainer = styled.div`
  color: var(--status-error);
  margin-bottom: 1rem;
  text-align: center;
  max-width: 80%;
`;

const ActionButton = styled.button`
  background: var(--glass-bg);
  border: 1px solid var(--emerald-neon);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(57, 255, 20, 0.1);
    box-shadow: 0 0 10px var(--emerald-neon);
  }
`;

// Helper function to validate session
const isValidSession = (session) => {
  if (!session) return false;

  try {
    // Check if token is expired
    const tokenExpiry = new Date(session.expires_at * 1000);
    const now = new Date();

    // Add a 5-minute buffer to handle minor clock skew
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const adjustedNow = new Date(now.getTime() - bufferTime);

    return tokenExpiry > adjustedNow;
  } catch (error) {
    console.error("Error validating session:", error);
    return false;
  }
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingStatus, setProcessingStatus] = useState('Authenticating...');

  useEffect(() => {
    // Set a timeout to prevent getting stuck in loading state
    const timeoutId = setTimeout(() => {
      if (loading) {
        setError('Authentication timed out. Please try again.');
        setLoading(false);
      }
    }, 15000); // 15 second timeout

    const handleAuthCallback = async () => {
      try {
        // Get session from URL
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Failed to retrieve session');
        }

        if (!session) {
          throw new Error('No session found');
        }

        // Validate session to handle clock skew issues
        if (!isValidSession(session)) {
          console.error('Session validation failed - possible clock skew issue');
          throw new Error('Session validation failed. Please check your device clock and try again.');
        }

        setProcessingStatus('Checking profile...');

        // Check if user profile exists with retry logic
        let profile = null;
        let profileError = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (!profile && retryCount < maxRetries) {
          try {
            const result = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();

            profileError = result.error;

            if (profileError && profileError.code !== 'PGRST116') {
              console.error(`Profile fetch attempt ${retryCount + 1} failed:`, profileError);

              // If it's a server error, retry
              if (profileError.code.startsWith('5') || profileError.code === '429') {
                retryCount++;
                if (retryCount < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  continue;
                }
              } else {
                // Client error that's not "not found" - break and handle
                break;
              }
            } else if (!profileError) {
              profile = result.data;
              break;
            } else {
              // PGRST116 - not found, which is expected for new users
              break;
            }
          } catch (err) {
            console.error(`Profile fetch attempt ${retryCount + 1} failed with exception:`, err);
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        // If profile doesn't exist, create one with onboarding_complete = false
        if (!profile) {
          setProcessingStatus('Creating profile...');

          // Try to create/update profile with upsert
          try {
            const { error: upsertError } = await supabase
              .from('profiles')
              .upsert([
                {
                  user_id: session.user.id,
                  email: session.user.email,
                  name: session.user.user_metadata?.full_name || session.user.email,
                  role: 'student',
                  onboarding_complete: false
                }
              ], { onConflict: 'user_id' });

            if (upsertError) {
              console.error('Profile upsert failed:', upsertError);
              throw new Error('Failed to create user profile: ' + upsertError.message);
            }
          } catch (err) {
            console.error('Profile creation exception:', err);
            throw err;
          }

          setProcessingStatus('Redirecting to onboarding...');
          // New user, redirect to onboarding
          navigate('/onboarding', { replace: true });
        } else {
          // Existing user, check onboarding status
          setProcessingStatus('Checking onboarding status...');

          if (profile.onboarding_complete) {
            setProcessingStatus('Redirecting to dashboard...');
            navigate('/dashboard', { replace: true });
          } else {
            setProcessingStatus('Redirecting to onboarding...');
            navigate('/onboarding', { replace: true });
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
        // On error, redirect to login after a short delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      } finally {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    handleAuthCallback();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [navigate]);

  if (error) {
    return (
      <LoadingContainer>
        <ErrorContainer>
          Authentication error: {error}
        </ErrorContainer>
        <ActionButton onClick={() => navigate('/login')}>
          Return to Login
        </ActionButton>
      </LoadingContainer>
    );
  }

  return (
    <LoadingContainer>
      <LoadingSpinner />
      <LoadingText>{processingStatus}</LoadingText>
    </LoadingContainer>
  );
};

export default AuthCallback;