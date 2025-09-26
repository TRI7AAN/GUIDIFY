-- Fix Security Warnings: Function Search Path Mutable
-- This script explicitly sets the search_path for security-critical functions.

-- 1. Secure handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', 'student')
  ON CONFLICT (user_id) DO UPDATE
  SET email = excluded.email, name = excluded.name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp; -- SECURITY FIX

-- 2. Secure delete_old_recommendations
-- 2. Secure delete_old_recommendations
-- Drop with CASCADE to remove the dependent trigger
DROP FUNCTION IF EXISTS public.delete_old_recommendations() CASCADE;

-- Recreate as a TRIGGER function (standard pattern for cleanup)
CREATE OR REPLACE FUNCTION public.delete_old_recommendations()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.user_recommendations
  WHERE created_at < now() - interval '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp; -- SECURITY FIX

-- Recreate the trigger
CREATE TRIGGER trigger_delete_old_recommendations
  AFTER INSERT ON public.user_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_old_recommendations();
