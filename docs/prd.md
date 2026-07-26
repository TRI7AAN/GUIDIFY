# GUIDIFY — Product Requirements Document (PRD)

**Version:** 1.0
**Status:** Draft for Founding Team Review
**Owner:** Product / Founder

---

## 1. Summary

GUIDIFY is an AI-powered personalized learning and career navigation platform. It replaces static, one-size-fits-all roadmaps with a continuously adapting, individual roadmap built from a learner's real academic history, skills, projects, resume, and goals — broken down into daily, executable missions.

This PRD defines what we are building for v1 (MVP), why, for whom, and how we will know it worked.

---

## 2. Problem

Learners across school, college, fresh-graduate, and working-professional stages face the same core failure: guidance is generic, scattered across many disconnected platforms, and does not adapt as the learner changes. This causes wasted time on irrelevant skills, unclear next steps, and poor interview/placement readiness.

See `GUIDIFY.md` (source vision doc) for the full problem framing. This PRD scopes that vision into a buildable product.

---

## 3. Goals

### 3.1 Product goals (MVP)
1. Let a learner create a profile (resume + questionnaire) and receive a personalized roadmap within minutes of signup.
2. Break the roadmap into daily missions that are small enough to complete in under an hour.
3. Adapt the roadmap automatically when the learner completes, fails, or skips missions.
4. Provide resume analysis with concrete, actionable feedback.
5. Provide a basic AI mock-interview flow (technical + HR) with a feedback report.

### 3.2 Business goals
- Validate willingness-to-pay for a premium tier (company-specific prep, unlimited mock interviews).
- Build a defensible data asset: learner profile + progress history that improves personalization over time.
- Establish GUIDIFY as the primary daily habit for career-anxious students (daily mission = daily open rate).

### 3.3 Non-goals (MVP)
- Full job-application / ATS integration.
- Marketplace of paid courses or instructors.
- Multi-language support beyond English (stretch, not MVP).
- Native mobile apps (MVP is responsive web only).

---

## 4. Target Users & Personas

See `GUIDIFY.md` §6 for full segment breakdown. MVP prioritizes, in order:

1. **College students (Primary)** — need a learning roadmap + internship/placement prep. Highest engagement potential, easiest to reach via campus clubs/communities (e.g. IgniteX-style student networks).
2. **Fresh graduates (Secondary)** — need company-specific prep and interview practice. Highest willingness-to-pay.
3. **School students (Tertiary, post-MVP)** — need stream/college guidance. Different data model (no resume), deprioritized until core loop is validated.
4. **Working professionals (Post-MVP)** — upskilling/reskilling. Requires different content depth; out of scope for v1.

---

## 5. User Stories (MVP scope)

**Onboarding**
- As a new learner, I can sign up and complete a guided questionnaire about my background, goals, and interests.
- As a new learner, I can upload my resume and have it parsed automatically so I don't re-enter data.

**Roadmap**
- As a learner, I receive a phased roadmap (Phase 1 → Career Ready) generated from my profile.
- As a learner, I see a single "Today's Mission" front and center so I never have to guess what to do next.
- As a learner, when I complete a mission, the system marks progress and immediately queues the next mission.
- As a learner, if I fail an assessment or mark a mission as "too hard," my roadmap adjusts (slows down / revises).
- As a learner, if I change my target career/role, my roadmap regenerates around the new goal.

**Resume**
- As a learner, I can upload/re-upload my resume and get a score, extracted skills, and improvement suggestions.

**Interview Prep**
- As a learner, I can start a mock interview (technical or HR) and answer questions from an AI interviewer.
- As a learner, I receive a feedback report after the mock interview (strengths, gaps, suggested next missions).

**Progress**
- As a learner, I can see my streak, completed missions, current phase, and an overall readiness score on a dashboard.

---

## 6. Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR1 | Signup/auth (email + OAuth) | P0 |
| FR2 | Onboarding questionnaire (multi-step form) | P0 |
| FR3 | Resume upload + parsing (skills, education, experience extraction) | P0 |
| FR4 | Learner profile object (structured, versioned) | P0 |
| FR5 | AI roadmap generation (phased, from profile) | P0 |
| FR6 | Daily Mission Engine (generate, serve, track completion) | P0 |
| FR7 | Roadmap adaptation triggers (completion speed, failure, goal change, new certificate) | P0 |
| FR8 | Resume scoring + gap analysis | P0 |
| FR9 | AI mock interview (text-based, technical + HR tracks) | P1 |
| FR10 | Interview feedback report | P1 |
| FR11 | Progress dashboard (streak, phase, skill graph) | P1 |
| FR12 | Company-specific prep track (curated skill/question sets per company) | P2 |
| FR13 | College recommendation system (school-student segment) | P2 (post-MVP) |
| FR14 | AI Mentor chat (ask-anything about roadmap) | P2 |

Full technical decomposition lives in `techspec.md`; sequencing lives in `implementationplan.md`.

---

## 7. Non-Functional Requirements

- **Latency:** Roadmap generation ≤ 15s perceived (streamed/progressive UI acceptable). Daily mission fetch ≤ 1s.
- **Reliability:** Roadmap state must never be lost on regeneration — always versioned, never destructively overwritten.
- **Privacy:** Resume and profile data are sensitive personal data (India DPDP Act 2023 applies) — see `rules.md`.
- **Cost control:** AI calls must be batched/cached where possible; daily mission generation should not require a full re-analysis of the entire profile every time.
- **Auditability:** Every roadmap change must be traceable to a trigger event (see `dataflow.md`).

---

## 8. Success Metrics

| Metric | Target (90 days post-launch) |
|---|---|
| D1 → D7 retention | ≥ 35% |
| Daily mission completion rate | ≥ 50% of active users |
| Roadmap regeneration satisfaction (thumbs up/down) | ≥ 70% positive |
| Resume analysis → roadmap adoption | ≥ 60% of resume uploaders continue to roadmap |
| Mock interview completion rate | ≥ 25% of eligible users try it once |

---

## 9. Risks & Open Questions

- **AI cost at scale:** Gemini/Gemma calls per learner per day must be modeled before pricing is finalized (see `techspec.md` §Cost).
- **Cold-start personalization:** With no history, first roadmap depends heavily on questionnaire + resume quality — needs strong prompt design (see `prompts.md`).
- **Scope creep:** The full vision (college recommendations, company-specific tracks, multilingual) is large; MVP must resist building all of it at once — see `implementationplan.md` phasing.
- **Regeneration thrash:** Need guardrails so a single bad assessment doesn't cause a full roadmap rewrite every time (see `rules.md`).

---

## 10. Related Documents

- `GUIDIFY.md` — original vision/source document
- `techspec.md` — architecture and stack decisions
- `implementationplan.md` — phased build plan
- `dataflow.md` — data flow across onboarding → roadmap → mission loop
- `rules.md` — business logic and adaptation rules
- `schema.md` — database schema
- `api.md` — API contract
- `design.md` — UX/UI principles
- `roadmap.md` — product roadmap (post-MVP phases)
