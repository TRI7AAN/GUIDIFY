-- FORCE FIX COLUMNS
-- Run this script to immediately add the missing columns.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_class text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category_scores jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS career_suggestion text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'student';

-- Force Supabase to refresh its schema cache
NOTIFY pgrst, 'reload config';
