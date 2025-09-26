-- Add updated_at column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
