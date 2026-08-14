-- Migration 014: Job queue for persistent background processing
-- Created: 2026-08-15
-- Purpose: Add a job queue table for persistent background tasks (resume processing, roadmap generation, etc.)

-- ============================================================
-- JOB QUEUE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,           -- 'resume_process', 'roadmap_generate', 'interview_feedback', etc.
    payload JSONB NOT NULL,           -- Job-specific data
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
    learner_id UUID REFERENCES learners(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    roadmap_id UUID REFERENCES roadmaps(id) ON DELETE SET NULL,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient job polling
CREATE INDEX IF NOT EXISTS idx_job_queue_status_learner ON job_queue(status, learner_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_type_status ON job_queue(job_type, status);
CREATE INDEX IF NOT EXISTS idx_job_queue_created_at ON job_queue(created_at);

-- RLS policies
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Learners can only see their own jobs
CREATE POLICY "Users can view own jobs" ON job_queue
    FOR SELECT USING (auth.uid() = learner_id);

-- Service role can manage all jobs (for background workers)
CREATE POLICY "Service role can manage jobs" ON job_queue
    FOR ALL USING (auth.role() = 'service_role');

-- Function to claim next pending job (atomic)
CREATE OR REPLACE FUNCTION claim_next_job(
    p_job_type TEXT,
    p_worker_id TEXT
)
RETURNS job_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_job job_queue;
BEGIN
    -- Atomically claim the oldest pending job of the given type
    UPDATE job_queue
    SET status = 'processing',
        attempts = attempts + 1,
        started_at = NOW(),
        updated_at = NOW()
    WHERE id = (
        SELECT id FROM job_queue
        WHERE job_type = p_job_type
          AND status = 'pending'
          AND attempts < max_attempts
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING * INTO v_job;

    RETURN v_job;
END;
$$;

-- Function to complete a job
CREATE OR REPLACE FUNCTION complete_job(
    p_job_id UUID,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_success THEN
        UPDATE job_queue
        SET status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_job_id;
    ELSE
        UPDATE job_queue
        SET status = CASE
            WHEN attempts >= max_attempts THEN 'failed'
            ELSE 'pending'
        END,
            error_message = p_error_message,
            completed_at = CASE WHEN attempts >= max_attempts THEN NOW() END,
            updated_at = NOW()
        WHERE id = p_job_id;
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION claim_next_job TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION complete_job TO authenticated, service_role;