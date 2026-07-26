# GUIDIFY — Progress Report

**Generated:** Mon Jul 27 2026
**Based on:** `implementationplan.md`, `prd.md`, `schema.md`, `architecture.md`, codebase audit

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

## Critical Blockers

1. **Roadmap generation is broken.** Frontend calls `/api/roadmap/generate` but the legacy `career_routes.py` is NOT registered in `main.py`. The new `/api/v1/roadmap/regenerate` is a stub returning `NOT_IMPLEMENTED`. The user cannot generate a roadmap at all.

2. **Onboarding does not collect enough data.** The questionnaire collects name/age/gender/status/location + personality quiz, but NOT career goals, target role, current skills, or learning hours — all of which are required input for roadmap generation per `schema.md` and `dataflow.md`.

3. **Two competing schema systems.** Legacy `profiles` table (used by frontend) vs new `learners`/`learner_profiles` tables (used by new API). No migration path exists between them.

---

## Recommended Next Steps (Priority Order)

1. **Fix roadmap generation wiring** — Either register legacy routes in `main.py` or implement the new `/api/v1/roadmap/regenerate` endpoint. This is the #1 blocker.
2. **Extend onboarding** — Add career goal, target role, skills, and learning hours to the questionnaire flow.
3. **Build daily mission engine** — Backend: implement `GET /missions/today` with AI generation. Frontend: create mission view component.
4. **Build resume upload UI** — Wire up the existing `resumeService.js` to a frontend page.
5. **Resolve schema duality** — Decide on one schema (new `learners` or legacy `profiles`) and migrate the other side.
6. **Wire legacy routes or delete them** — The 14 orphaned route files are dead code creating confusion.
