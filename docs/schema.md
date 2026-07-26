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

## 8. `interview_sessions`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| learner_id | uuid (FK) | |
| track | enum | `technical` \| `hr` |
| transcript | jsonb | ordered Q&A array |
| feedback_report | jsonb, nullable | strengths/gaps/suggested missions |
| readiness_subscore | integer, nullable | |
| status | enum | `in_progress` \| `completed` \| `abandoned` |

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

This schema deliberately favors **append + status flags over destructive update** for `roadmaps` and `resumes`, per the non-destructive principle in `rules.md` §2 and `dataflow.md` §1. This trades a small amount of storage for full auditability and the ability to explain "why did my roadmap change" to the learner — a core trust feature, not just an engineering nicety.
