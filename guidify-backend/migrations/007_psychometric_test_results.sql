-- Psychometric Test Results Table
-- Stores yes/maybe/no assessment outcomes for authenticated users

CREATE TABLE IF NOT EXISTS psychometric_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL UNIQUE,
    overall_score NUMERIC(5,1) NOT NULL DEFAULT 0,
    confidence NUMERIC(3,2) NOT NULL DEFAULT 0,
    primary_recommendation TEXT NOT NULL,
    secondary_recommendation TEXT NOT NULL,
    category_scores JSONB NOT NULL DEFAULT '{}',
    personality_profile TEXT,
    strengths JSONB DEFAULT '[]',
    growth_areas JSONB DEFAULT '[]',
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_psychometric_results_user_id ON psychometric_results(user_id);
CREATE INDEX IF NOT EXISTS idx_psychometric_results_session_id ON psychometric_results(session_id);

-- Row Level Security
ALTER TABLE psychometric_results ENABLE ROW LEVEL SECURITY;

-- Users can read their own results
CREATE POLICY "Users can view own psychometric results"
    ON psychometric_results FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own results
CREATE POLICY "Users can insert own psychometric results"
    ON psychometric_results FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own results (for re-takes)
CREATE POLICY "Users can update own psychometric results"
    ON psychometric_results FOR UPDATE
    USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_psychometric_results_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_psychometric_results_updated_at
    BEFORE UPDATE ON psychometric_results
    FOR EACH ROW
    EXECUTE FUNCTION update_psychometric_results_timestamp();
