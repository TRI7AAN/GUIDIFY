-- Migration 008: Supabase Security Advisor Fixes
-- Fixes 4 findings from Security Advisor:
--   1. Mutable search_path on all public functions → SET search_path = public, pg_temp
--   2/3. handle_new_user() publicly callable as SECURITY DEFINER → REVOKE EXECUTE
--   4. Leaked Password Protection (dashboard setting, not code)

-- ============================================================
-- Finding 1 & 2/3: Pin search_path on ALL public functions
-- ============================================================
-- Without pg_temp, a user could create a temporary function that
-- shadows a real function during trigger execution.

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.handle_new_user()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_psychometric_profiles_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_resumes_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.ensure_single_current_resume()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_interview_sessions_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_skill_baselines_updated_at()
  SET search_path = public, pg_temp;

-- ============================================================
-- Finding 2/3: Revoke public EXECUTE on handle_new_user()
-- ============================================================
-- The auth.users trigger calls this function in its own context
-- (not via role-based RPC), so revoking these grants only closes
-- the direct /rest/v1/rpc/handle_new_user endpoint.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
