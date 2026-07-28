-- GUIDIFY Migration 004: Resumes Table
-- schema.md §3: Resume upload history, never overwritten
-- Each upload is a new row; is_current flag tracks the active resume

CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type TEXT,
    parsed_data JSONB,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    gap_analysis JSONB,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast learner lookups
CREATE INDEX IF NOT EXISTS idx_resumes_learner_id ON resumes(learner_id);
CREATE INDEX IF NOT EXISTS idx_resumes_is_current ON resumes(learner_id, is_current) WHERE is_current = true;

-- RLS policies — learner-scoped access
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view their own resumes"
    ON resumes FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can insert their own resumes"
    ON resumes FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can update their own resumes"
    ON resumes FOR UPDATE
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can delete their own resumes"
    ON resumes FOR DELETE
    USING (auth.uid() = learner_id);

-- Trigger to auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_resumes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_resumes_updated_at
    BEFORE UPDATE ON resumes
    FOR EACH ROW
    EXECUTE FUNCTION update_resumes_updated_at();

-- Function to ensure only one is_current per learner
CREATE OR REPLACE FUNCTION ensure_single_current_resume()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = true THEN
        UPDATE resumes SET is_current = false
        WHERE learner_id = NEW.learner_id AND id != NEW.id AND is_current = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_current_resume
    BEFORE INSERT OR UPDATE ON resumes
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_current_resume();
