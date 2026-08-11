import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabasePublishableKey) {
  console.error('Missing Supabase environment variables. Check your .env file.');
}

// Create Supabase client with enhanced options
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: sessionStorage, // Use sessionStorage to avoid tracking prevention issues with localStorage
    detectSessionInUrl: true,
    // Add clock skew tolerance to prevent future-dated session errors
    allowedClockSkewSeconds: 300
  }
});

// Export default for convenience
export default supabase;


