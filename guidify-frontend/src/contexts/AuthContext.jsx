// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

const AuthContext = createContext();

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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Fetch user profile from Supabase with retry mechanism
  const fetchUserProfile = async (userId, retryCount = 0) => {
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        // Handle specific error codes
        if (error.code === 'PGRST116') {
          // Record not found, might need to create profile
          return null;
        }
        
        if (error.code === '23505') {
          // Duplicate key error, retry after a short delay
          console.warn('Duplicate key error when fetching profile, retrying...');
          if (retryCount < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchUserProfile(userId, retryCount + 1);
          }
        }
        
        console.error('Error fetching profile:', error);
        setAuthError('Failed to fetch user profile. Please try again.');
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setAuthError('An unexpected error occurred. Please try again.');
      return null;
    }
  };

  // On mount, get session and listen for changes
  useEffect(() => {
    let mounted = true;
    
    const getSession = async () => {
      try {
        setAuthError(null);
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setAuthError('Authentication error: ' + error.message);
          setLoading(false);
          return;
        }
        
        if (mounted) {
          const session = data?.session;
          
          // Validate session to handle clock skew issues
          if (session && isValidSession(session)) {
            const currentUser = session.user;
            setUser(currentUser);
            
            if (currentUser) {
              const profile = await fetchUserProfile(currentUser.id);
              if (profile) {
                setUserProfile(profile);
                setOnboardingComplete(profile?.onboarding_complete || false);
              } else {
                console.warn('No profile found for user:', currentUser.id);
              }
            }
          } else {
            // Invalid or expired session
            console.warn('Invalid or expired session');
            setUser(null);
            setUserProfile(null);
            setOnboardingComplete(false);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Unexpected error in getSession:', error);
        if (mounted) {
          setAuthError('Failed to authenticate. Please try again.');
          setLoading(false);
        }
      }
    };
    
    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
      
      try {
        if (mounted) {
          setAuthError(null);
          
          if (session && isValidSession(session)) {
            const currentUser = session.user;
            setUser(currentUser);
            
            if (currentUser) {
              const profile = await fetchUserProfile(currentUser.id);
              if (profile) {
                setUserProfile(profile);
                setOnboardingComplete(profile?.onboarding_complete || false);
              }
            }
          } else {
            setUser(null);
            setUserProfile(null);
            setOnboardingComplete(false);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        if (mounted) {
          setAuthError('Authentication state change failed. Please refresh the page.');
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Login with improved error handling and session validation
  const login = async ({ email, password }) => {
    setLoading(true);
    setAuthError(null);
    
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('Login error:', error);
        throw error;
      }
      
      // Validate session
      if (!data.session || !isValidSession(data.session)) {
        console.error('Invalid session after login');
        throw new Error('Authentication failed. Please try again.');
      }
      
      setUser(data.user);
      
      // Fetch user profile to check onboarding status with retry logic
      if (data.user) {
        let profile = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!profile && retryCount < maxRetries) {
          profile = await fetchUserProfile(data.user.id);
          
          if (!profile) {
            console.warn(`Profile fetch attempt ${retryCount + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            retryCount++;
          }
        }
        
        if (profile) {
          setUserProfile(profile);
          setOnboardingComplete(profile?.onboarding_complete || false);
          return { 
            user: data.user, 
            profile, 
            onboardingComplete: profile?.onboarding_complete || false,
            session: data.session
          };
        } else {
          console.error('Failed to fetch profile after multiple attempts');
          setAuthError('Failed to load user profile. Please try again.');
        }
      }
      
      return { user: data.user, session: data.session };
    } catch (error) {
      // Set auth error for UI display
      setAuthError(error.message || 'Login failed. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register with improved error handling and profile creation
  const register = async ({ email, password, name }) => {
    setLoading(true);
    setAuthError(null);
    
    try {
      // Validate inputs
      if (!email || !password || !name) {
        throw new Error('Name, email, and password are required');
      }
      
      // Create the user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error('Registration error:', error);
        throw error;
      }
      
      // Check if user was created successfully
      if (!data.user || !data.user.id) {
        throw new Error('User creation failed. Please try again.');
      }
      
      // Create a profile with onboarding_complete set to false
      let profileCreated = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!profileCreated && retryCount < maxRetries) {
        try {
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
            if (profileError.code === '23505') {
              // Profile already exists (duplicate key error)
              console.warn('Profile already exists, continuing...');
              profileCreated = true;
            } else {
              console.error(`Profile creation attempt ${retryCount + 1} failed:`, profileError);
              await new Promise(resolve => setTimeout(resolve, 1000));
              retryCount++;
            }
          } else {
            profileCreated = true;
          }
        } catch (err) {
          console.error(`Profile creation attempt ${retryCount + 1} failed with exception:`, err);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        }
      }
      
      if (!profileCreated) {
        console.error('Failed to create profile after multiple attempts');
        setAuthError('Account created but profile setup failed. Please contact support.');
      }
      
      // Fetch the newly created profile
      const profile = await fetchUserProfile(data.user.id);
      setUserProfile(profile);
      setOnboardingComplete(false);
      
      setUser(data.user);
      return { 
        user: data.user, 
        profile,
        session: data.session
      };
    } catch (error) {
      // Set auth error for UI display
      setAuthError(error.message || 'Registration failed. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
      
      // The actual user data will be handled in the auth callback
      // We'll check for existing profile or create one there
      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Import the loading component at the top level to avoid React.lazy issues
  const LoadingFallback = () => (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--deep-space-gradient, #1a1a2e)', 
      color: 'var(--emerald-neon, #39FF14)', 
      fontSize: '1.5rem',
      flexDirection: 'column'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '3px solid rgba(57, 255, 20, 0.3)',
        borderRadius: '50%',
        borderTopColor: 'var(--emerald-neon, #39FF14)',
        animation: 'spin 1s ease-in-out infinite',
        marginBottom: '1rem'
      }} />
      <span>Loading authentication...</span>
    </div>
  );

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      onboardingComplete, 
      login, 
      register, 
      logout, 
      loading,
      authError,
      signInWithGoogle 
    }}>
      {/* Always render children, but provide a fallback UI if loading */}
      {loading ? <LoadingFallback /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
