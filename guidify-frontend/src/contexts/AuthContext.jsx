import React, { createContext, useState, useContext, useEffect, useRef, useMemo } from "react";
import { supabase } from "../utils/supabaseClient";
import { setAuthToken } from "../api/apiClient"; // Import token setter

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const abortControllerRef = useRef(null);
  const userIdRef = useRef(null); // Track user ID to avoid stale closures

  const fetchProfile = React.useCallback(async (userId) => {
    // 1. Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // 2. Create new controller
    const newController = new AbortController();
    abortControllerRef.current = newController;

    try {
      // Create a timeout promise (30 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 30000)
      );

      // Use supabase directly but respect the controller
      const fetchPromise = supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('user_id', userId)
        .single()
        .abortSignal(newController.signal);

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        // Ignore PGRST116 (no rows) as it just means profile doesn't exist yet
        if (error.code === 'PGRST116') {
          console.log('Profile not found (new user)');
          if (!newController.signal.aborted) setOnboardingComplete(false);
          return;
        }
        throw error;
      }

      // 3. Only update state if this is still the active request
      if (!newController.signal.aborted) {
        if (data) {
          setOnboardingComplete(data.onboarding_complete);
        } else {
          setOnboardingComplete(false);
        }
      }
    } catch (error) {
      // CRITICAL FIX: Ignore AbortErrors completely
      if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
        return;
      }

      console.error("Real profile fetch error:", error.message);
      // Only set error state for REAL errors
      if (!newController.signal.aborted) setOnboardingComplete(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Global safety timeout to ensure we don't get stuck on loading forever
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth initialization took too long, forcing loading to false");
        setLoading(false);
      }
    }, 20000);

    // 1. Check active session immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted) {
        if (session?.user) {
          setUser(session.user);
          userIdRef.current = session.user.id; // Update ref

          // Set token in memory and try localStorage
          setAuthToken(session.access_token);
          try {
            localStorage.setItem('guidify_token', session.access_token);
          } catch (e) {
            console.warn("LocalStorage access blocked:", e);
          }
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          userIdRef.current = null; // Update ref
          setAuthToken(null);
          try {
            localStorage.removeItem('guidify_token');
          } catch (e) {
            console.warn("LocalStorage access blocked:", e);
          }
        }
        setLoading(false);
        clearTimeout(safetyTimeout); // Clear safety timeout on success
      }
    }).catch(err => {
      console.error("Error getting session:", err);
      if (mounted) {
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    });

    // 2. Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        const currentUserId = userIdRef.current;

        // Skip profile fetch on token refresh if we already have the user
        if (event === 'TOKEN_REFRESHED' && currentUserId && session?.user?.id === currentUserId) {
          // Just update the token
          if (session?.access_token) {
            setAuthToken(session.access_token);
            try {
              localStorage.setItem('guidify_token', session.access_token);
            } catch (e) {
              console.warn("LocalStorage access blocked:", e);
            }
          }
          return;
        }

        if (session?.user) {
          setUser(session.user);
          userIdRef.current = session.user.id; // Update ref

          setAuthToken(session.access_token);
          try {
            localStorage.setItem('guidify_token', session.access_token);
          } catch (e) {
            console.warn("LocalStorage access blocked:", e);
          }

          // Only fetch profile if it's a sign-in or initial session
          // We avoid fetching on USER_UPDATED to prevent loops with OnboardingContext
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || !currentUserId) {
            await fetchProfile(session.user.id);
          }
        } else {
          setUser(null);
          userIdRef.current = null; // Update ref
          setAuthToken(null);
          try {
            localStorage.removeItem('guidify_token');
          } catch (e) {
            console.warn("LocalStorage access blocked:", e);
          }
          setOnboardingComplete(false);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };

  }, [fetchProfile]);

  // Listen for unauthorized events from apiClient
  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("Unauthorized access detected, logging out...");
      // Clear local state
      setUser(null);
      userIdRef.current = null;
      setAuthToken(null);
      setOnboardingComplete(false);

      // Clear storage
      try {
        localStorage.removeItem('guidify_token');
      } catch (e) {
        console.warn("LocalStorage access blocked:", e);
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const value = useMemo(() => ({
    signUp: (data) => supabase.auth.signUp(data),
    signIn: (data) => supabase.auth.signInWithPassword(data),
    login: (data) => supabase.auth.signInWithPassword(data), // Alias for LoginPage
    signOut: () => {
      try {
        localStorage.removeItem('guidify_token');
      } catch (e) {
        console.warn("LocalStorage access blocked:", e);
      }
      return supabase.auth.signOut();
    },
    updateOnboardingStatus: (status) => setOnboardingComplete(status), // Allow external updates
    user,
    onboardingComplete,
    loading
  }), [user, onboardingComplete, loading]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#39FF14'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;
