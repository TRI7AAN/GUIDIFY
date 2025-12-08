-- Fix Duplicate RLS Policies on 'profiles' table
-- The user reported multiple permissive policies for SELECT.
-- We will consolidate to a single, secure policy: "Users can view own profile".

-- 1. Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- 2. Drop the duplicate restrictive policy (to ensure we start clean)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- 3. Re-create the secure, optimized policy
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING ((select auth.uid()) = user_id);

-- 4. Ensure no other duplicates exist (cleanup)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Re-apply the standard insert/update policies (optimized)
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING ((select auth.uid()) = user_id);
