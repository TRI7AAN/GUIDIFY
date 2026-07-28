-- GUIDIFY Migration 005: Event Log & Skill Baselines
-- schema.md §7: Append-only event_log for adaptation triggers
-- schema.md §9: skill_baselines reference table for gap analysis

-- Event Log: Source of truth for adaptation (dataflow.md §2)
CREATE TABLE IF NOT EXISTS event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'mission_completed',
        'mission_failed',
        'mission_skipped',
        'mission_too_hard',
        'roadmap_generated',
        'roadmap_regenerated',
        'target_role_changed',
        'resume_uploaded',
        'certificate_uploaded',
        'profile_updated',
        'interview_completed',
        'skill_gap_analysis_run'
    )),
    payload JSONB DEFAULT '{}',
    related_mission_id UUID,
    related_roadmap_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for trigger-evaluation queries (rules.md §2)
CREATE INDEX IF NOT EXISTS idx_event_log_learner_id ON event_log(learner_id);
CREATE INDEX IF NOT EXISTS idx_event_log_learner_type ON event_log(learner_id, event_type);
CREATE INDEX IF NOT EXISTS idx_event_log_learner_created ON event_log(learner_id, created_at DESC);

-- RLS policies — learner-scoped access
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view their own events"
    ON event_log FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "System can insert events for learners"
    ON event_log FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

-- Skill Baselines: Reference data for gap analysis (schema.md §9)
-- Not RLS-scoped per user — shared reference data
CREATE TABLE IF NOT EXISTS skill_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_or_company TEXT NOT NULL,
    required_skills TEXT[] NOT NULL DEFAULT '{}',
    common_questions JSONB,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast role lookups
CREATE INDEX IF NOT EXISTS idx_skill_baselines_role ON skill_baselines(role_or_company);

-- Seed some common role baselines
INSERT INTO skill_baselines (role_or_company, required_skills, source) VALUES
('Software Engineer', ARRAY['Python', 'JavaScript', 'Git', 'REST APIs', 'SQL', 'Data Structures', 'Algorithms', 'Testing', 'CI/CD', 'Docker'], 'Industry standard'),
('Frontend Developer', ARRAY['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Git', 'REST APIs', 'Testing', 'Performance Optimization', 'Accessibility'], 'Industry standard'),
('Backend Developer', ARRAY['Python', 'Java', 'SQL', 'REST APIs', 'Git', 'Docker', 'Testing', 'CI/CD', 'Database Design', 'Security'], 'Industry standard'),
('Data Scientist', ARRAY['Python', 'R', 'SQL', 'Machine Learning', 'Statistics', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'Data Visualization'], 'Industry standard'),
('DevOps Engineer', ARRAY['Linux', 'Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Terraform', 'Ansible', 'Monitoring', 'Networking', 'Security'], 'Industry standard')
ON CONFLICT (role_or_company) DO NOTHING;

-- Trigger to auto-update updated_at on skill_baselines
CREATE OR REPLACE FUNCTION update_skill_baselines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_skill_baselines_updated_at
    BEFORE UPDATE ON skill_baselines
    FOR EACH ROW
    EXECUTE FUNCTION update_skill_baselines_updated_at();
