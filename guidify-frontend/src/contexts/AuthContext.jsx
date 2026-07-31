import React, { createContext, useState, useContext, useEffect, useRef, useMemo } from "react";
import { supabase } from "../utils/supabaseClient";
import { setAuthToken } from "../api/apiClient";
import Loading from "../components/common/Loading";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Ref to track latest user ID to avoid stale closures in async ops
  const userIdRef = useRef(null);
  const syncingRef = useRef(false);

  /**
   * 2. Fetch Profile With Retry
   * Retries fetching the profile up to maxRetries times.
   */
  const fetchProfileWithRetry = async (userId, retries = 3, delayMs = 300) => {
    if (!userId) return null;

    for (let i = 0; i < retries; i++) {
      try {
        // Timeout wrapper (8 seconds — fast fail, retry handles transient issues)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Profile fetch timeout")), 8000)
        );

        const fetchPromise = supabase
          .from('learners')
          .select('onboarding_completed')
          .eq('id', userId)
          .single();

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

        if (error) {
          if (error.code === 'PGRST116') {
            // Profile not found - might be race condition during creation.
            console.warn(`Profile missing (attempt ${i + 1}/${retries}). Retrying...`);
            if (i === retries - 1) return null;
          } else {
            throw error;
          }
        } else if (data) {
          return data;
        }

        // Wait before retry with exponential backoff
        await new Promise(r => setTimeout(r, delayMs * Math.pow(1.5, i)));

      } catch (err) {
        console.error(`Fetch profile error (attempt ${i + 1}):`, err);
        if (i === retries - 1) return null;
        await new Promise(r => setTimeout(r, delayMs * Math.pow(1.5, i)));
      }
    }
    return null;
  };

  /**
   * 3. Orchestrator: Fetch and Sync State
   */
  const syncAuthState = async (currentUser, session) => {
    if (!currentUser) {
      setUser(null);
      userIdRef.current = null;
      setAuthToken(null);
      localStorage.removeItem('guidify_token');
      setOnboardingComplete(false);
      setLoading(false);
      syncingRef.current = false;
      return;
    }

    // Deduplicate: skip if already syncing for this user
    if (syncingRef.current && userIdRef.current === currentUser.id) return;
    syncingRef.current = true;

    // Set basics immediately
    setUser(currentUser);
    userIdRef.current = currentUser.id;
    setAuthToken(session?.access_token);
    // Persist token to localStorage so it survives page refresh
    if (session?.access_token) {
      localStorage.setItem('guidify_token', session.access_token);
    } else {
      localStorage.removeItem('guidify_token');
    }

    try {
      // BUG-07: Profile is created by the DB trigger `on_auth_user_created` on signup.
      // We only need to fetch it — no manual insert needed from the frontend.
      const profile = await fetchProfileWithRetry(currentUser.id);

      if (profile) {
        setOnboardingComplete(profile.onboarding_completed);
      } else {
        console.warn("Profile not found after retries. User may need to complete signup.");
        setOnboardingComplete(false);
      }
    } catch (err) {
      console.error("Sync auth state error:", err);
    } finally {
      syncingRef.current = false;
      setLoading(false);
    }
  };


  useEffect(() => {
    let mounted = true;

    // MED-07 FIX: Safety valve — if auth takes >30 seconds, explicitly sign out to ensure
    // the app doesn't reach a partially-initialized state where user=null but isLoading=false
    // without protected routes knowing to redirect to login.
    // 30s allows 3 retries at 8s each (24s max) with buffer for cold starts.
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        console.warn("⚠️ Auth initialization timed out (30s). Clearing session state and redirecting.");
        setUser(null);
        setOnboardingComplete(false);
        setAuthToken(null);
        setLoading(false);
        // Protected routes check `user === null` + `loading === false` → redirect to /login automatically
      }
    }, 30000);

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          await syncAuthState(session?.user, session);
        }
      } catch (err) {
        console.error("Auth Init Failed:", err);
        // If anything fails early, ensure we stop loading
        if (mounted) setLoading(false);
      } finally {
        if (mounted) {
          // If execution finished naturally before timeout, clear the safety timer
          // Note: syncAuthState sets loading(false) internally, but we ensure it here too just in case
          clearTimeout(safetyTimer);
        }
      }
    };

    initAuth();

    // Auth Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentUserId = session?.user?.id;
      const prevUserId = userIdRef.current;

      // Only sync if user actually changed or signed in
      if (event === 'SIGNED_IN' || currentUserId !== prevUserId) {
        await syncAuthState(session?.user, session);
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setAuthToken(session?.access_token);
      } else if (event === 'SIGNED_OUT') {
        syncAuthState(null, null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    signUp: (data) => supabase.auth.signUp(data),
    // CQ-07: Removed duplicate `login` method — `signIn` is canonical
    signIn: (data) => supabase.auth.signInWithPassword(data),
    signOut: async () => {
      try {
        await supabase.auth.signOut();
        // CQ-05 FIX: Only clear GUIDIFY-specific keys, not ALL localStorage
        // (clearing all would wipe third-party SDK state and user preferences)
        localStorage.removeItem('guidify_token');
        localStorage.removeItem('guidify_user');
        localStorage.removeItem('guidify_session');
      } catch (e) {
        console.error("Logout error", e);
      }
    },
    updateOnboardingStatus: (status) => setOnboardingComplete(status),
    user,
    onboardingComplete,
    loading
  }), [user, onboardingComplete, loading]);

  if (loading) {
    return <Loading message="Initializing Secure Pipeline..." />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
