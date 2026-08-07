-- Migration 010: Psychometric sessions table
-- Tracks yes/maybe/no assessment sessions for the psychometric decision engine.
-- user_id is nullable: anonymous preview sessions are claimable on submit.

CREATE TABLE IF NOT EXISTS psychometric_sessions (
    session_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_psychometric_sessions_user_id ON psychometric_sessions(user_id);

-- RLS: Learner-scoped access (sessions are claimable, so INSERT without user_id
-- is allowed; backend uses the admin client for anonymous preview paths anyway)
ALTER TABLE psychometric_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psychometric_sessions_select_own"
    ON psychometric_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "psychometric_sessions_insert_own"
    ON psychometric_sessions FOR INSERT
    WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "psychometric_sessions_update_own"
    ON psychometric_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_psychometric_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE TRIGGER trigger_psychometric_sessions_updated_at
    BEFORE UPDATE ON psychometric_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_psychometric_sessions_updated_at();
