# GUIDIFY — Product Roadmap (Post-MVP)

**Version:** 1.0
**Companion to:** `prd.md`, `implementationplan.md`

This is the *product* roadmap (feature sequencing over quarters), distinct from `implementationplan.md` (the MVP build plan) and distinct from the in-app "learner roadmap" concept described in `GUIDIFY.md`.

---

## Horizon 1 — MVP Validation (Months 1–3)
*Covered in detail by `implementationplan.md`.*
- Core loop: Profile → Roadmap → Daily Missions
- Resume analysis
- Basic mock interview (text-based)
- Beta cohort launch (e.g., campus/community-based, such as an IgniteX-adjacent student base)

**Goal:** Prove the daily-mission loop drives real retention before investing further.

---

## Horizon 2 — Depth & Monetization (Months 4–6)

- **Company-Specific Preparation Tracks** (`GUIDIFY.md` §Company-Specific Preparation) — curated tracks for a handful of high-demand companies/roles, layered on the general roadmap per `rules.md` §8.
- **Premium tier launch** — unlimited mock interviews, full company-track library, priority roadmap regeneration.
- **AI Mentor chat** (P2 in `prd.md`) — free-form "ask anything about my roadmap" surface, likely the highest-leverage low-effort feature once profile/roadmap data is rich enough to ground it well.
- **Interview Bot v2** — voice-based mock interviews, richer behavioral analysis (per `GUIDIFY.md` §Interview Bot: communication analysis, confidence analysis).

---

## Horizon 3 — Segment Expansion (Months 7–9)

- **College Recommendation System** for the school-student segment (`GUIDIFY.md` §College Recommendation System) — this segment has a fundamentally different data model (no resume, different questionnaire, different milestone structure), so it is treated as its own onboarding path rather than bolted onto the college/graduate flow.
- **Working professional track** — upskilling/reskilling and promotion-roadmap logic, distinct phase templates from the student-focused Foundations → Career Ready structure.
- **Multilingual support** — starting with the languages most relevant to the initial user base's geography, leveraging the AI Gateway's provider abstraction (per `techspec.md` §3) to route to models with strong multilingual performance where needed.

---

## Horizon 4 — Platform Maturity (Months 10–12+)

- **Gemma on-device inference** for offline mission access (per `GUIDIFY.md` §10 and `techspec.md` §3.1) — targeted at learners with inconsistent connectivity, a meaningful segment in the target markets.
- **Embedding-based retrieval** (`GUIDIFY.md` §9) — becomes relevant once the resource/content library and skill-baseline data (`skills.md`) are large enough that direct-prompt context is no longer sufficient or cost-efficient.
- **Portfolio-building features** — moving from "prepares you for jobs" toward "helps you build the artifacts that get you jobs" (per `GUIDIFY.md` §12 Future Vision: "Build portfolios").
- **Job application integration** — explored only once the core guidance/prep loop has strong retention data; this is a significant scope expansion (ATS integrations, job board partnerships) and should not be pulled forward prematurely.

---

## Explicitly Deferred / Not Planned for Near-Term

- Native mobile apps — responsive web is sufficient until usage data shows a specific mobile-native need (e.g., push notifications proving necessary for mission reminders that web push cannot satisfy).
- Full "AI Career Operating System" scope (`GUIDIFY.md` §12) is the long-term vision, not a near-term commitment — each horizon above is a deliberate, validated step toward it, not a fixed promise.

---

## Roadmap Review Cadence

This document should be revisited at the end of each horizon against the metrics defined in `prd.md` §8 — features move up or get cut based on what the MVP and Horizon 2 data actually show, not purely on the original vision document's feature list. The vision (`GUIDIFY.md`) is the north star; this roadmap is the negotiated, evidence-driven path toward it.
