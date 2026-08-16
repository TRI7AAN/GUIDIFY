-- Migration 017: Interview session delivery analytics columns (F-05)
-- Created: 2026-08-17
-- Purpose: interview_sessions was missing delivery_consent_id / camera_enabled /
--          delivery_metrics, so submit_delivery_metrics always returned 403 and
--          GET /dashboard/delivery-trends always returned empty. schema.md §8.1
--          documents these as part of "Phase 4.5" but no migration added them.

ALTER TABLE interview_sessions
    ADD COLUMN IF NOT EXISTS delivery_consent_id UUID REFERENCES consents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS camera_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS delivery_metrics JSONB;
