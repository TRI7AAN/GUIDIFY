-- GUIDIFY Phase 0 Migration: Core Tables
-- Per schema.md §1-2: learners and learner_profiles
-- Run against your Supabase project SQL editor
--
-- WARNING: If you have existing tables from the prior GUIDIFY version (profiles, user_documents, etc.),
-- this migration creates NEW tables alongside them. You may want to drop legacy tables separately.

-- ============================================================
-- 1. learners — Core identity/profile record (schema.md §1)
-- ============================================================
CREATE TABLE IF NOT EXISTS learners (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    segment TEXT CHECK (segment IN ('school', 'college', 'graduate', 'professional')),
    target_role TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    consent_data_processing BOOLEAN DEFAULT FALSE,
    consent_ai_training BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_learners_updated_at
    BEFORE UPDATE ON learners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: learners can only access their own data
ALTER TABLE learners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learners_select_own" ON learners
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "learners_insert_own" ON learners
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "learners_update_own" ON learners
    FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 2. learner_profiles — Assembled profile (schema.md §2)
-- ============================================================
CREATE TABLE IF NOT EXISTS learner_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    questionnaire_data JSONB,
    resume_data JSONB,
    skills TEXT[] DEFAULT '{}',
    interests TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    weaknesses TEXT[] DEFAULT '{}',
    last_analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_learner_profiles_updated_at
    BEFORE UPDATE ON learner_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: profiles scoped by learner_id = auth.uid()
ALTER TABLE learner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON learner_profiles
    FOR SELECT USING (auth.uid() = learner_id);

CREATE POLICY "profiles_insert_own" ON learner_profiles
    FOR INSERT WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "profiles_update_own" ON learner_profiles
    FOR UPDATE USING (auth.uid() = learner_id);

-- ============================================================
-- 3. Auto-create learner record on signup
-- ============================================================
-- When a user signs up via Supabase Auth, automatically create a
-- corresponding learners row so the profile/onboarding flow has
-- a record to work with.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.learners (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any (from legacy schema)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
