-- Migration: Create consents table
-- Per schema.md §8.2 / rules.md §9.3: dedicated, separate, revocable consent
-- records (psychometric, delivery analytics, etc.).
-- psychometric_profiles.consent_id now FKs into this table.

CREATE TABLE IF NOT EXISTS consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT TRUE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    source TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consents_learner ON consents (learner_id);
CREATE INDEX IF NOT EXISTS idx_consents_learner_type ON consents (learner_id, consent_type);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consents_select_own"
    ON consents FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "consents_insert_own"
    ON consents FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "consents_update_own"
    ON consents FOR UPDATE
    USING (auth.uid() = learner_id);

-- FK from psychometric_profiles (schema.md §8.2). Safe: table is empty.
ALTER TABLE psychometric_profiles
    ADD CONSTRAINT fk_psychometric_profiles_consent
    FOREIGN KEY (consent_id) REFERENCES consents(id) ON DELETE SET NULL;
