-- MASTER MIGRATION SCRIPT
-- Purpose: Permanently fix 'profiles' table schema and refresh PostgREST cache.
-- Run this in Supabase SQL Editor.

BEGIN;

-- 1. Ensure the table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add ALL required columns (Idempotent: Only adds if missing)
-- We use a DO block to safely add columns without errors if they exist.
DO $$
BEGIN
  -- Basic Identity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'name') THEN
    ALTER TABLE public.profiles ADD COLUMN name text;
  END IF;

  -- Role (with default)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'student';
  END IF;

  -- Onboarding Status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_complete') THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_complete boolean DEFAULT false;
  END IF;

  -- Profile Details (The ones causing errors)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'age') THEN
    ALTER TABLE public.profiles ADD COLUMN age integer; -- Changed to integer for better data type
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
    ALTER TABLE public.profiles ADD COLUMN gender text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'current_class') THEN
    ALTER TABLE public.profiles ADD COLUMN current_class text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE public.profiles ADD COLUMN location text;
  END IF;

  -- AI & Quiz Data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'category_scores') THEN
    ALTER TABLE public.profiles ADD COLUMN category_scores jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'career_suggestion') THEN
    ALTER TABLE public.profiles ADD COLUMN career_suggestion text;
  END IF;
END $$;

-- 3. Enforce Constraints and Defaults
-- Ensure role is 'student' if null
UPDATE public.profiles SET role = 'student' WHERE role IS NULL;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'student';

-- 4. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies to ensure they are correct
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING ( auth.uid() = user_id );

-- 5. Auto-Create Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', 'student')
  ON CONFLICT (user_id) DO UPDATE
  SET email = excluded.email, name = excluded.name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;

-- 6. CRITICAL: Refresh Schema Cache
-- This must be outside the transaction block in some environments, 
-- but for Supabase SQL Editor, it's fine.
NOTIFY pgrst, 'reload config';
