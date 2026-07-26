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

## Phase 4 — Interview Bot (Week 10–11)

**Goal:** Second major AI feature live.

- [ ] Interview session flow (technical + HR tracks)
- [ ] Question generation + contextual follow-ups (`interview.question`)
- [ ] Feedback report generation (`interview.feedback`)
- [ ] Interview readiness sub-score feeds dashboard

**Exit criteria:** A user can complete a mock interview and receive a structured feedback report with suggested missions to close gaps.

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
