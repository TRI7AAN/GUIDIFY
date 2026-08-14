-- Migration 015: Fix profiles RLS policy (SEC-03)
-- Created: 2026-08-15
-- Purpose: Fix the profiles table SELECT policy to prevent PII exposure.
-- The current policy `USING(true)` allows all authenticated users to read all profiles.
-- This migration changes it to `USING(auth.uid() = user_id)` so users can only read their own profile.

-- ============================================================
-- FIX PROFILES RLS POLICY
-- ============================================================

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

-- Create a secure policy: users can only select their own profile
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Ensure other policies are also secure
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Note: The profiles table is a legacy table. The new schema uses learners + learner_profiles
-- which should already have proper RLS policies. This migration secures the legacy table
-- for any remaining code that still uses it.