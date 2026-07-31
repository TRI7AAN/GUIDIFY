-- Migration: Create psychometric_profiles table
-- Per schema.md §8.2: Big Five (IPIP) + RIASEC scores, narrative, consent, retake tracking

CREATE TABLE IF NOT EXISTS psychometric_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    ipip_scores JSONB NOT NULL DEFAULT '{}',
    riasec_scores JSONB NOT NULL DEFAULT '{}',
    grit_score INTEGER,
    learning_style_preference TEXT,
    narrative_summary TEXT,
    pacing_hint TEXT,
    tone_hint TEXT,
    consent_id UUID,
    administered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    instrument_version TEXT NOT NULL DEFAULT 'ipip-1.0_riasec-1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one profile per learner
CREATE UNIQUE INDEX IF NOT EXISTS idx_psychometric_profiles_learner
    ON psychometric_profiles (learner_id);

-- RLS: Learner-scoped access
ALTER TABLE psychometric_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psychometric_profiles_select_own"
    ON psychometric_profiles FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "psychometric_profiles_insert_own"
    ON psychometric_profiles FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "psychometric_profiles_update_own"
    ON psychometric_profiles FOR UPDATE
    USING (auth.uid() = learner_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_psychometric_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_psychometric_profiles_updated_at
    BEFORE UPDATE ON psychometric_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_psychometric_profiles_updated_at();
