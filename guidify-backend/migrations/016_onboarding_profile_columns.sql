-- Migration 016: Add onboarding profile columns to learners (F-01)
-- Created: 2026-08-17
-- Purpose: The onboarding flow (OnboardingContext + ProfileForm/CareerGoalsForm/
--          AdaptivePersonalityTest) writes these columns to `learners`. They were
--          missing from migration 001, so every update hit a PostgREST 422 and
--          `onboarding_completed` was never set — users were stuck on /onboarding.
-- Idempotent: safe to re-run.

ALTER TABLE learners
    ADD COLUMN IF NOT EXISTS age INTEGER,
    ADD COLUMN IF NOT EXISTS gender TEXT,
    ADD COLUMN IF NOT EXISTS current_class TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
    -- TEXT (not INT): the frontend sends the string form of learning hours.
    ADD COLUMN IF NOT EXISTS learning_hours TEXT DEFAULT '5',
    ADD COLUMN IF NOT EXISTS category_scores JSONB,
    ADD COLUMN IF NOT EXISTS personality_analysis JSONB,
    ADD COLUMN IF NOT EXISTS career_suggestion TEXT,
    ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
