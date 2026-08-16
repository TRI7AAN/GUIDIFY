-- Migration 018: Security hardening (F-03, F-04, F-17, F-20)
-- Created: 2026-08-17
-- Purpose:
--   F-03: Close learner-IDOR in SECURITY DEFINER RPCs — derive learner from
--         auth.uid() so a caller cannot operate on another user's rows.
--   F-04: Add job_queue INSERT policy (uploads previously 403'd and fell back to
--         blocking inline processing); restrict claim/complete RPCs to service_role.
--   F-17: Enforce one mission per learner per day (unique constraint).
--   F-20: Promote quiz_responses table into the tracked migration set.

-- ============================================================
-- F-03: RPC ownership enforcement
-- ============================================================
-- All three functions bind the effective learner to auth.uid() when the caller
-- is an authenticated user. Only service-role callers (background worker) may
-- pass an explicit learner_id.

CREATE OR REPLACE FUNCTION create_roadmap_atomic(
    p_learner_id UUID,
    p_title TEXT,
    p_total_phases INT,
    p_estimated_weeks INT,
    p_phases JSONB,
    p_trigger_reason TEXT DEFAULT 'manual',
    p_current_phase_number INT DEFAULT 1,
    p_progress_pct INT DEFAULT 0
)
RETURNS roadmaps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_version INT;
    v_new_roadmap roadmaps;
    v_learner_id UUID := COALESCE(auth.uid(), p_learner_id);
BEGIN
    IF v_learner_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Supersede any existing active roadmap for this learner
    UPDATE roadmaps
    SET status = 'superseded',
        updated_at = NOW()
    WHERE learner_id = v_learner_id
      AND status = 'active';

    -- Get next version number
    SELECT COALESCE(MAX(version), 0) + 1
    INTO v_next_version
    FROM roadmaps
    WHERE learner_id = v_learner_id;

    -- Insert new roadmap
    INSERT INTO roadmaps (
        learner_id,
        title,
        version,
        status,
        total_phases,
        estimated_weeks,
        phases,
        trigger_reason,
        current_phase_number,
        progress_pct
    ) VALUES (
        v_learner_id,
        p_title,
        v_next_version,
        'active',
        p_total_phases,
        p_estimated_weeks,
        p_phases,
        p_trigger_reason,
        p_current_phase_number,
        p_progress_pct
    )
    RETURNING * INTO v_new_roadmap;

    RETURN v_new_roadmap;
END;
$$;

CREATE OR REPLACE FUNCTION set_current_resume_atomic(
    p_resume_id UUID,
    p_learner_id UUID
)
RETURNS resumes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_resume resumes;
    v_learner_id UUID := COALESCE(auth.uid(), p_learner_id);
BEGIN
    IF v_learner_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Unmark all current resumes for this learner
    UPDATE resumes
    SET is_current = FALSE,
        updated_at = NOW()
    WHERE learner_id = v_learner_id
      AND is_current = TRUE;

    -- Mark the target resume as current
    UPDATE resumes
    SET is_current = TRUE,
        updated_at = NOW()
    WHERE id = p_resume_id
      AND learner_id = v_learner_id
    RETURNING * INTO v_updated_resume;

    IF v_updated_resume IS NULL THEN
        RAISE EXCEPTION 'Resume not found or access denied';
    END IF;

    RETURN v_updated_resume;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_streak_sql(p_learner_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_streak INT := 0;
    v_check_date DATE;
    v_today DATE := CURRENT_DATE;
    v_learner_id UUID := COALESCE(auth.uid(), p_learner_id);
BEGIN
    IF v_learner_id IS NULL THEN
        RETURN 0;
    END IF;

    -- Check if today or yesterday has a completed mission
    IF EXISTS (
        SELECT 1 FROM daily_missions
        WHERE learner_id = v_learner_id
          AND status = 'completed'
          AND assigned_date = v_today
    ) THEN
        v_check_date := v_today;
    ELSIF EXISTS (
        SELECT 1 FROM daily_missions
        WHERE learner_id = v_learner_id
          AND status = 'completed'
          AND assigned_date = v_today - 1
    ) THEN
        v_check_date := v_today - 1;
    ELSE
        RETURN 0;
    END IF;

    -- Count consecutive days backwards
    LOOP
        IF EXISTS (
            SELECT 1 FROM daily_missions
            WHERE learner_id = v_learner_id
              AND status = 'completed'
              AND assigned_date = v_check_date
        ) THEN
            v_streak := v_streak + 1;
            v_check_date := v_check_date - 1;
        ELSE
            EXIT;
        END IF;
    END LOOP;

    RETURN v_streak;
END;
$$;

-- ============================================================
-- F-04: Job queue — INSERT policy + service-role-only claim RPCs
-- ============================================================

CREATE POLICY "Users can insert own jobs" ON job_queue
    FOR INSERT WITH CHECK (auth.uid() = learner_id);

-- claim/complete RPCs manipulate rows for ANY learner and therefore must be
-- reserved for the service-role background worker, not authenticated users.
REVOKE EXECUTE ON FUNCTION claim_next_job(TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION complete_job(UUID, BOOLEAN, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION claim_next_job(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION complete_job(UUID, BOOLEAN, TEXT) TO service_role;

-- ============================================================
-- F-17: One daily mission per learner per day
-- ============================================================
DO $$
BEGIN
    -- De-duplicate any existing rows (keep the oldest per learner/date).
    DELETE FROM daily_missions a
    USING daily_missions b
    WHERE a.id > b.id
      AND a.learner_id = b.learner_id
      AND a.assigned_date = b.assigned_date;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_daily_missions_learner_date'
    ) THEN
        ALTER TABLE daily_missions
            ADD CONSTRAINT uq_daily_missions_learner_date
            UNIQUE (learner_id, assigned_date);
    END IF;
END $$;

-- ============================================================
-- F-20: quiz_responses (onboarding quiz answers)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id text NOT NULL,
  answer_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quiz responses" ON quiz_responses;
DROP POLICY IF EXISTS "Users can insert their own quiz responses" ON quiz_responses;
DROP POLICY IF EXISTS "Users can update their own quiz responses" ON quiz_responses;

CREATE POLICY "Users can view their own quiz responses"
  ON quiz_responses FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert their own quiz responses"
  ON quiz_responses FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update their own quiz responses"
  ON quiz_responses FOR UPDATE
  USING ( auth.uid() = user_id );

NOTIFY pgrst, 'reload config';
