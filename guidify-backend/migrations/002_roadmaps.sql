-- GUIDIFY Phase 2 Migration: Roadmaps Table
-- Per schema.md §3: roadmaps table with versioning and phase JSON
-- Run after 001_phase0_learners.sql

CREATE TABLE IF NOT EXISTS roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded')),
    trigger_reason TEXT, -- e.g., "onboarding", "target_role_change", "mission_pattern"
    total_phases INT NOT NULL DEFAULT 0,
    estimated_weeks INT NOT NULL DEFAULT 0,
    current_phase_number INT NOT NULL DEFAULT 1,
    progress_pct INT NOT NULL DEFAULT 0,
    phases JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE TRIGGER update_roadmaps_updated_at
    BEFORE UPDATE ON roadmaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_roadmaps_learner_status ON roadmaps(learner_id, status);
CREATE INDEX IF NOT EXISTS idx_roadmaps_learner_version ON roadmaps(learner_id, version DESC);

-- Unique constraint: only one active roadmap per learner
-- (This is enforced in application code via create_roadmap, but the index helps)

-- RLS: roadmaps scoped by learner_id = auth.uid()
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmaps_select_own" ON roadmaps
    FOR SELECT USING (auth.uid() = learner_id);

CREATE POLICY "roadmaps_insert_own" ON roadmaps
    FOR INSERT WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "roadmaps_update_own" ON roadmaps
    FOR UPDATE USING (auth.uid() = learner_id);
