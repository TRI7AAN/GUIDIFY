-- Migration 013: Atomic operations and performance indexes
-- Created: 2026-08-15
-- Purpose: Add PostgreSQL functions for atomic roadmap creation and resume marking,
-- plus critical indexes for production query performance.

-- ============================================================
-- ATOMIC ROADMAP CREATION
-- ============================================================
-- Supersedes any active roadmap and creates a new version in a single transaction.
-- Returns the created roadmap row.
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
BEGIN
    -- Supersede any existing active roadmap for this learner
    UPDATE roadmaps
    SET status = 'superseded',
        updated_at = NOW()
    WHERE learner_id = p_learner_id
      AND status = 'active';

    -- Get next version number
    SELECT COALESCE(MAX(version), 0) + 1
    INTO v_next_version
    FROM roadmaps
    WHERE learner_id = p_learner_id;

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
        p_learner_id,
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

-- ============================================================
-- ATOMIC SET CURRENT RESUME
-- ============================================================
-- Unmarks all current resumes and marks the target resume as current in a single transaction.
-- Returns the updated resume row.
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
BEGIN
    -- Unmark all current resumes for this learner
    UPDATE resumes
    SET is_current = FALSE,
        updated_at = NOW()
    WHERE learner_id = p_learner_id
      AND is_current = TRUE;

    -- Mark the target resume as current
    UPDATE resumes
    SET is_current = TRUE,
        updated_at = NOW()
    WHERE id = p_resume_id
      AND learner_id = p_learner_id
    RETURNING * INTO v_updated_resume;

    IF v_updated_resume IS NULL THEN
        RAISE EXCEPTION 'Resume not found or access denied';
    END IF;

    RETURN v_updated_resume;
END;
$$;

-- ============================================================
-- STREAK CALCULATION (SQL FUNCTION)
-- ============================================================
-- Calculates the current consecutive-day completion streak.
-- More efficient than fetching 90 rows and iterating in Python.
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
BEGIN
    -- Check if today or yesterday has a completed mission
    IF EXISTS (
        SELECT 1 FROM daily_missions
        WHERE learner_id = p_learner_id
          AND status = 'completed'
          AND assigned_date = v_today
    ) THEN
        v_check_date := v_today;
    ELSIF EXISTS (
        SELECT 1 FROM daily_missions
        WHERE learner_id = p_learner_id
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
            WHERE learner_id = p_learner_id
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
-- CRITICAL INDEXES FOR PRODUCTION QUERY PERFORMANCE
-- ============================================================

-- Daily missions: learner + date (for today's mission, streak calculation)
CREATE INDEX IF NOT EXISTS idx_daily_missions_learner_date
    ON daily_missions(learner_id, assigned_date);

-- Daily missions: learner + status (for filtering pending/completed)
CREATE INDEX IF NOT EXISTS idx_daily_missions_learner_status
    ON daily_missions(learner_id, status);

-- Roadmaps: learner + status (for active roadmap lookup)
CREATE INDEX IF NOT EXISTS idx_roadmaps_learner_status
    ON roadmaps(learner_id, status);

-- Event log: learner + event_type (for adaptation triggers, interview history)
CREATE INDEX IF NOT EXISTS idx_event_log_learner_type
    ON event_log(learner_id, event_type);

-- Resumes: learner + is_current (for current resume lookup)
CREATE INDEX IF NOT EXISTS idx_resumes_learner_current
    ON resumes(learner_id, is_current);

-- Interview sessions: learner + created_at (for history)
CREATE INDEX IF NOT EXISTS idx_interview_sessions_learner
    ON interview_sessions(learner_id, created_at);

-- Learner profiles: learner + created_at (for latest profile)
CREATE INDEX IF NOT EXISTS idx_learner_profiles_learner
    ON learner_profiles(learner_id, created_at DESC);

-- Profiles: user_id (legacy table, for any remaining queries)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
    ON profiles(user_id);

-- Grant execute permissions for the RPC functions
GRANT EXECUTE ON FUNCTION create_roadmap_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_resume_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_streak_sql TO authenticated;