# GUIDIFY — Change Log

## 2026-07-30

### 1. Data Processing Consent — Darker Tone Styling

**File:** `guidify-frontend/src/components/onboarding/ConsentStep.jsx`

Changed the consent box colors from light to darker tones for better visibility.

- Checked state: `border-primary-400 bg-primary-50` → `border-primary-700 bg-primary-100`
- Unchecked state: `border-surface-200 bg-white` → `border-surface-400 bg-surface-100`
- Hover state: `hover:border-surface-300` → `hover:border-surface-500`
- Applied to both "Data Processing Consent" and "AI Training Consent" boxes

---

### 2. Missing Psychometric Backend Routes — 404 Fix

**Root cause:** Frontend called `/api/psychometric/start`, `/api/psychometric/generate-quiz`, `/api/psychometric/analyze` but no backend route file existed. The service layer (`psychometric_service.py`) was present but had no route endpoints wrapping it.

**Created:** `guidify-backend/app/api/psychometric.py`

New route file with 3 endpoints:
- `POST /psychometric/start` — Returns 5 static baseline questions (no auth required)
- `POST /psychometric/generate-quiz` — Generates AI adaptive questions based on learner profile
- `POST /psychometric/analyze` — Runs personality analysis on full Q&A session

**Modified:** `guidify-backend/app/main.py` (lines 55, 147-148)

- Added `psychometric` to the import statement
- Registered the router: `app.include_router(psychometric.router, prefix=API_V1, tags=["Psychometric"])`

---

### 3. Frontend API URL Mismatch

**File:** `guidify-frontend/src/components/onboarding/AdaptivePersonalityTest.jsx`

Frontend called `/api/psychometric/*` but backend routes are registered under `/api/v1/*`.

- `/api/psychometric/start` → `/api/v1/psychometric/start` (line 111)
- `/api/psychometric/generate-quiz` → `/api/v1/psychometric/generate-quiz` (line 134)
- `/api/psychometric/analyze` → `/api/v1/psychometric/analyze` (line 198)

---

### 4. Auth Token Not Persisted Across Page Refresh

**Root cause:** After page refresh, the auth token was only stored in-memory via `setAuthToken()`. The `localStorage.getItem('guidify_token')` fallback in `apiClient.js` was never populated on login. This caused requests to fire without a token before `syncAuthState` completed, resulting in 403 errors.

**File:** `guidify-frontend/src/contexts/AuthContext.jsx`

- Added `localStorage.setItem('guidify_token', session.access_token)` after `setAuthToken()` (line 102-104)
- Added `localStorage.removeItem('guidify_token')` when user is null (line 86)

---

### 5. Profile Fetch Timeout Too Aggressive

**File:** `guidify-frontend/src/contexts/AuthContext.jsx` (line 38)

Changed profile fetch timeout from 4s → 8s. Supabase cold starts can exceed 4s, causing premature timeout and "Profile fetch timeout" errors.

---

### 6. Circuit Breaker Improvements

**Files:**
- `guidify-frontend/src/lib/api.js` (lines 27-31, 35-43, 72-75)
- `guidify-frontend/src/api/apiClient.js` (lines 26-31, 47-55, 88-91)

Both API clients had overly aggressive circuit breaker settings that blocked all requests after 5 failures for 30 seconds.

Changes:
- `MAX_FAILURES`: 5 → 8 (more tolerant before opening circuit)
- `CIRCUIT_OPEN_MS`: 30000 → 10000 (30s cooldown → 10s)
- Added half-open state: after cooldown, allows probe requests to test backend recovery
- Added `lastFailureTime` tracking for half-open state timing

---

### 7. 403 Handling in API Clients

**Files:**
- `guidify-frontend/src/api/apiClient.js` (line 77)
- `guidify-frontend/src/lib/api.js` (line 68)

FastAPI's `HTTPBearer()` returns 403 for missing/invalid tokens, not 401. Updated both clients to handle 403 alongside 401 for proper auth cleanup.

---

### 8. Psychometric Start Endpoint — Auth Removed

**File:** `guidify-backend/app/api/psychometric.py` (line 42-50)

Removed `get_current_learner_id` dependency from `POST /psychometric/start`. The endpoint only returns hardcoded static questions and does not need learner identity. This eliminates a failure point during onboarding when the token may not yet be available.

---

### 9. Reduced Vertical Height — Fit-to-Screen

Reduced excessive padding, margins, and `min-h-screen` constraints across the onboarding flow so the app fits on a normal viewport without scrolling.

**Files modified:**

| File | Changes |
|------|---------|
| `src/pages/Onboarding.jsx` | `min-h-screen` → `min-h-0`, `py-8` → `pt-4 pb-6`, `mb-8` → `mb-3`, `p-8` → `p-5`, header `text-3xl` → `text-2xl` |
| `src/components/onboarding/ProfileForm.jsx` | Container `padding: 2.5rem` → `1.5rem`, `FormGroup margin-bottom: 1.5rem` → `1rem`, input `padding: 0.8rem` → `0.6rem`, label `font-size: 0.95rem` → `0.85rem`, h2 `margin-bottom: 2rem` → `1.2rem`, submit `padding: 1rem` → `0.75rem` |
| `src/components/onboarding/CareerGoalsForm.jsx` | Header `mb-8` → `mb-4`, icon `w-14 h-14` → `w-10 h-10`, title `text-2xl` → `text-xl`, form `space-y-6` → `space-y-4`, submit `py-3.5` → `py-2.5` |
| `src/components/onboarding/ConsentStep.jsx` | Header `mb-8` → `mb-4`, icon `w-14 h-14` → `w-10 h-10`, title `text-2xl` → `text-xl`, cards `p-5` → `p-3.5`, `space-y-4` → `space-y-3`, text `text-sm` → `text-xs`, submit `py-3.5` → `py-2.5` |
| `src/components/onboarding/AdaptivePersonalityTest.jsx` | Container `padding: 2rem` → `0.5rem`, question card `padding: 2.5rem` → `1.5rem`, `margin-bottom: 2rem` → `1rem`, question text `font-size: 1.5rem` → `1.2rem`, option button `padding: 1.2rem` → `0.9rem` |
| `src/index.css` | `#root { min-height: 100vh }` → `min-height: 0` |
| `src/App.css` | `#root { min-height: 100vh }` → `min-height: 0` |
| `src/styles/GlobalStyles.js` | `#root { min-height: 100vh }` → `min-height: 0` |

---

### 10. Reduced Dashboard Vertical Height

Tightened spacing across the entire dashboard layout to fit more content in the viewport.

**Files modified:**

| File | Changes |
|------|---------|
| `src/pages/Dashboard.jsx` | Main `gap-8`→`gap-5`, heading `text-4xl`→`text-2xl`, stats `p-6`→`p-4` + `text-3xl`→`text-2xl` + `text-base`→`text-xs`, radar/heatmap `p-6`→`p-4` + `mb-4`→`mb-2`, progress `p-6`→`p-4` + `mb-2`→`mb-1.5`, learning path `gap-6`→`gap-4` + cards `p-6`→`p-4` + `text-2xl`→`text-lg`, quick actions `gap-4`→`gap-3` + `p-5`→`p-3.5` + `w-10 h-10`→`w-9 h-9` |
| `src/components/layout/AppShell.jsx` | `min-h-screen`→`min-h-0 h-screen`, content `p-8`→`p-5` |
| `src/components/layout/TopBar.jsx` | `px-8 py-4`→`px-5 py-3` |
| `src/components/layout/Sidebar.jsx` | `w-64`→`w-56`, `p-4`→`p-3`, `gap-8`→`gap-5`, nav `gap-2`→`gap-1.5` + `py-2`→`py-1.5` + `w-5 h-5`→`w-4 h-4` + `text-sm`→`text-xs` |

---

### 11. Radar Chart and Heatmap Size Reduction

Further compacted the radar chart and heatmap visualization cards.

**File:** `src/pages/Dashboard.jsx`

- Radar chart: Removed `lg:col-span-2` (now same column as heatmap), container `w-40 h-40` → `w-[100px] h-[100px]`, title restored to `text-sm`
- Heatmap: Title restored to `text-sm`, added `w-fit` to grid so cells size to content instead of stretching full width
- Both cards: padding `p-4`→`p-3`, margin `mb-2`→`mb-1`

---

### 12. AI Interview Coach — Dark Theme

Changed the Interview page from light theme to dark theme to match the rest of the app.

**File:** `src/pages/InterviewPage.jsx`

- Page container: `bg-surface-50` → `bg-[#0D0F18]`
- Header: `bg-white/80` → `bg-[#0D0F18]/80`, `border-surface-200` → `border-[#1F2330]`, title `text-primary-700` → `text-[#3cff14]`, nav `text-surface-800` → `text-[#A4ACBC]`
- Track selection cards: `glass-card` → explicit dark bg `bg-[#151821] border border-[#1F2330]`, icon bg `bg-primary-100` → `bg-[#3cff14]/10`, text `text-surface-900` → `text-white`
- Chat messages: interviewer `bg-white` → `bg-[#151821]`, candidate `bg-primary-500` → `bg-[#3cff14]`, system `bg-surface-100` → `bg-[#151821]`
- Loading indicator: `bg-white` → `bg-[#151821]`, spinner `text-primary-500` → `text-[#3cff14]`
- Input bar: `bg-white/80` → `bg-[#0D0F18]/80`, input `bg-white` → `bg-[#151821]`, border `border-surface-200` → `border-[#1F2330]`
- Back button: Moved further left with `-ml-2`, removed spacer div and `justify-between`

### 13. Delivery Consent & Feedback Report — Dark Theme

Extended dark theme to the camera consent screen and feedback report sections.

**File:** `src/pages/InterviewPage.jsx`

**DeliveryConsentScreen:**
- Icon: `bg-primary-100` → `bg-[#3cff14]/10`, `text-primary-600` → `text-[#3cff14]`
- Title: `text-surface-900` → `text-white`
- Camera checkbox box: checked `border-primary-400 bg-primary-50` → `border-[#3cff14] bg-[#3cff14]/10`, unchecked `border-surface-200 bg-white` → `border-[#1F2330] bg-[#151821]`
- Optional badge: `bg-surface-100` → `bg-[#1F2330]`, `text-surface-800/50` → `text-[#A4ACBC]`
- Unsupported fallback: `glass-card` → `bg-[#151821] border border-[#1F2330]`

**FeedbackReport:**
- All cards: `glass-card` → `bg-[#151821] border border-[#1F2330]`
- Headings: `text-surface-900` → `text-white`
- Body text: `text-surface-800/70` → `text-[#A4ACBC]`
- Score: `text-primary-600` → `text-[#3cff14]`
- Strengths icon: `text-accent-500` → `text-[#4AD8E6]`
- Suggested missions badge: `bg-primary-100 text-primary-700` → `bg-[#3cff14]/10 text-[#3cff14]`
- Restart button: `glass-card text-primary-600` → `bg-[#151821] border-[#1F2330] text-[#3cff14]`

---

### 14. Dark Theme — Career Roadmap & Resume Pages

**Files:**
- `guidify-frontend/src/pages/CareerRoadmap.jsx`
- `guidify-frontend/src/pages/ResumePage.jsx`
- `guidify-frontend/src/components/resume/ResumeFeedback.jsx`

Applied full dark theme across all three pages to match the existing dark design system.

**CareerRoadmap.jsx:**
- Page bg: `bg-surface-50` → `bg-[#0D0F18]`
- Header: `bg-white/80` → `bg-[#0D0F18]/80`, border `border-surface-200` → `border-[#1F2330]`
- Title: `text-primary-700` → `text-[#3cff14]`
- Roadmap title: `text-surface-900` → `text-white`
- Meta text: `text-surface-800/60` → `text-[#A4ACBC]`
- Progress card: `glass-card` → `bg-[#151821] border border-[#1F2330]`
- Progress label: `text-surface-900` → `text-white`
- Progress bar bg: `bg-surface-200` → `bg-[#1F2330]`
- Phase cards: `glass-card` → `bg-[#151821] border border-[#1F2330]`
- Active phase: `border-l-primary-500` → `border-l-[#3cff14]`, `shadow-primary-500/5` → `shadow-[#3cff14]/5`
- Active badge: `bg-primary-50 text-primary-600` → `bg-[#3cff14]/10 text-[#3cff14]`
- Completed badge: `bg-accent-50 text-accent-600` → `bg-[#4AD8E6]/10 text-[#4AD8E6]`
- Skills tags: `bg-primary-50 text-primary-700` → `bg-[#3cff14]/10 text-[#3cff14]`
- Difficulty badges: dark variants (`bg-emerald-900/30 text-emerald-400` etc.)
- Connector line: `bg-accent-300` → `bg-[#4AD8E6]/50`
- Empty state button: `bg-white` → `bg-[#151821]`, `text-surface-800` → `text-[#A4ACBC]`

**ResumePage.jsx:**
- Page bg: `bg-surface-50` → `bg-[#0D0F18]`
- Header: `bg-white/80` → `bg-[#0D0F18]/80`, border `border-surface-200` → `border-[#1F2330]`
- Title: `text-primary-700` → `text-[#3cff14]`
- Icon box: `bg-primary-100` → `bg-[#3cff14]/10`
- Heading: `text-surface-900` → `text-white`
- Body: `text-surface-800/60` → `text-[#A4ACBC]`
- Upload area: `glass-card` → `bg-[#151821] border border-[#1F2330]`
- Drag active: `border-primary-400 bg-primary-50/30` → `border-[#3cff14]/50 bg-[#3cff14]/5`
- File selected: `border-accent-400 bg-accent-50/20` → `border-[#4AD8E6]/50 bg-[#4AD8E6]/5`
- File icon: `bg-accent-100 text-accent-600` → `bg-[#4AD8E6]/10 text-[#4AD8E6]`
- Error: `bg-rose-50 border-rose-200` → `bg-red-900/20 border-red-500/30`, `text-rose-700` → `text-red-300`
- Loading skeletons: `bg-surface-200` → `bg-[#1F2330]`
- Upload new button: `text-primary-600` → `text-[#3cff14]`

**ResumeFeedback.jsx:**
- All cards: `glass-card` → `bg-[#151821] border border-[#1F2330] rounded-xl`
- Score ring bg stroke: `#e5e7eb` → `#1F2330`
- Score number: `text-surface-900` → `text-white`
- Section headers: `text-primary-500` → `text-[#3cff14]`, `text-surface-900` → `text-white`
- Skill tags: `bg-primary-100 text-primary-700` → `bg-[#3cff14]/10 text-[#3cff14]`
- Gap items: `bg-rose-50/50` → `bg-rose-900/20`, `bg-amber-50/50` → `bg-amber-900/20`
- Gap suggestion: `text-primary-600` → `text-[#3cff14]`
- Improvements: `bg-surface-50` → `bg-[#151821]`, `bg-primary-100 text-primary-700` → `bg-[#3cff14]/10 text-[#3cff14]`
- ATS bar: `bg-surface-100` → `bg-[#1F2330]`
- ATS suggestions: `text-primary-600` → `text-[#3cff14]`
- Strengths icon: `text-accent-500` → `text-[#4AD8E6]`

---

### 15. AI Personality Analysis — Speed and UX Overhaul

**Problem:** User sees "Analysing personalisation questions..." for 5-10+ seconds after finishing 5 static questions because AI question generation has not completed. Creates a jarring frozen experience.

**Root cause chain:**
1. AI fetch only started AFTER static questions loaded (wasted ~1s)
2. Backend generated 10 questions via Gemini (~5-8s)
3. When user finished Q5, AI was not ready, causing blocking wait state
4. finishTest had an artificial 2-second setTimeout delay

**Files changed:**

**psychometric_service.py:**
- generate_quiz_questions: Reduced from 10 to 5 questions (halves generation time)
- generate_quiz_questions: Simplified prompt (removed verbose instructions)
- generate_quiz_questions: Upgraded model gemini-2.5-flash-lite to gemini-2.5-flash
- generate_quiz_questions: Reduced validation threshold from 5 to 3 questions
- analyze_personality: Reduced response history cap 20 to 15 entries
- analyze_personality: Simplified prompt to minimal token count
- analyze_personality: Primary model gemini-2.5-flash-lite to gemini-2.5-flash
- analyze_personality: Fallback model gemini-1.5-flash to gemini-2.5-flash-lite

**AdaptivePersonalityTest.jsx:**
- AI fetch now starts IMMEDIATELY on component mount via useRef guard
- Replaced blocking text with animated streaming progress bar (8s fill)
- Added Skip button so user can finish after 5 static questions without waiting
- Progress bar shows true percentage: 0-50% static phase, 50-100% AI phase
- Removed artificial 2-second setTimeout delay in finishTest
- Wrapped handleAnswer in useCallback for performance

---

### 16. Psychometric Profiling — Phase 2 Implementation

**Summary:** Full implementation of validated psychometric profiling layer — Big Five (IPIP-20) personality traits + RIASEC-18 career interest codes. Deterministic scoring (no AI), with one AI narration touchpoint. Enriches roadmap pacing/tone without gating opportunity.

**Backend files created:**
- `app/psychometrics/instruments/ipip.json` — IPIP-20 Big Five instrument config (20 items, 4 per trait, reverse-coding keys)
- `app/psychometrics/instruments/riasec.json` — RIASEC-18 Holland Codes instrument config (18 items, 3 per dimension)
- `app/services/psychometrics_scoring.py` — Deterministic scoring service (pure functions, no AI)
- `app/api/profile_psychometrics.py` — `POST /profile/psychometrics` + `GET /profile/psychometrics/status` endpoints
- `app/ai_gateway/prompts/psychometrics_narrate.py` — `psychometrics.narrate` prompt template v1
- `migrations/007_psychometric_profiles.sql` — DB migration for `psychometric_profiles` table

**Backend files updated:**
- `app/ai_gateway/gateway.py` — Added `psychometrics.narrate` task to TASK_MODEL_MAP and prompt builder
- `app/ai_gateway/prompts/roadmap_generate.py` — Extended to v1.1 with optional psychometric context (pacing_hint, tone_hint)
- `app/main.py` — Registered new `profile_psychometrics` router

**Frontend files created:**
- `src/components/onboarding/PsychometricFitCheck.jsx` — "Quick Fit Check" onboarding step

**Frontend files updated:**
- `src/pages/Onboarding.jsx` — Added PsychometricFitCheck as Step 3

**Wiki docs updated:**
- `prd.md` — FR16 added, success metrics, risk notes, non-goal on opportunity-gating
- `techspec.md` — §11 Psychometrics Module (scoring architecture, narration, constraints)
- `schema.md` — §8.2 `psychometric_profiles` table
- `skills.md` — §9 Psychometric Context cross-reference
- `api.md` — §7 Psychometric Profiling endpoints
- `dataflow.md` — §7 Psychometric Profiling data flow
- `rules.md` — §9 Psychometric Profiling Rules (retake cooldown, non-gating, consent, raw scores)
- `design.md` — §6 Psychometric Assessment UX
- `prompts.md` — §9 `psychometrics.narrate` task
- `architecture.md` — Repo layout + AI Gateway task map updated
- `implementationplan.md` — Phase 2.5 added
- `roadmap.md` — Psychometric Profiling in Horizon 2
