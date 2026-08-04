# GUIDIFY — Implementation Plan

**Version:** 1.0
**Companion to:** `prd.md`, `techspec.md`, `roadmap.md`

This plan phases the build to reach a demoable MVP fast, then layers in adaptation, interview prep, and monetization. Each phase should end in something a real learner can use end-to-end.

---

## Phase 0 — Foundations (Week 1–2)

**Goal:** Skeleton that deploys, with auth working.

- [ ] Repo setup (frontend + backend, per `architecture.md` layout)
- [ ] Supabase project: Auth, initial schema (Learner, Profile) — see `schema.md`
- [ ] FastAPI skeleton deployed to Render; React skeleton deployed to Vercel
- [ ] AI Gateway module scaffolded (interface only, one Gemini call working end-to-end: "hello world" prompt → JSON response)
- [ ] CI: basic lint + type check on push

**Exit criteria:** A user can sign up, log in, and see an empty dashboard shell.

---

## Phase 1 — Profile & Resume (Week 3–4)

**Goal:** Learner can build a real profile.

- [ ] Onboarding questionnaire UI (multi-step form)
- [ ] Resume upload → Supabase Storage
- [ ] Resume parsing pipeline (`resume.parse` AI Gateway task)
- [ ] Resume scoring + gap analysis (`resume.score`)
- [ ] Learner Profile object assembled from questionnaire + resume (see `schema.md`)

**Exit criteria:** A user uploads a resume and sees an extracted profile + resume score/feedback on screen.

---

## Phase 2 — Roadmap & Daily Missions (Week 5–7)

**Goal:** The core differentiating loop is alive.

- [ ] Roadmap generation (`roadmap.generate`) from Learner Profile → phased roadmap persisted (v1)
- [ ] Roadmap UI (phase view, current phase highlighted)
- [ ] Daily Mission Engine: generate + serve "Today's Mission"
- [ ] Mission completion tracking (mark done / mark failed / mark skipped)
- [ ] Basic regeneration trigger: mission completion velocity feeds into next mission difficulty (simplest version of `rules.md` adaptation logic)

**Exit criteria:** A user gets a roadmap, sees a daily mission, completes it, and gets a new one tomorrow (or immediately in dev/testing mode).

---

## Phase 3 — Adaptation Engine (Week 8–9)

**Goal:** The roadmap actually adapts, not just serves missions sequentially.

- [ ] Full regeneration trigger set implemented (fast completion, assessment failure, goal change, new certificate upload) — per `rules.md`
- [ ] Roadmap versioning + archive (never destructive) — per `schema.md`
- [ ] Skill Gap Analysis service (compares profile vs. target role, feeds roadmap adjustments)
- [ ] Dashboard v1: streak, completed missions, current phase, skill graph (Recharts)

**Exit criteria:** Changing target role or failing an assessment visibly changes the roadmap, and the user can see *why* (change log / "your roadmap updated because...").

---

## Phase 2.5 — Psychometric Profiling (Week 7.5–8)

**Goal:** Enrich roadmap generation with personality and career-interest context, without introducing a blocking dependency on the core roadmap/mission loop.

Sequenced after Phase 2 (Roadmap & Daily Missions) and before Phase 3 (Adaptation Engine) — the roadmap engine must already work without psychometric data before this phase adds the enrichment layer.

### Build checklist
- [ ] Instrument config files: `ipip.json` (Big Five IPIP short-form), `riasec.json` (RIASEC/Holland Codes short-form) — item text + scoring keys, versioned. Optional: `grit.json` (follow-through scale).
- [ ] Deterministic scoring service (`psychometrics_service.py`): pure function, no AI Gateway involvement. Takes raw answers + instrument config, returns numeric scores. Unit-testable against known IPIP/RIASEC scoring examples.
- [ ] Consent flow: separate, explicit, revocable consent step — reuse Delivery Analytics consent pattern for UX/backend consistency.
- [ ] Onboarding UI: optional/skippable "Quick Fit Check" step, framed per `design.md` §6.
- [ ] `psychometrics.narrate` AI Gateway task: wired to run once after scoring completes. Takes numeric scores, returns narrative summary + pacing/tone hints.
- [ ] `POST /profile/psychometrics` and `GET /profile/psychometrics/status` endpoints.
- [ ] `roadmap.generate` context extension: pass narrative + hints when present; confirm generation still works correctly and unchanged when absent.

### Exit criteria
- A learner can complete or skip the assessment.
- If completed, roadmap generation visibly reflects pacing/tone hints (e.g., mission copy tone adjusts).
- If skipped, roadmap generation produces a normal, unaffected roadmap (graceful degradation).
- Raw trait scores are never exposed in any learner-facing API response or UI surface.
- Nothing in generated roadmap or mission copy implies a career path is unsuitable based on psychometric data.

---

## Phase 4 — Interview Bot (Week 10–11)

**Goal:** Second major AI feature live.

- [ ] Interview session flow (technical + HR tracks)
- [ ] Question generation + contextual follow-ups (`interview.question`)
- [ ] Feedback report generation (`interview.feedback`)
- [ ] Interview readiness sub-score feeds dashboard

**Exit criteria:** A user can complete a mock interview and receive a structured feedback report with suggested missions to close gaps.

---

## Phase 4.5 — Delivery Analytics (Week 11.5)

**Goal:** Layer in client-side non-verbal tracking without blocking the core Phase 4 chat flow.

- [ ] Camera opt-in consent flow (strict default-off)
- [ ] Client-side pipeline: MediaPipe tasks + Web Audio integration
- [ ] Metrics aggregator + `POST /interview/session/{session_id}/delivery-metrics` endpoint
- [ ] Dashboard trends UI + update Interview Feedback UI to show delivery section

**Exit criteria:** A user who opts in sees delivery metrics in their feedback report and dashboard, without noticeable latency during the interview itself.

---

## Phase 5 — Polish, Metrics, Beta Launch (Week 12–13)

- [ ] Success metrics instrumentation (see `prd.md` §8) — retention, completion rate, thumbs up/down on regeneration
- [ ] Error states, empty states, loading states across all flows
- [ ] Security pass: RLS policies audited, signed URL expiry checked, DPDP compliance checklist (`rules.md`)
- [ ] Closed beta with a real cohort (e.g., IgniteX member base) for qualitative feedback before wider launch

**Exit criteria:** Beta cohort using the product daily; metrics dashboard live.

---

## Post-MVP (see `roadmap.md` for full detail)

- Company-specific preparation tracks (P2)
- College recommendation system (school-student segment)
- AI Mentor free-form chat
- Voice-based mock interviews
- Multilingual support
- Gemma on-device inference for offline missions

---

## Sequencing Principles

1. **Profile → Roadmap → Mission is the critical path.** Nothing else matters if this loop isn't excellent. Resist the temptation to build interview bot or college recommendations before this loop is validated with real users.
2. **Every AI feature ships behind the AI Gateway** (per `techspec.md`) from day one, even if only one provider exists — retrofitting this later is expensive.
3. **Versioned, non-destructive data first.** Roadmap versioning must exist before adaptation logic ships, or early adaptation bugs will silently corrupt user history.
4. **Instrument before you scale.** Metrics from `prd.md` §8 must be wired in Phase 2, not bolted on in Phase 5 — you need Phase 2/3 data to know if adaptation is actually working.
