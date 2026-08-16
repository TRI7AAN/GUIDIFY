# GUIDIFY — Production Performance & Readiness Audit

**Date:** 2026-08-17
**Scope:** Full-stack forensic review (React/Vite frontend, FastAPI backend, Supabase schema/RLS, AI gateway, deployment configs).
**Method:** Static source review of the repository at `main` (`b1e5705`), migration-by-migration schema analysis, frontend/backend data-shape cross-checks, and local execution of the backend test suite.
**Status confidence:** Each finding is marked **CONFIRMED** (proven by code + schema in the repo) or **SUSPECTED** (strongly implied but requires live-environment verification, e.g. which SQL scripts actually ran against the production Supabase project).

> **Read-only audit** was the original state. Since then a **remediation pass** has been applied (code, migrations, deployment configs) — see §1.5 for per-finding status and §7 for the deploy checklist that is still required by hand.

---

## 1. Executive Summary

GUIDIFY is a well-structured codebase with strong intent: proper RLS on nearly every table, a centralized AI gateway, sensible upload validation, an error contract (`{error:{code,message}}`), and coherent documentation (`wiki/`). **The design is good; the wiring is broken.**

The platform's biggest problems are not in any single file — they are **cross-layer contract breaks**:

1. **The onboarding flow cannot be completed against the schema as migrated.** Frontend components write to `learners` columns that do not exist (`age`, `gender`, `current_class`, `location`, `skills`, `interests`, `learning_hours`, `category_scores`, `personality_analysis`, `career_suggestion`, `onboarding_step`). PostgREST rejects the updates; `onboarding_completed` is never set; new users are stuck in the onboarding loop. This alone blocks every new signup.
2. **The production frontend can silently target `http://127.0.0.1:8000`.** `src/lib/api.js` defaults `VITE_API_URL` to localhost, and neither `vercel.json` nor any build config sets it. If the env var is not configured in Vercel, the deployed app is dead on arrival.
3. **Several flagship features are wired to endpoints that always fail or always return fallback data**: the AI "adaptive personality" quiz, the Quick Fit Check (500 on first submission), AI course/company recommendations (always `[]`), delivery analytics (403 every time — the required columns and consent record are never created), and the async resume pipeline (no RLS policy → falls back to blocking inline processing).
4. **Security DEFINER RPCs are cross-user accessible** — a real, exploitable IDOR given that the backend operates with only the publishable key.
5. **The AI budget is spent on the wrong thing**: every psychometric/recommender request pays 30–90s of a free-tier 120B model call that is then thrown away because the gateway has no `_custom_prompt` handler and always builds the template for a different task type.

None of this is visible from a smoke test: the health endpoint returns `ok`, all 31 tests pass, and most routes respond 200. It only breaks when real data flows through real RLS and real AI.

**Overall readiness score: 2.5 / 10. Do not promote to public production traffic without Phase 0–1 remediation (Section 7).**

---

## 1.5 Remediation Status (applied 2026-08-17)

Status legend: **FIXED** = code/migration written and locally verified (backend tests 32/32 pass, frontend `vite build` succeeds with `VITE_API_URL` set and fails without it); **DEPLOY** = fix requires a manual step (apply migration, set env var, start worker, re-deploy) before it is live; **PARTIAL** = root path fixed, remaining work listed; **OPEN** = not addressed in this pass.

| # | Finding | Status | Where fixed / what remains |
|---|---|---|---|
| F-01 | Onboarding never completes | **FIXED (DEPLOY)** | `migrations/016_onboarding_profile_columns.sql` adds the 11 missing `learners` columns; `queries.get_learner_profile` falls back to `learners` columns when `learner_profiles` is empty. **Deploy:** apply migration 016. |
| F-02 | Prod API defaults to localhost | **FIXED (DEPLOY)** | `vite.config.js` build guard throws when `NODE_ENV=production` and `VITE_API_URL` is unset (verified). **Deploy:** set `VITE_API_URL` in Vercel. |
| F-03 | Un-scoped SECURITY DEFINER RPCs (IDOR) | **FIXED (DEPLOY)** | `migrations/018_security_hardening.sql` rewrites `create_roadmap_atomic`, `set_current_resume_atomic`, `calculate_streak_sql` with `COALESCE(auth.uid(), p_learner_id)` + explicit rejection. **Deploy:** apply migration 018. |
| F-04 | Async job pipeline dead | **FIXED (DEPLOY)** | Migration 018 adds job_queue INSERT RLS and restricts claim/complete to `service_role`; `job_worker.py` rewritten with a service-role client and fails fast without `SUPABASE_SERVICE_ROLE_KEY`; worker enabled in `docker-compose.yml`. **Deploy:** apply 018, set `SUPABASE_SERVICE_ROLE_KEY`, start the worker. |
| F-05 | Delivery analytics dead | **FIXED (DEPLOY)** | Migration 017 adds `delivery_consent_id`, `camera_enabled`, `delivery_metrics` to `interview_sessions`; `interview.start_interview_session` creates the `delivery_analytics` consent and stores the id. **Deploy:** apply migration 017. |
| F-06 | Psychometric AI always fallbacks | **FIXED** | Gateway `_build_prompt` now honours `context["_custom_prompt"]` (incl. schema-hint retry path); unit-verified. |
| F-07 | Quick Fit Check 500 on first submit | **FIXED** | `profile_psychometrics.py` uses `.maybe_single()` + `to_thread` for the retake-check, persist, and status endpoints. |
| F-08 | AI recommender always `[]` | **FIXED** | `recommender.py` passes `_custom_prompt` for company/course/NCVET; profile fallback in `queries.get_learner_profile`. |
| F-09 | Rules engine never adapts | **FIXED** | Goal change now regenerates for real: `_handle_goal_change` calls the shared `roadmap_service.regenerate_roadmap` (bypasses debounce, `trigger_reason=goal_change`); debounce no longer depends on `event_log` (reads `roadmaps` with `event_log` fallback). `skill_baselines` was already created + seeded by migration 005. |
| F-10 | Psychometric context never reaches roadmap | **FIXED** | `roadmap_service` injects `psychometric_narrative/pacing/tone` (new `queries.get_psychometric_profile`); covered by `test_regenerate_injects_psychometric_context`. |
| F-11 | Dashboard fabricated/stale metrics | **FIXED** | Radar now derives axes from real `category_scores` keys (onboarding/psychometric/AI all use different key sets) and shows an honest empty state + CTA instead of fake `[50,50,50,50,50]`; `_fetch_profile_psychometrics` reads `learners.category_scores` first. Session-factored goals read remains a Phase-2 improvement. |
| F-12 | Resume truncates to 500 chars | **FIXED** | `_sanitize_user_input(max_len=MAX_RESUME_CHARS)` (12000) for resume content; `file_size_bytes` from `os.path.getsize`. |
| F-13 | Sync Supabase blocks event loop | **FIXED** | All live request paths now go through `_run_query` (`asyncio.to_thread`); `ncvet_connector.sync_courses` (an `async def` that blocked directly) was wrapped. The remaining sync `.execute()` dead code (`gamification_service`, `get_college_recommendations`) was removed or quarantined under F-29. |
| F-14 | Render missing AI key + OCR deps | **FIXED (DEPLOY)** | `render.yaml` build installs `tesseract-ocr poppler-utils libgomp1`; `SUPABASE_SERVICE_ROLE_KEY` + `OPENROUTER_API_KEY` added. **Deploy:** re-deploy Render service. |
| F-15 | Interview feedback 500 / 11 AI calls | **FIXED (DEPLOY)** | `readiness_subscore` default 50 (schema) + `_end_session` coercion. Call-count reduction still pending (F-19/Phase 2). |
| F-16 | `/org-profiles`, `/stats` crash SPA | **FIXED** | `OrgProfilesPage.jsx` + `StatsPage.jsx` placeholders registered in `App.jsx` `componentMap`; build verified. |
| F-17 | Duplicate daily missions | **FIXED (DEPLOY)** | Migration 018 adds `uq_daily_missions_learner_date`; `missions.py` persist wrapped with re-fetch fallback. **Deploy:** apply 018 (dedupe first). |
| F-18 | Per-request `get_user` auth HTTP | **FIXED** | `app/core/auth.py` now uses a bounded 5-minute TTL cache keyed by token; off-loop call only on cache miss (verified: 3 same-token requests → 1 HTTP call). |
| F-20 | quiz_responses / raw ML data | **FIXED (DEPLOY)** | Migration 018 creates `quiz_responses` + RLS + `NOTIFY pgrst`. **Deploy:** apply 018. |
| F-26 | Docker healthcheck curl missing | **FIXED** | `curl` added to `Dockerfile` apt install. |
| F-21, F-22 | Mock LMI/ML data | **FIXED** | LMI skills-trend previously served `random.randint()` as market data — now returns 503 `SERVICE_UNAVAILABLE` until a real data pipeline exists (test updated). ML endpoints don't fabricate data (echo-only); `match_jobs` hardcoded DB is unexposed. |
| F-24 | Dead code | **PARTIAL** | Backend: deleted `gamification_service.py` + `ncvet_connector.py` (zero importers/tests); `get_college_recommendations` quarantined with a DEPRECATED marker. Frontend dead files/hooks/components (see §4) remain. |
| F-35 | Unused deps in requirements | **OPEN** | `groq`, `celery`, `tenacity` still in `requirements.txt`. |
| F-27 | Minimal test coverage | **OPEN** | Endpoint/RLS/migration integration tests not written yet. |
| F-29 | CSP on JSON responses | **OPEN** | Harmless today (JSON-only); footgun if SPA is served through the API origin. |
| F-30 | `.env` in git history | **OPEN** | Needs key-rotation confirmation / history review by repo owner. |
| F-28 | sessionStorage auth | **OPEN** | Deliberate (tab-scoped sessions); document in docs/UX. |

---

## 2. Severity Scorecard

| Dimension | Score /10 | Comment |
|---|---|---|
| Architecture | 4 | Sound layering; broken cross-layer contracts dominate |
| Performance | 2 | Blocking sync DB calls on event loop; 11 sequential AI calls per interview; per-request external auth HTTP |
| Security | 5 | RLS is mostly right; undermined by un-scoped SECURITY DEFINER RPCs + publishable-key-only operation |
| Reliability | 2 | First-submit 500s, always-`[]` recommender, 403 delivery metrics, onboarding deadlock |
| Scalability | 3 | No worker, no cache, no queue (job_queue unusable), no connection pooling |
| Code quality | 6 | Clean, documented, DRY-ish; large volume of dead code/deps |
| Testing | 3 | 31 tests pass but cover only pure logic; no RLS/endpoint/integration tests |
| Database | 5 | Good migration hygiene; doc/schema drift and missing columns are the killer |
| AI | 2 | Free model + wrong task-type wiring = slow, wasteful, unreliable |
| Production readiness | 2 | Env/config gaps (VITE_API_URL, OPENROUTER_API_KEY, OCR deps), no worker, no observability plan |
| **Overall** | **2.5** | |

---

## 3. Findings Register

### P0 — Blocks core user journeys or whole production deployment

#### F-01 · Onboarding can never be completed (schema/column mismatch)
**Area:** Frontend → Supabase · **Status:** CONFIRMED (repo-level; verify live DB columns)
- `learners` table (migrations/001_phase0_learners.sql:11) has only: `id, email, full_name, segment, target_role, onboarding_completed, consent_data_processing, consent_ai_training, created_at, updated_at`. No migration anywhere adds columns.
- Yet the onboarding frontend writes to non-existent columns:
  - `ProfileForm.jsx` → `OnboardingContext.saveProfileData` (`OnboardingContext.jsx:106-113`) sets `age`, `gender`, `current_class`, `location` → PostgREST 400 → `saveProfileData` returns `false` → Step 1 blocks ("Failed to save. Try again."). **New users cannot pass Step 1.**
  - `CareerGoalsForm.jsx:113-122` writes `skills`, `interests`, `learning_hours` to `learners` → fails silently (error swallowed), continues.
  - `AdaptivePersonalityTest.jsx:224-232` writes `category_scores`, `personality_analysis`, `career_suggestion`, `onboarding_completed` to `learners` → whole UPDATE fails → `alert("Submission failed…")` → `updateOnboardingStatus(true)` never runs.
  - `OnboardingContext.nextStep` persists `onboarding_step` (`OnboardingContext.jsx:237`) → fails silently.
- Consequence: `onboarding_completed` stays `false` → `AuthContext` redirects to `/onboarding` forever. **Every new user is locked out of the product.**
- The schema.md (the authoritative design doc) agrees with migration 001 — the frontend simply targets columns that were never created. (Backend `/auth/onboarding` writes to `learner_profiles`, a different table, and is not even called by the UI.)
- Remediation: add the missing columns via migration (or refactor onboarding to write `learner_profiles`), make Step 1 save tolerant, and add an E2E onboarding test.

#### F-02 · Production API base URL defaults to `http://127.0.0.1:8000`
**Area:** Frontend build · **Status:** CONFIRMED (conditional on Vercel env)
- `src/lib/api.js:18` and `src/api/apiClient.js` both fall back to `http://127.0.0.1:8000`.
- `vercel.json` only sets `buildCommand`/rewrites; nothing injects `VITE_API_URL` at build time.
- If `VITE_API_URL` is not set in the Vercel project env vars, the deployed bundle calls the user's own machine. **The entire deployed app fails.**
- Remediation: set `VITE_API_URL` in Vercel env; ideally fail the build when unset for non-local builds (or bake it in `vercel.json` build command).

---

### P1 — Major feature broken / security exposure / serious performance

#### F-03 · SECURITY DEFINER RPCs are un-scoped (IDOR)
**Area:** Supabase · **Status:** CONFIRMED
- migrations/013_atomic_operations_and_indexes.sql + 014_job_queue.sql define `create_roadmap_atomic`, `set_current_resume_atomic`, `calculate_streak_sql`, `claim_next_job`, `complete_job` as `SECURITY DEFINER`, granted to `authenticated`, with **no `auth.uid() = p_learner_id` check** and only `search_path = public` hardening.
- Any authenticated user can overwrite another learner's active roadmap / current resume, or tamper with the shared job queue via direct PostgREST RPC calls.
- With the backend running on the publishable key only, RLS *and* RPC scoping is the entire security boundary — and the boundary is open here.
- Remediation: add `auth.uid() = p_learner_id` guards inside each function (or `SET search_path` + `security definer` for queue admin via service role only).

#### F-04 · Async job pipeline is dead; resume processing blocks requests
**Area:** Resume + jobs · **Status:** CONFIRMED
- `job_queue` has **no INSERT RLS policy** (migration 014) → `_enqueue_resume_processing` (`resume.py:58`) always raises → caught → falls back to **inline awaited** `_process_resume_async` (`resume.py:169`), which runs 2 AI calls (parse + score, ~30–180s on the free model) inside the upload request.
- `workers/job_worker.py` uses the module-level **anon** `supabase` client: `claim_next_job` is granted only to `authenticated`/`service_role` → permission denied → swallowed by a bare `except Exception: pass` → **the worker can never claim a job, even if it ran.** (Even if claimed, anon RLS blocks `update_resume`/`update_learner_profile`.)
- `docker-compose.yml` defines no worker service.
- `render.yaml` runs only the API process.
- Remediation: grant queue INSERT to `authenticated`, give the worker a service-role or auth'd client, add worker to compose/Render, keep inline path only as a documented fallback.

#### F-05 · Delivery analytics is dead end-to-end
**Area:** Interview · **Status:** CONFIRMED
- `interview_sessions` (migration 006) has **no** `delivery_consent_id`, `camera_enabled`, or `delivery_metrics` columns. schema.md §8 documents a "Phase 4.5 migration" adding them — **that migration does not exist in the repo.**
- `start_interview_session` (`interview.py:42`) never creates a consent record or sets any consent column.
- `submit_delivery_metrics` (`interview.py:214`) requires `delivery_consent_id` on the session → always 403.
- The client (`InterviewPage.jsx:240-250`) computes and submits the payload, catches the 403, and logs it — **metrics are computed and thrown away**. Dashboard delivery-trend endpoints (`dashboard.py:101`) then read rows that never get metrics. The `delivery_trends` triggers in production_db_optimization.sql can never fire.
- Remediation: add columns via migration, create a consent row when the learner opts in, set it on the session, then persist metrics.

#### F-06 · Psychometric AI service always returns fallbacks (wasted AI spend)
**Area:** AI gateway · **Status:** CONFIRMED
- `PsychometricService.generate_adaptive_question`, `generate_quiz_questions`, `analyze_personality` pass `_custom_prompt`/`_system_instruction` inside `context` to `gateway.generate(task_type="psychometrics.narrate", …)`.
- The gateway has **no `_custom_prompt` handler** (`ai_gateway/gateway.py`) — it always builds the template for `psychometrics.narrate` (narrative summary with `ipip_scores={}, riasec_scores={}, grit_score=None`). The model answers the *wrong* question, so every call returns narrate-shaped JSON → code takes the fallback path (static questions, empty quiz, hardcoded profile). Each request still pays a full 30–90s free-model round-trip.
- `analyze_personality` additionally writes `category_scores`/`personality_analysis`/`career_suggestion` to `learners` (columns don't exist, see F-01) — error swallowed, never persisted.
- Remediation: add a first-class `_custom_prompt` path to the gateway (or proper task types `psychometrics.questions`/`psychometrics.analyze` with real templates), and fix the persistence target.

#### F-07 · Quick Fit Check 500s on a learner's first submission
**Area:** Profile psychometrics · **Status:** CONFIRMED (high confidence)
- `profile_psychometrics.py:58` uses `supabase.table("psychometric_profiles").select("id").eq("learner_id", …).single()` on the **first** submission (zero rows). `supabase-py` raises on `.single()` with no rows (PostgREST 406) → the `except` re-raises as HTTP 500 ("Failed to save assessment results").
- Nothing is persisted, so every retry 500s again. Onboarding Step 4 (`PsychometricFitCheck.jsx:186-211`) hits this every time and shows "We hit a snag / Try Again" forever.
- Remediation: use `.maybe_single()` (or catch PGRST116) and upsert.

#### F-08 · AI recommender functions always return `[]`
**Area:** Recommender · **Status:** CONFIRMED
- `recommend_companies_async`, `get_course_recommendations`, `recommend_nsqf_courses` stuff the real prompt into `job_description` and call `task_type="resume.jd_match"` (JD-match template). The template expects JD-match JSON (`match_score`, `matching_skills`, …) and `_sanitize_user_input` truncates the embedded prompt to 500 chars. `result.get("companies", [])` / `courses` → **always `[]`**, after another wasted AI call.
- `/resume/match-jd` is the *legitimate* JD-match use and works; the recommender misuses it.
- Remediation: separate `recommend.courses` / `recommend.companies` task types with their own templates.

#### F-09 · Rules engine adaptation never actually adapts
**Area:** Adaptation · **Status:** CONFIRMED
- `_handle_goal_change` (`rules_engine.py`) only *returns* `adaptation_needed`; **no caller regenerates the roadmap**.
- `/roadmap/regenerate` debounces to 24h with no goal-change bypass → a target-role change never produces a new roadmap.
- Skill gap analysis depends on `skill_baselines` (exists only in `schema.sql`, not in migrations) → always empty in prod.
- Delivery-trigger evaluation never runs because delivery metrics are never saved (F-05).
- Remediation: wire goal-change → regeneration (with its own cooldown), add `skill_baselines` migration + seed, remove the dependency on event-log INSERT for critical paths.

#### F-10 · Psychometric context never reaches roadmap generation
**Area:** Roadmap · **Status:** CONFIRMED
- `/roadmap/regenerate` (`roadmap.py:57`) builds context without `psychometric_profiles.narrative_summary/pacing_hint/tone_hint`. Even when F-06/F-07 are fixed, roadmaps will ignore psychometric personalization. Debounce also depends on an `event_log` INSERT (which itself can fail).
- Remediation: fetch and inject psychometric narrative/hints into the roadmap prompt; make debounce robust to event_log failures.

#### F-11 · Dashboard reports fabricated/stale metrics
**Area:** Dashboard · **Status:** CONFIRMED
- `interview_readiness` hardcoded `0`; `placement_readiness = min(progress_pct, 100)`; `skill_graph` levels synthesized; learning-path fallback steps are hardcoded placeholders (`Dashboard.jsx:135-139`).
- Radar chart renders default `[50,50,50,50,50]` when `category_scores` absent (`Dashboard.jsx:110-112`).
- Remediation: compute from real data (psychometric scores, completed sessions, roadmap progress) or omit.

#### F-12 · Resume parse truncates to 500 characters
**Area:** AI gateway / resume · **Status:** CONFIRMED
- `gateway.py` `_sanitize_user_input` truncates interpolated strings; `resume.parse` passes the resume text through it → only the first ~500 chars of a resume are ever parsed/scored.
- Combined with F-04, uploads are slow and shallow. Also `file_size_bytes = len(resume_text)` (`resume.py`) is not the uploaded file size.
- Remediation: raise/skip truncation for resume text, pass file size from the upload metadata.

#### F-13 · Sync Supabase calls block the event loop
**Area:** Backend performance · **Status:** CONFIRMED
- `supabase_client.py` provides a request-scoped **synchronous** client. Direct `.execute()` calls appear in `psychometric_test.py` (incl. `_sync_radar_scores`), `profile_psychometrics.py`, `psychometric.py`/`psychometric_service.py`, `interview.py`, `recommender.py` — all inside `async def` handlers → **event-loop blocking** under concurrency.
- `db/queries.py` does it correctly via `asyncio.to_thread`; the direct-call routes bypass that.
- Remediation: route all DB access through `queries._run_query`/`to_thread` (or use the async supabase client).

#### F-14 · Render deployment is missing AI key and OCR system deps
**Area:** Deployment · **Status:** CONFIRMED
- `render.yaml` sets no `OPENROUTER_API_KEY` → provider falls back to Gemini.
- No apt/build step installs `poppler-utils` + `tesseract-ocr` → image/scanned PDF uploads (which need `pdf2image`/`pytesseract`) return 400 on Render. Free plan (512MB) is also tight for sentence-transformers/lightgbm.
- `SUPABASE_ACCESS_TOKEN` is set as an env var but nothing in the app reads it.
- Remediation: set the key, add the apt buildpack deps, and consider the paid plan if the ML deps stay.

#### F-15 · Interview feedback can 500; 11 sequential AI calls per session
**Area:** Interview · **Status:** CONFIRMED
- `InterviewFeedbackResponse` requires `readiness_subscore` (`schemas.py`); `_end_session` builds `InterviewFeedbackResponse(**feedback_data)` → an AI response missing that key = ValidationError → 500.
- Each session = 10 answer-generations + 1 feedback call, all sequential, all on the free 120B model (30–90s each, subject to rate limits). The frontend `lib/api.js` circuit breaker (8 failures/10s) can trip mid-session.
- Remediation: make `readiness_subscore` optional/defaulted with a fallback compute; reduce AI calls per session; use a faster/paid model for per-question generation.

#### F-16 · `/org-profiles` and `/stats` routes crash the SPA
**Area:** Frontend routing · **Status:** CONFIRMED
- `routes/index.js` lists `/org-profiles` and `/stats` as protected, but `App.jsx` componentMap has no entries for them → React renders `undefined` → ErrorBoundary white screen. Not reachable from the Sidebar NAV_ITEMS (dashboard, roadmap, resume, interview, psychometric-test only), so it's URL-triggered — but a 404/placeholder would be correct.

---

### P2 — Reliability / performance / correctness concerns

- **F-17 · Missions race** — no unique `(learner_id, assigned_date)`; concurrent first-GETs can create duplicate daily missions (`missions.py:35`).
- **F-18 · Per-request auth round-trip** — `get_current_learner_id` calls `supabase.auth.get_user` over HTTP on every request with no cache (`auth.py`); adds latency and rate-limit pressure.
- **F-19 · Free-model latency + 120s timeouts** — every roadmap/mission/interview generation is 30–90s; combined with the circuit breaker, flaky under load. (Tied to F-15.)
- **F-20 · `quiz_responses` table exists only in a standalone script** (`create_quiz_responses.sql`), not in migrations. Currently unused by the UI (dead `saveQuizResponses`), so impact is dormant — confirm before relying on it.
- **F-21 · LMI is mock data** — `lmi_service.py` returns `random.randint` demand scores presented as real labour-market intelligence.
- **F-22 · `/ml/profile/generate` unauthenticated + fabricated** — no auth dependency; returns synthetic profile data.
- **F-23 · Legacy API client inconsistencies** — `sessionStorage['guidify_token']` is not refreshed on `TOKEN_REFRESHED` (only the in-memory copy is), so a reload after rotation can use a stale JWT → 401 → `auth:unauthorized` event is dispatched but **no listener exists anywhere**. Only `AdaptivePersonalityTest` still uses this client.
- **F-24 · Dead code** — frontend: `src/api/{authService,statisticsService,jobService,courseService,resumeService,index}.js`, `src/hooks/useApi.js`, unused hooks (`useSubmitOnboarding`, `useDeliveryTrends`, `useAdaptationStatus`, `useSkillGap`), unused components (`AdaptationAlertBanner`, `SkillsRadar`, `SkillGraph`, `RoadmapTimeline`, `CareerSuggestion`, `RadarChartVisualization`); backend: `core/cache.py` (redis), dead services (`ocr.py`, `gamification_service`, `ncvet_connector` per prior scan), unused deps (`groq`, `celery`, `tenacity`).
- **F-25 · Onboarding endpoint duplicates `learner_profiles` rows** — `/auth/onboarding` inserts a new row each submit (`auth.py:29`); duplicates accumulate (latest wins). Dead from the UI, but live API.
- **F-26 · Docker healthcheck broken** — docker-compose healthcheck uses `curl`, which is not installed in the backend Dockerfile.
- **F-27 · Minimal test coverage** — `tests/test_api.py` has 3 endpoint tests + a `pass` stub for dashboard; no tests exercise RLS, RPCs, migrations, or real endpoints. `pytest -q` = **31 passed** (20 pure scoring/decision-engine, roadmap-regeneration mocks, 3 endpoints, misc).
- **F-28 · sessionStorage auth** — sessions die on tab close (deliberate per code comments); acceptable, but note it in docs/UX.

---

### P3 — Hygiene / latent risks

- **F-29 · CSP on JSON responses** — `main.py:119` sets `Content-Security-Policy: default-src 'self'` on all API responses. Browsers only enforce CSP on documents; the API returns JSON, so this is harmless today. It becomes a footgun if the SPA is ever served through the API origin (the SPA needs Supabase/MediaPipe/Googleapis domains, which `default-src 'self'` blocks).
- **F-30 · Frontend `.env` in git history** — credentials were committed earlier (55d6e63, a7342a6, 84419ac, f98c533) and removed in 1406dc9; `.env` is now untracked. Keys appear revoked per config comments, but history rewrite/rotation should be confirmed.
- **F-31 · Instrument configs not served** — `PsychometricFitCheck` fetches `/psychometric/instruments/ipip|riasec` which **do not exist** as routes; the designed fallback (inline items) is always used. Works, but the "fetch from backend" path is dead.
- **F-32 · `/psychometric/start` unauthenticated** — intentional (static questions), but it's a data-only endpoint; note for API inventory.
- **F-33 · Trigger functions lack `search_path` hardening** — `update_updated_at_column`, `update_interview_sessions_updated_at`, delivery-metrics triggers set no `search_path` (defense-in-depth).
- **F-34 · Dead UI affordances** — TopBar search input has no handler.
- **F-35 · Unused deps in requirements** (`groq`, `celery`, `tenacity`) inflate image size; `sentence-transformers`/`lightgbm` are only lazily loaded by the fabricated `/ml` path.

---

## 4. Top 10 Likely Production Failures

Ranked by expected impact on real users in order of likelihood:

1. **F-01 — New users are stuck in onboarding** (Step 1 save fails on missing columns; `onboarding_completed` never set).
2. **F-02 — Whole app dead if `VITE_API_URL` isn't set at Vercel build** (bundle targets `127.0.0.1:8000`).
3. **F-06/F-08 — "AI" features always return static fallbacks** after wasting 30–90s (personality quiz, recommender), so features look broken *and* slow.
4. **F-04 — Resume uploads block for 30–180s** (queue dead → inline processing), then results are truncated to 500 chars (F-12).
5. **F-03 — Any user can overwrite other learners' roadmaps/current-resume** via the un-scoped SECURITY DEFINER RPCs.
6. **F-07 — Quick Fit Check can never complete** (500 on first submission) → another onboarding dead-end.
7. **F-05 — Delivery analytics silently discards all metrics** (403 every submission; required columns don't exist).
8. **F-15 — Interviews are slow and flaky** (11 sequential free-model calls; 500s on missing `readiness_subscore`; circuit breaker trips).
9. **F-09/F-10 — The "adaptive" engine never adapts** (goal changes don't regenerate; psychometric context never reaches the roadmap; skill gaps always empty).
10. **F-11/F-16 — Dashboard lies (hardcoded/stale metrics) and two routes white-screen** — trust erosion in the core UX.

---

## 5. Positive findings (worth preserving)

- RLS is enabled and learner-scoped on `learners`, `learner_profiles`, `resumes`, `roadmaps`, `roadmap_phases`, `missions`, `interview_sessions`, `psychometric_profiles`, `psychometric_results`, `psychometric_sessions`, `consents`, `verified_courses`, `event_log` (migrations 001–012).
- Upload validation is solid: MIME whitelist, 5MB cap, UUID filenames, `X-Content-Type-Options` (`helpers.py`, `file_parser.py`).
- API error contract is consistent; error handlers centralized (`middleware/error_handler.py`).
- Frontend has a real circuit breaker, retry-with-backoff, and a 120s timeout calibrated for AI latency; roadmap regenerate correctly sets `skipRetry`.
- `AuthCallback` handles PKCE, hash flows, OAuth error surfacing, and profile-creation race robustly.
- Deterministic psychometric scoring (`psychometrics_scoring.py`, `psychometric_decision_engine.py`) is well-tested (20 tests pass) and correct.
- Migrations are versioned and mostly idempotent; schema.md documents intent clearly (and thereby makes the drift obvious).
- Security headers (nosniff, X-Frame-Options, HSTS) are set; docs are disabled in production; Sentry hook exists behind a flag.

---

## 6. Verification performed

- `python -m pytest` in `guidify-backend` → **32 passed** (scoring/decision-engine, roadmap regeneration incl. psychometric-context injection, endpoint tests incl. LMI 503). Frontend `vite build` passes with `VITE_API_URL` set.
- No live Supabase access was used; claims about RLS/column behavior are derived from migrations + code. Where a finding depends on *which* SQL scripts actually ran against the production project, it is marked accordingly.

---

## 7. Recommended Remediation Roadmap

> **Status as of 2026-08-17:** every Phase 0–1 item and most Phase 2 items have a **code/migration fix applied** (see §1.5). What remains is the **manual deploy checklist** in the boxed list, plus Phase 2 (F-15/F-19 call-count reduction) and Phase 3 items.

### ✅ Phase 0 — Same day (stop the bleeding) — code applied
- [x] `VITE_API_URL` build guard in `vite.config.js` (F-02) — **still set the env var in Vercel**
- [x] Migration 016 adds all missing `learners` columns (F-01) — **still apply it**
- [x] `OPENROUTER_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` + OCR deps in `render.yaml` (F-14) — **still re-deploy**

### ✅ Phase 1 — 1 week (core journeys) — code applied
- [x] Onboarding columns + `get_learner_profile` fallback (F-01)
- [x] `.maybe_single()` in `profile_psychometrics.py` (F-07)
- [x] Interview-session columns + consent creation (F-05, migration 017)
- [x] `_custom_prompt` in gateway + recommender/psychometric wiring (F-06, F-08)
- [x] RPC `auth.uid()` guards (F-03, migration 018)
- [x] job_queue INSERT RLS + worker service-role rewrite + compose worker (F-04)
- [x] `readiness_subscore` default + coercion (F-15)
- [x] Goal change → actual roadmap regeneration via `roadmap_service`; debounce reads `roadmaps` not `event_log` (F-09)
- [x] Psychometric narrative injected into roadmap context (F-10)
- [x] Dashboard radar derives axes from real `category_scores` + honest empty state instead of fake `[50,50,50,50,50]` (F-11)

### 📦 Manual deploy checklist (not yet done — requires access to the live Supabase/Vercel/Render projects)
1. Apply migrations **016 → 017 → 018** to the production Supabase project (dedupe `daily_missions` before 018's unique index).
2. Vercel: set `VITE_API_URL=https://<backend-on-render>.onrender.com` and re-deploy.
3. Render: set `OPENROUTER_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, re-deploy with the updated `buildCommand`.
4. Start the worker (Render background/worker service or `docker compose up worker`) — requires the service-role key.

### Phase 2 — 2–4 weeks (reliability + performance)
- [x] Replace sync `.execute()` calls with `to_thread`/async on live paths (F-13 — done via `_run_query` + auth cache; remaining sync calls are dead code)
- [x] Cache `get_user` (F-18 — 5-min TTL, bounded)
- [x] Disable mock/fabricated LMI endpoint — 503 until a real pipeline exists; ML profile endpoint now requires auth (F-21, F-22)
- [ ] Reduce per-interview AI calls; move to a paid/faster model. (F-15, F-19)

### Phase 3 — Ongoing (hardening)
- [x] Remove backend dead code (F-24 — `gamification_service.py` + `ncvet_connector.py` deleted; `get_college_recommendations` marked deprecated)
- [ ] Frontend dead code; endpoint/RLS/migration integration tests; CSP for the SPA; drop unused deps; document sessionStorage tradeoff; confirm key rotation. (F-24, F-27, F-29, F-30, F-35, F-28)

---

## 8. Files reviewed (key)

Backend: `app/main.py`, `app/api/*` (auth, dashboard, missions, roadmap, resume, interview, adaptation, psychometric_test, psychometric, profile_psychometrics, ml, lmi), `app/services/*` (supabase_client, rules_engine, recommender, psychometric_service, psychometrics_scoring, psychometric_decision_engine, lmi_service, ml_service), `app/ai_gateway/*`, `app/db/queries.py`, `app/core/*`, `app/middleware/error_handler.py`, `app/models/schemas.py`, `app/utils/*`, `app/workers/job_worker.py`, `migrations/001–015` + `optimize_rls_policies.sql` + `production_db_optimization.sql`, `schema.sql`, `tests/*`, `requirements.txt`, `Dockerfile`, `docker-compose.yml`, `render.yaml`.

Frontend: `src/lib/api.js`, `src/api/apiClient.js`, `src/utils/supabaseClient.js`, `src/api/authService.js`, `src/contexts/{AuthContext,OnboardingContext}.jsx`, `src/hooks/query.js`, `src/routes/index.js`, `src/App.jsx`, `src/pages/*` (Dashboard, CareerRoadmap, InterviewPage, PsychometricTestPage, Onboarding, ResumePage, AuthCallback, LoginPage, RegisterPage, NotFound, LandingPage), `src/components/*` (layout, onboarding, dashboard, common), `src/delivery-analytics/*`, `package.json`, `vite.config.js`, `vercel.json`, `nginx.conf`, Dockerfile, `.env.example`, `git log` history for `.env` tracking.

Docs cross-checked: `wiki/schema.md`, `wiki/index.md`, `wiki/prd.md`, `wiki/AGENTS.md`.
