-- GUIDIFY Migration 006: Interview Sessions
-- schema.md §8: interview_sessions for mock interview bot

CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    track TEXT NOT NULL CHECK (track IN ('technical', 'hr')),
    transcript JSONB NOT NULL DEFAULT '[]',
    feedback_report JSONB,
    readiness_subscore INTEGER CHECK (readiness_subscore >= 0 AND readiness_subscore <= 100),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    question_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_learner ON interview_sessions(learner_id, created_at DESC);

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view their own interview sessions"
    ON interview_sessions FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can insert their own interview sessions"
    ON interview_sessions FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can update their own interview sessions"
    ON interview_sessions FOR UPDATE
    USING (auth.uid() = learner_id);

CREATE OR REPLACE FUNCTION update_interview_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_interview_sessions_updated_at
    BEFORE UPDATE ON interview_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_interview_sessions_updated_at();
