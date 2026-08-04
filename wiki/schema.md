# GUIDIFY — Database Schema

**Version:** 1.0
**Database:** Supabase PostgreSQL
**Companion to:** `techspec.md`, `dataflow.md`, `api.md`

All tables use RLS scoped to `auth.uid()` unless marked shared/reference data. All primary keys are UUIDs unless noted. Timestamps (`created_at`, `updated_at`) are omitted from column lists below for brevity but present on every table.

---

## 1. `learners`
Core identity/profile record, one per Supabase Auth user.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | = auth.uid() |
| email | text | from Supabase Auth |
| full_name | text | |
| segment | enum | `school` \| `college` \| `graduate` \| `professional` |
| target_role | text, nullable | current stated career goal |
| onboarding_completed | boolean | |
| consent_data_processing | boolean | DPDP consent flag, see `rules.md` §7 |
| consent_ai_training | boolean, default false | must be explicit opt-in |

---

## 2. `learner_profiles`
Structured, assembled profile — the input to roadmap generation. Versioned lightly (not full history, just current + last).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| learner_id | uuid (FK → learners) | |
| questionnaire_data | jsonb | raw structured answers |
| resume_data | jsonb, nullable | latest parsed resume (see `resumes` for history) |
| skills | text[] | derived/aggregated |
| interests | text[] | from questionnaire |
| strengths | text[] | AI-derived |
| weaknesses | text[] | AI-derived |
| last_analyzed_at | timestamptz | last Skill Gap Analysis run |

---

## 3. `resumes`
Full upload history (never overwritten — each upload is a new row).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| learner_id | uuid (FK) | |
| storage_path | text | Supabase Storage private bucket path |
| parsed_data | jsonb | output of `resume.parse` |
| score | integer, nullable | output of `resume.score` |
| gap_analysis | jsonb, nullable | |
| is_current | boolean | only one true per learner |

---

## 4. `roadmaps`
Versioned, never deleted.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| learner_id | uuid (FK) | |
| version | integer | increments per learner |
| status | enum | `active` \| `superseded` |
| trigger_reason | text, nullable | which `rules.md` trigger caused this version (null for v1) |
| trigger_event_id | uuid, nullable (FK → event_log) | |
| generated_from_profile_snapshot | jsonb | profile state at generation time (auditability) |

---

## 5. `roadmap_phases`
Belongs to a roadmap version.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| roadmap_id | uuid (FK → roadmaps) | |
| order_index | integer | Phase 1, 2, 3... |
| name | text | e.g. "Foundations", "Company Ready" |
| objectives | jsonb | |
| target_skills | text[] | |
| projects | jsonb | |
| resources | jsonb | |
| milestones | jsonb | |
| status | enum | `locked` \| `current` \| `complete` |

---

## 6. `missions`
Daily missions, generated one at a time, tied to a phase.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| learner_id | uuid (FK) | |
| phase_id | uuid (FK → roadmap_phases) | |
| title | text | |
| objective | text | |
| estimated_minutes | integer | |
| linked_assessment | jsonb, nullable | |
| status | enum | `pending` \| `completed` \| `failed` \| `skipped` \| `too_hard` |
| assigned_date | date | |
| completed_at | timestamptz, nullable | |

---

## 7. `event_log`
Append-only. Source of truth for adaptation (see `dataflow.md` §2).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| learner_id | uuid (FK) | |
| event_type | enum | see `dataflow.md` §2 for full list |
| payload | jsonb | event-specific data |
| related_mission_id | uuid, nullable (FK) | |
| related_roadmap_id | uuid, nullable (FK) | |

---

## 8. `interview_sessions` (applied as `006_interviews.sql`)
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK) | |
| `learner_id` | `uuid` (FK → learners) | |
| `track` | `text` | `technical` \| `hr` (CHECK constraint) |
| `transcript` | `jsonb` | ordered Q&A array: `[{role, content, question_type}]` |
| `feedback_report` | `jsonb`, nullable | strengths/gaps/communication_notes/readiness_subscore/suggested_missions |
| `readiness_subscore` | `integer`, nullable | 0-100, guidance signal per rules.md §6 |
| `status` | `text` | `in_progress` \| `completed` \| `abandoned` (CHECK constraint) |
| `question_count` | `integer` | tracks questions asked, caps at MAX_QUESTIONS_PER_SESSION (10) |
| `camera_enabled` | `boolean`, default `false` | set from consent flow; determines whether delivery metrics are expected |
| `delivery_metrics` | `jsonb`, nullable | client-submitted delivery analytics payload (eye_contact_pct, posture_score, etc.) — Phase 4.5 |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | auto-updated via trigger |

**RLS:** Learner-scoped (`auth.uid() = learner_id`) — SELECT, INSERT, UPDATE policies.
**Indexes:** `idx_interview_sessions_learner` on `(learner_id, created_at DESC)`.

### Phase 4.5 migration adds:
- `camera_enabled` column (boolean, default false)
- `delivery_metrics` column (jsonb, nullable)
- RLS policy allowing the session owner to UPDATE only `delivery_metrics` and `camera_enabled` fields

---

## 8.1 `delivery_trends` — deferred (compute-on-read preferred for MVP)

Trend data for the longitudinal delivery dashboard (`design.md` §2.8) is **computed on read**, not materialized into a separate table. The query reads `delivery_metrics` from all completed `interview_sessions` for the learner, ordered by `created_at`, and returns the time-series directly.

**Rationale:** A separate `delivery_trends` table would need to be updated on every delivery-metrics submission and would duplicate data already present in `interview_sessions.delivery_metrics`. At MVP scale (few sessions per learner), compute-on-read is simpler, always consistent, and avoids a migration+trigger for a write-path that adds no value over a read-path query. If trend-query performance becomes a concern post-MVP (e.g., hundreds of sessions), a materialized view or cache layer can be introduced — but premature materialization adds migration complexity and consistency risk for no measurable gain at current scale.

If the materialized approach is adopted later, the table would be:

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| learner_id | uuid (FK) | |
| metric_name | text | e.g. `eye_contact_pct` |
| session_id | uuid (FK → interview_sessions) | |
| value | numeric | |
| recorded_at | timestamptz | = session completion time |

---

## 8.2 `psychometric_profiles` — Psychometric assessment results

One row per learner (latest assessment). Administered once during/after onboarding, with a manual retake option gated to a minimum 6-month interval.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| learner_id | uuid (FK → learners) | unique — one profile per learner, overwritten on retake |
| ipip_scores | jsonb | Big Five traits: `{"openness": 0-100, "conscientiousness": 0-100, "extraversion": 0-100, "agreeableness": 0-100, "neuroticism": 0-100}` |
| riasec_scores | jsonb | Holland Codes: `{"realistic": 0-100, "investigative": 0-100, "artistic": 0-100, "social": 0-100, "enterprising": 0-100, "conventional": 0-100}` |
| grit_score | integer, nullable | Optional follow-through/conscientiousness scale (0-100). Nullable — instrument is a "nice to have" for v1. |
| learning_style_preference | text, nullable | Soft content-format preference only (e.g., "visual", "reading"). **Not a validated instrument** — never framed as a learning-style diagnosis. |
| narrative_summary | text, nullable | Output of `psychometrics.narrate` — interpretive, career-relevant summary. |
| pacing_hint | text, nullable | Output of `psychometrics.narrate`: `"incremental"` \| `"accelerated"` \| `"mixed"`. Used by `roadmap.generate`. |
| tone_hint | text, nullable | Output of `psychometrics.narrate` — tone guidance for roadmap/mission copy. |
| consent_id | uuid (FK → consents, nullable) | Dedicated consent record. Separate, explicit, revocable consent — same pattern as Delivery Analytics' `delivery_consent_id`. |
| administered_at | timestamptz | When assessment was completed. Used to enforce 6-month retake cooldown. |
| instrument_version | text | Version of the scoring config used (e.g., "ipip-v1", "riasec-v1"). Auditability for instrument revisions. |

**RLS:** Learner-scoped (`auth.uid() = learner_id`) — SELECT, INSERT, UPDATE policies.
**Indexes:** `idx_psychometric_profiles_learner` on `(learner_id)` (unique).

---

## 9. `skill_baselines` (reference/shared data, not RLS-scoped per user)
Curated target-role/company skill requirements — powers Skill Gap Analysis and company-specific tracks (P2).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| role_or_company | text | e.g. "Software Engineer", "Google - SDE" |
| required_skills | text[] | |
| common_questions | jsonb, nullable | for company-specific interview prep |
| source | text | curation source/notes |

---

## 10. Indexes & Constraints (key ones)

- `roadmaps`: unique (`learner_id`, `version`); partial unique index enforcing only one `status = 'active'` roadmap per learner.
- `resumes`: partial unique index enforcing only one `is_current = true` per learner.
- `missions`: index on (`learner_id`, `assigned_date`) for fast "today's mission" lookup.
- `event_log`: index on (`learner_id`, `event_type`, `created_at`) for trigger-evaluation queries (`rules.md`).

---

## 11. Notes on Versioning Strategy

This schema deliberately favors **append + status flags over destructive update** for `roadmaps`, `resumes`, and `interview_sessions`, per the non-destructive principle in `rules.md` §2 and `dataflow.md` §1. This trades a small amount of storage for full auditability and the ability to explain "why did my roadmap change" to the learner — a core trust feature, not just an engineering nicety.

**Applied migrations:** 001 through 006 (all live on Supabase project `ksiiuhftnmjsgwrizpno`).
**Storage:** `resumes` bucket (private, learner-isolated RLS via `string_to_array(name, '/')[2]`).
