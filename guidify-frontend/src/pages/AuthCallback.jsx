import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingStatus, setProcessingStatus] = useState('Authenticating...');

  const handleProfileAndRedirect = useCallback(async (session) => {
    setProcessingStatus('Checking profile...');

    let profile = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (!profile && retryCount < maxRetries) {
      const result = await supabase
        .from('learners')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (result.error) {
        if (result.error.code === 'PGRST116') break;
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        break;
      }
      if (result.data) profile = result.data;
    }

    if (!profile) {
      setProcessingStatus('Creating profile...');
      const { error: upsertError } = await supabase
        .from('learners')
        .upsert([{
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email,
          onboarding_completed: false,
        }], { onConflict: 'id' });

      if (upsertError) throw new Error('Failed to create user profile');
      navigate('/onboarding', { replace: true });
    } else if (profile.onboarding_completed) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    let processed = false;

    const timeoutId = setTimeout(() => {
      if (mounted && !processed) {
        setError('Authentication timed out. Please try again.');
        setLoading(false);
      }
    }, 20000);

    const processSession = async (session) => {
      if (processed || !mounted) return;
      processed = true;
      clearTimeout(timeoutId);
      try {
        await handleProfileAndRedirect(session);
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setTimeout(() => navigate('/login', { replace: true }), 3000);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const handleAuthCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        // 1) If there's a PKCE code, exchange it
        if (code) {
          setProcessingStatus('Verifying authentication...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            throw new Error('Failed to complete authentication. Please try again.');
          }
          if (data?.session) {
            await processSession(data.session);
            return;
          }
        }

        // 2) Check if session already exists (detectSessionInUrl may have processed it)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await processSession(session);
          return;
        }

        // 3) Wait for onAuthStateChange to fire (handles implicit flow / hash fragment)
        setProcessingStatus('Waiting for authentication...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session && !processed) {
              await processSession(session);
            }
          }
        );

        // Also poll as a safety net for up to 10 seconds
        let pollCount = 0;
        const pollInterval = setInterval(async () => {
          pollCount++;
          if (processed || pollCount > 20) {
            clearInterval(pollInterval);
            return;
          }
          const { data: { session } } = await supabase.auth.getSession();
          if (session && !processed) {
            clearInterval(pollInterval);
            subscription?.unsubscribe();
            await processSession(session);
          }
        }, 500);

        // Cleanup on unmount
        return () => {
          subscription?.unsubscribe();
          clearInterval(pollInterval);
        };
      } catch (err) {
        console.error('Auth callback error:', err);
        if (mounted && !processed) {
          setError(err.message || 'Authentication failed');
          setTimeout(() => navigate('/login', { replace: true }), 3000);
        }
      }
    };

    handleAuthCallback();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [navigate, handleProfileAndRedirect]);

  if (error) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-6">
          <span className="text-2xl">!</span>
        </div>
        <p className="text-surface-800/70 mb-4">{error}</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mb-4" />
      <p className="text-surface-800/60 text-sm">{processingStatus}</p>
    </div>
  );
};

export default AuthCallback;
