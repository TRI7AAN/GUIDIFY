-- Add onboarding_step column to profiles table

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
