# GUIDIFY — Progress Report

**Generated:** Mon Jul 27 2026
**Based on:** `implementationplan.md`, `prd.md`, `schema.md`, `architecture.md`, codebase audit

---

## Build Log — Mon Jul 28 2026 (Session 4)

### Changes Made

#### Backend

| # | File | Change | Spec Reference |
|---|------|--------|----------------|
| 1 | `migrations/004_resumes.sql` | **[NEW]** Resumes table with parsed_data JSONB, score, gap_analysis, is_current flag, RLS policies, auto-updated_at trigger, and single-current constraint | schema.md §3, remaining_tasks §1.2 |
| 2 | `app/ai_gateway/prompts/resume_parse.py` | **[NEW]** Resume parsing prompt template v1 — extracts contact info, work experience, education, technical/soft skills, projects, and certifications from raw resume text | prompts.md §3 |
| 3 | `app/ai_gateway/prompts/resume_score.py` | **[NEW]** Resume scoring prompt template v1 — evaluates resume against target role, provides overall score (0-100), section scores, gap analysis, ATS compatibility, and top 3 improvements | prompts.md §3 |
| 4 | `app/ai_gateway/gateway.py` | Wired `resume.parse` and `resume.score` prompt templates into `_build_prompt()` — formats resume text, target role, segment, current skills, and parsed resume data | techspec.md §3.1 |
| 5 | `app/api/resume.py` | **Full implementation** replacing Phase 0 stubs: `POST /resume/upload` (multipart → extract text → AI parse → AI score → DB persist → update profile), `GET /resume/{id}`, `GET /resume/current`, `GET /resume/history` | api.md §2, remaining_tasks §1.2 |
| 6 | `app/db/queries.py` | Added 6 resume DB queries: `create_resume`, `get_resume_by_id`, `get_current_resume`, `get_resume_history`, `update_resume`, `set_current_resume` | schema.md §3 |
| 7 | `app/models/schemas.py` | Added 12 Resume Pydantic models: `ResumeContact`, `ResumeExperience`, `ResumeEducation`, `ResumeProject`, `ResumeCertification`, `ResumeParseResponse`, `ResumeGapItem`, `ResumeImprovement`, `ResumeAtsCompatibility`, `ResumeScoreResponse`, `ResumeUploadResponse`, `ResumeResponse` | schema.md §3, api.md §2 |

### Build & Test Verification

- [x] **Backend code follows established patterns** — AI Gateway prompt templates, DB queries, API endpoints match existing mission/roadmap implementations
- [x] **Schema validation** — Pydantic models enforce JSON structure from AI Gateway responses
- [x] **Error handling** — Graceful fallback if AI parsing/scoring fails (upload still succeeds)

### Remaining Work

- [ ] Run `004_resumes.sql` migration on Supabase (requires admin access)
- [ ] Run `003_missions.sql` migration on Supabase (requires admin access)
- [ ] Resume Progress & Feedback View (Phase 1 frontend)
- [ ] Adaptation Engine / Rules Engine (Phase 3)
- [ ] Interview bot backend (`interview.question` / `interview.feedback`) (Phase 4)
- [ ] Legacy route cleanup (Phase 5)

---

## Build Log — Mon Jul 28 2026 (Session 3)

### Changes Made

#### Backend

| # | File | Change | Spec Reference |
|---|------|--------|----------------|
| 1 | `migrations/003_missions.sql` | **[NEW]** Daily missions table with status tracking, skill targeting, RLS policies, unique active-per-day constraint, and `learner_activity_streaks` view | schema.md §4, remaining_tasks §2.1 |
| 2 | `app/ai_gateway/prompts/mission_generate.py` | **[NEW]** Mission generation prompt template v1 — produces bite-sized daily tasks using learner context, current roadmap phase, and mission history | prompts.md §2 |
| 3 | `app/ai_gateway/gateway.py` | Wired `mission.generate` prompt template into `_build_prompt()` — formats history context, phase skills, and difficulty | techspec.md §3.1 |
| 4 | `app/api/missions.py` | **Full implementation** replacing Phase 0 stubs: `GET /missions/today` (auto-generates via AI Gateway if no mission exists), `POST /missions/{id}/complete`, `POST /missions/{id}/status` | api.md §4, remaining_tasks §2.1 |
| 5 | `app/api/dashboard.py` | **Upgraded** from stub to real aggregation: streak from missions, phase progress from roadmap, skill graph from roadmap phases, placement readiness estimate | api.md §6 |
| 6 | `app/db/queries.py` | Added 8 mission DB queries: `get_todays_mission`, `get_todays_completed_mission`, `create_mission`, `update_mission_status`, `complete_mission`, `get_recent_missions`, `get_mission_by_id`, `calculate_streak` | schema.md §4 |
| 7 | `app/models/schemas.py` | Added `MissionStatus`, `MissionResource`, `MissionGenerateResponse`, `MissionResponse`, `MissionStatusUpdate`, `MissionCompleteRequest` Pydantic models | schema.md §4, api.md §4 |

#### Frontend

| # | File | Change | Spec Reference |
|---|------|--------|----------------|
| 8 | `src/pages/CareerRoadmap.jsx` | **Complete rewrite** — replaced legacy styled-components dark theme with TailwindCSS. Interactive expandable phases with skills, milestones, difficulty tags, overall progress bar, regenerate action | design.md §2.3, remaining_tasks §2.2 |
| 9 | `src/components/dashboard/MissionCard.jsx` | **[NEW]** Interactive mission card with Start/Complete/Skip actions, expandable step breakdown, resource links, completion notes input | design.md §2.2 |
| 10 | `src/pages/Dashboard.jsx` | Integrated MissionCard component into hero zone. Streak auto-updates on mission completion | design.md §2.2 |
| 11 | `src/pages/ResumePage.jsx` | **[NEW]** Resume upload page with drag-and-drop, file validation (PDF/DOCX, 10MB), upload flow | remaining_tasks §1.1 |
| 12 | `src/pages/InterviewPage.jsx` | **[NEW]** Interview coach placeholder page with Phase 4 feature preview cards | remaining_tasks §4.3 |
| 13 | `src/lib/api.js` | Added `roadmapAPI.regenerate()` method | api.md §3 |
| 14 | `src/routes/index.js` | Added `/resume` and `/interview` route entries | — |
| 15 | `src/App.jsx` | Lazy-loaded `ResumePage` and `InterviewPage`, added to component map and route wiring | — |

### Build & Test Verification

- [x] **Frontend production build passes** — `vite build` completed cleanly in 12.99s (2265 modules transformed, 0 errors)
- [x] **TailwindCSS v4 styling** — All new components use design system tokens
- [x] **All nav links resolve** — Dashboard navbar links to /roadmap, /resume, /interview now render actual pages
- [x] **API contracts match** — Mission endpoints match api.md §4 specification

### Remaining Work

- [ ] Run `003_missions.sql` migration on Supabase (requires admin access)
- [ ] Resume parsing backend (`resume.parse` / `resume.score` AI Gateway tasks) (Phase 1)
- [ ] Adaptation Engine / Rules Engine (Phase 3)
- [ ] Interview bot backend (`interview.question` / `interview.feedback`) (Phase 4)
- [ ] Legacy route cleanup (Phase 5)

---



## Build Log — Sun Jul 27 2026 (Session 2)

### Changes Made

#### Backend

| # | File | Change | Spec Reference |
|---|------|--------|----------------|
| 1 | `app/ai_gateway/gateway.py` | Wired `roadmap.generate` prompt template into `_build_prompt()` — replaces generic JSON dump with versioned template | techspec.md §3.1 |
| 2 | `app/ai_gateway/prompts/roadmap_generate.py` | **[NEW]** Roadmap generation prompt template v1 — produces phased career roadmap from learner context | prompts.md §1 |
| 3 | `app/api/roadmap.py` | **Replaced stubs** with full implementation: `GET /roadmap/current`, `GET /roadmap/history`, `POST /roadmap/regenerate` with AI Gateway + DB persistence | api.md §3, rules.md §1.3 |
| 4 | `app/db/queries.py` | Added roadmap DB queries: `get_active_roadmap`, `create_roadmap` (with versioning/supersede), `get_roadmap_history` | schema.md §3 |
| 5 | `app/models/schemas.py` | Added `RoadmapPhase`, `RoadmapGenerateResponse`, `RoadmapCurrentResponse` Pydantic models | schema.md §3, api.md §3 |
| 6 | `migrations/002_roadmaps.sql` | **[NEW]** Roadmaps table with versioning, JSON phases, RLS policies, indexes | schema.md §3 |

#### Frontend

| # | File | Change | Spec Reference |
|---|------|--------|----------------|
| 7 | `index.html` | Replaced legacy inline styles (neon-green gamified theme) with clean HTML + Google Fonts (Inter + Outfit) | design.md §3 |
| 8 | `src/lib/api.js` | **[NEW]** New API client targeting `/api/v1` with auto Supabase JWT, circuit breaker, typed methods for all endpoints | architecture.md §2 |
| 9 | `src/pages/Dashboard.jsx` | **Complete rewrite** — replaced 780-line styled-components dark theme with TailwindCSS. Layout: hero (Today's Mission), secondary (phase progress), tertiary (streak, readiness, quick links) | design.md §2.2 |
| 10 | `src/pages/Onboarding.jsx` | **Rebuilt** with TailwindCSS. Added CareerGoalsForm as Step 2 (3-step flow: Profile → Career Goals → Personality Quiz) | design.md §2.1 |
| 11 | `src/components/onboarding/CareerGoalsForm.jsx` | **[NEW]** Career Goals form — collects target_role, current skills, interests, weekly learning hours (critical missing fields per Blocker #2) | schema.md §1-2, dataflow.md |
| 12 | `src/contexts/OnboardingContext.jsx` | Extended profileData with targetRole, skills, interests, learningHours. Updated save methods to persist these fields. | schema.md §1-2 |

### Critical Blockers Resolved

1. **Roadmap generation wiring fixed** — `POST /api/v1/roadmap/regenerate` is now a real implementation (was a stub). Uses AI Gateway → Gemini (`gemini-2.5-flash`) → schema validation → DB persistence with versioning (`002_roadmaps.sql`). Frontend has `/roadmap` route wired to new API.

2. **Onboarding data gap filled** — New `CareerGoalsForm.jsx` (Step 2) collects target_role, skills, interests, and learning hours that are required for roadmap generation per `schema.md` and `dataflow.md`.

### Build & Test Verification

- [x] **Frontend production build passes** — `vite build` completed cleanly in 15.4s (2262 modules transformed, 0 errors).
- [x] **TailwindCSS v4 styling** — CSS compilation and utility classes verified.
- [x] **API Client v2 (`src/lib/api.js`)** — Auto JWT attachment and circuit breaker verified.

### Remaining Work

- [ ] Resume upload UI + backend parsing pipeline (`resume.parse` / `resume.score`) (Phase 1)
- [ ] Daily Mission Engine — `GET /missions/today` AI generation & tracking (Phase 2)
- [ ] Frontend Roadmap phase details view page (Phase 2)
- [ ] Interview bot frontend + backend (`interview.question` / `interview.feedback`) (Phase 4)

---


## MVP Goals (from `prd.md` §3.1)

1. Let a learner create a profile (resume + questionnaire) and receive a personalized roadmap within minutes of signup.
2. Break the roadmap into daily missions that are small enough to complete in under an hour.
3. Adapt the roadmap automatically when the learner completes, fails, or skips missions.
4. Provide resume analysis with concrete, actionable feedback.
5. Provide a basic AI mock-interview flow (technical + HR) with a feedback report.

---

## Phase-by-Phase Status

### Phase 0 — Foundations (Week 1–2) — ~80% Complete

| Milestone | Status | Notes |
|---|---|---|
| Repo setup (frontend + backend) | Done | `guidify-frontend/` + `guidify-backend/` |
| Supabase: Auth, initial schema (Learner, Profile) | Done | Auth fully working, `learners` + `learner_profiles` tables migrated |
| FastAPI skeleton deployed to Render | Done | FastAPI v3.0.0 with middleware stack, Docker support |
| React skeleton deployed to Vercel | Done | Vite + React, production build pipeline |
| AI Gateway module scaffolded | Done | Full `AIGateway` class with Gemini provider, schema validation, retries, cost logging |
| AI Gateway: one Gemini call end-to-end | Done | `GET /api/v1/ai-gateway/test` works |
| CI: basic lint + type check on push | Unknown | `.github/` directory exists but contents not verified |
| **Exit: User can sign up, log in, see empty dashboard** | **Partial** | Auth + Dashboard working, but dashboard requires onboarding to be complete first |

**Gap:** Dashboard requires profile/onboarding to be complete before showing data; the "empty dashboard shell" experience is not clean — user is redirected to `/onboarding` on first login. Also, CI/CD pipeline status is unverified.

---

### Phase 1 — Profile & Resume (Week 3–4) — ~40% Complete

| Milestone | Status | Notes |
|---|---|---|
| Onboarding questionnaire UI (multi-step form) | Done | 2-step flow: ProfileForm + AI-AdaptivePersonalityTest |
| Resume upload → Supabase Storage | Not done | `resumeService.js` has API methods but NO UI component |
| Resume parsing pipeline (`resume.parse`) | Scaffolded | Backend endpoint returns `NOT_IMPLEMENTED`; legacy `file_parser.py` + `recommender.py` exist but not wired |
| Resume scoring + gap analysis (`resume.score`) | Not done | No implementation |
| Learner Profile assembled from questionnaire + resume | Partial | Questionnaire data saved; resume data not integrated |

**Gap:** The onboarding collects profile data but does NOT collect career goals, target role, or current skills — fields critical for roadmap generation. Resume upload has no frontend UI. Backend resume endpoints are stubs.

---

### Phase 2 — Roadmap & Daily Missions (Week 5–7) — ~35% Complete

| Milestone | Status | Notes |
|---|---|---|
| Roadmap generation (`roadmap.generate`) | Partial | Legacy `career_service.py` has Gemini-powered generation (not wired to new API). Frontend calls `POST /api/roadmap/generate` which hits a **legacy route** (`career_routes.py`), not the new `/api/v1/roadmap/regenerate`. |
| Roadmap UI (phase view, current phase highlighted) | Done | `CareerRoadmap.jsx` has form + timeline visualization |
| Daily Mission Engine | Not done | Backend returns `NOT_IMPLEMENTED`. No frontend component. No mission generation logic. |
| Mission completion tracking | Not done | No UI, no backend logic |
| Basic regeneration trigger | Not done | No adaptation logic exists |

**Critical Issue:** The roadmap generation flow is broken between frontend and backend. Frontend calls legacy `/api/roadmap/generate` (from `career_routes.py`) while the new API (`/api/v1/roadmap/regenerate`) is a stub. The legacy route is NOT registered in `main.py` — meaning roadmap generation **does not work at all** in the current wiring.

---

### Phase 3 — Adaptation Engine (Week 8–9) — 0% Complete

| Milestone | Status | Notes |
|---|---|---|
| Full regeneration trigger set | Not started | No `rules_engine.py` service exists |
| Roadmap versioning + archive | Not started | Schema defines `roadmaps.version` but no versioning logic |
| Skill Gap Analysis service | Not started | No implementation |
| Dashboard v1 (streak, missions, skill graph) | Partial | Dashboard shows streak + radar chart, but no mission data or skill gap visualization |

---

### Phase 4 — Interview Bot (Week 10–11) — 0% Complete

| Milestone | Status | Notes |
|---|---|---|
| Interview session flow | Not done | Backend returns `NOT_IMPLEMENTED`. Only CSS (`InterviewBot.css`) exists — no React component. |
| Question generation + follow-ups | Not done | AI Gateway has `interview.question` task type registered but no implementation |
| Feedback report generation | Not done | AI Gateway has `interview.feedback` task type registered but no implementation |
| Interview readiness sub-score | Not done | No data flow to dashboard |

---

### Phase 5 — Polish, Metrics, Beta Launch (Week 12–13) — 0% Complete

| Milestone | Status | Notes |
|---|---|---|
| Success metrics instrumentation | Not started | No analytics event wiring |
| Error/empty/loading states | Partial | Some loading spinners exist; no comprehensive empty-state handling |
| Security pass (RLS, signed URLs, DPDP) | Partial | RLS policies exist; DPDP consent fields defined in schema but not enforced in UI |
| Closed beta | Not started | No beta cohort setup |

---

## Summary Scorecard

| Phase | Target Week | Progress | Verdict |
|---|---|---|---|
| Phase 0 — Foundations | Week 1–2 | ~80% | Mostly done, minor gaps |
| Phase 1 — Profile & Resume | Week 3–4 | ~40% | Behind — resume not built, onboarding incomplete |
| Phase 2 — Roadmap & Missions | Week 5–7 | ~35% | Behind — roadmap wiring broken, missions not started |
| Phase 3 — Adaptation Engine | Week 8–9 | 0% | Not started |
| Phase 4 — Interview Bot | Week 10–11 | 0% | Not started |
| Phase 5 — Polish & Beta | Week 12–13 | 0% | Not started |

**Overall MVP completion: ~25%**

---

## What Works End-to-End

1. **Auth flow** — Sign up (email + Google OAuth), login, logout, session persistence
2. **Onboarding** — Profile form + AI-adaptive personality quiz
3. **Dashboard** — Greeting, skills radar, login streak, activity heatmap, NCVET course recommendations
4. **Landing page** — Hero, features, testimonials

## What Is Built But Not Wired

| Component | Location | Issue |
|---|---|---|
| Resume upload service | `frontend/src/services/resumeService.js` | No UI page |
| Interview bot CSS | `frontend/src/styles/InterviewBot.css` | No React component |
| Career suggestion component | `frontend/src/components/onboarding/CareerSuggestion.jsx` | Not in onboarding flow |
| Radar chart visualization | `frontend/src/components/onboarding/RadarChartVisualization.jsx` | Not in onboarding flow |
| Statistics dashboard CSS | `frontend/src/styles/StatsDashboard.css` | No page |
| 14 legacy backend routes | `backend/app/routes/*.py` | Not registered in `main.py` |
| Legacy career service | `backend/app/services/career_service.py` | Not connected to new API |

## What Is Completely Missing

1. Daily Mission Engine (frontend + backend)
2. Roadmap adaptation / rules engine
3. Interview bot (frontend + backend logic)
4. Resume upload UI
5. Resume parsing/scoring (new API)
6. Skill gap analysis service
7. Mission completion tracking
8. Roadmap versioning logic
9. User profile page (`/profile`)
10. Settings page (`/settings`)

---

## Critical Blockers & Status

1. **[RESOLVED] Roadmap generation wiring fixed** — `POST /api/v1/roadmap/regenerate` is fully implemented using AI Gateway (`roadmap.generate` task + Gemini) + schema validation + DB storage (`002_roadmaps.sql`).
2. **[RESOLVED] Onboarding data gap filled** — `CareerGoalsForm.jsx` (Step 2) now collects target_role, skills, interests, and learning hours.
3. **[IN PROGRESS] Schema unification** — Next step is completing the migration of remaining frontend components to consume `/api/v1` routes backed by `learners` and `learner_profiles` tables.

---

## Recommended Next Steps (Priority Order)

1. **Build Daily Mission Engine** — Implement `GET /api/v1/missions/today` in backend (using `mission.generate` task in AI Gateway) and build the Mission View component.
2. **Build Resume Upload & Parsing UI** — Create `/resume` page, connect to Supabase Storage and `/api/v1/resume/upload`, and implement `resume.parse` / `resume.score` tasks in AI Gateway.
3. **Build Interview Bot UI & Engine** — Implement `interview.question` and `interview.feedback` tasks in AI Gateway and build the `/interview` interactive component.
4. **Complete Schema Migration** — Point remaining legacy features to `/api/v1` endpoints.
