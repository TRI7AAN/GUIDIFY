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

  // 1. Stable fetchProfile function
  const fetchProfile = React.useCallback(async (userId) => {
    if (!userId) return;

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Create a timeout promise (15 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 15000)
      );

      const fetchPromise = supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('user_id', userId)
        .single()
        .abortSignal(controller.signal);

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (controller.signal.aborted) return;

      if (error) {
        // Ignore PGRST116 (no rows) as it just means profile doesn't exist yet
        if (error.code === 'PGRST116') {
          console.log('Profile not found (new user)');
          setOnboardingComplete(false);
          return;
        }
        throw error;
      }

      if (data) {
        setOnboardingComplete(data.onboarding_complete);
      } else {
        setOnboardingComplete(false);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.name === 'AbortError') return;

      console.error("Real profile fetch error:", error.message);
      // Do NOT set error state here to avoid UI flicker, just default to false
      setOnboardingComplete(false);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  // 2. Initialize Auth
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            userIdRef.current = session.user.id;
            setAuthToken(session.access_token);
            // Fetch profile only once on mount
            await fetchProfile(session.user.id);
          } else {
            setUser(null);
            userIdRef.current = null;
            setAuthToken(null);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const previousUserId = userIdRef.current;
      const currentUserId = session?.user?.id;

      if (session?.user) {
        setUser(session.user);
        userIdRef.current = currentUserId;
        setAuthToken(session.access_token);

        // Only fetch profile if user CHANGED or it's a fresh sign-in
        // Avoid fetching on TOKEN_REFRESH if user is same
        if (event === 'SIGNED_IN' || (currentUserId && currentUserId !== previousUserId)) {
          await fetchProfile(currentUserId);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        userIdRef.current = null;
        setAuthToken(null);
        setOnboardingComplete(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchProfile]);

  // Listen for unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      if (userIdRef.current) {
        console.warn("Unauthorized access detected, logging out...");
        supabase.auth.signOut().then(() => {
          setUser(null);
          userIdRef.current = null;
          setAuthToken(null);
          setOnboardingComplete(false);
        });
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
