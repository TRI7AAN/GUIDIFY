# GUIDIFY Documentation

**AI-powered personalized learning and career navigation platform.**

GUIDIFY replaces static career roadmaps with adaptive, individualized daily missions powered by AI. Learners receive personalized guidance that evolves with their progress, skills, and goals.

---

## Agent Entry Point

**Start here:** `../AGENTS.md` — Contains personality, current state, architecture map, and navigation guide.

This file (`wiki/index.md`) is the detailed documentation index for deep-dives.

---

## Agent Workflow Protocol

When working on GUIDIFY, follow this sequence:

```
1. Read AGENTS.md              → Load personality + current state
2. Read wiki/logs.md           → Understand build history
3. Read wiki/remainingtasks.md → Identify next task
4. Read relevant wiki/ docs    → Implement based on specifications
5. Update wiki/logs.md         → Log all changes
6. Update wiki/remainingtasks.md → Mark completed, add new
```

---

## Documentation Map

| Document | Purpose | When to Read |
|----------|---------|--------------|
| prd.md | Product requirements, goals, and MVP scope | Understanding what to build and why |
| techspec.md | Technology stack, service boundaries, infrastructure | Implementation decisions, tech choices |
| architecture.md | System diagram, component layout, repo structure | Understanding how services interconnect |
| schema.md | Database table definitions, columns, RLS policies | Writing DB queries, migrations, Pydantic models |
| api.md | REST endpoint contracts, request/response formats | Building or modifying API endpoints |
| dataflow.md | End-to-end data movement across services | Understanding service interactions |
| rules.md | Business logic, adaptation triggers, compliance rules | Building Rules Engine, roadmap adaptation |
| skills.md | Skill taxonomy, categories, gap analysis model | Skill-related features, resume scoring |
| prompts.md | AI prompt specifications, input/output schemas | Creating or modifying AI Gateway prompts |
| design.md | UX/UI principles, screen layouts, interaction patterns | Building frontend components |
| implementationplan.md | MVP build phases, milestones, timeline | Planning next work items |
| roadmap.md | Post-MVP feature sequencing (Horizons 1-3) | Future feature planning |
| logs.md | Build history, session changes | Understanding what was done |
| remainingtasks.md | Current status, what's next | Identifying next task |

---

## Architecture Overview

```
Frontend (React, Vercel)
    ↓ /api/v1
Backend (FastAPI, Render)
    ├── api/          → Route handlers
    ├── ai_gateway/   → Central AI (Gemini)
    ├── services/     → Business logic
    ├── db/           → Supabase queries
    ├── models/       → Pydantic schemas
    └── core/         → Auth, config, exceptions
    ↓
Supabase (PostgreSQL + Auth + Storage)
```

---

## Code Structure

```
guidify-backend/
  app/
    api/                # Route modules (7 active)
      auth.py           # Onboarding, profile, target role
      resume.py         # Upload, parse, score, retrieve
      roadmap.py        # Current, history, regenerate
      missions.py       # Today, complete, status
      interview.py      # Start session, answer, get transcript
      dashboard.py      # Aggregated home view
      adaptation.py     # Event logging, skill gap, trigger
    ai_gateway/         # Central AI Gateway
      gateway.py        # Task routing, validation, retries
      prompts/          # Versioned prompt templates (6)
        roadmap_generate.py
        mission_generate.py
        resume_parse.py
        resume_score.py
        interview_question.py
        interview_feedback.py
    core/               # Config, auth, exceptions, logging
    db/                 # Supabase RLS-aware queries
    models/             # Pydantic schemas
    services/           # Business logic (rules_engine.py active)
    utils/              # File parsing, helpers
    middleware/          # Error handler, auth
  migrations/           # SQL schema (6 applied)
    001_phase0_learners.sql
    002_roadmaps.sql
    003_missions.sql
    004_resumes.sql
    005_event_log.sql
    006_interviews.sql

guidify-frontend/
  src/
    pages/              # 10 pages
      Dashboard.jsx, Onboarding.jsx, CareerRoadmap.jsx,
      ResumePage.jsx, InterviewPage.jsx, LandingPage.jsx,
      LoginPage.jsx, RegisterPage.jsx, AuthCallback.jsx, NotFound.jsx
    components/
      dashboard/        # AdaptationAlertBanner, MissionCard, SkillGraph, SkillsRadar, RoadmapTimeline
      resume/           # ResumeFeedback
      onboarding/       # CareerGoalsForm, etc.
      auth/             # Auth-related components
      layout/           # Layout wrappers
      ui/               # Shared UI primitives
    contexts/           # React contexts (OnboardingContext, AuthContext)
    lib/                # API client (api.js), Supabase client
    hooks/              # Custom React hooks
```

---

## Current Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 -- Foundations | 100% | Auth, AI Gateway, design system, `learners` table sync |
| Phase 1 -- Profile & Resume | 100% | Upload, parse, score, feedback view |
| Phase 2 -- Roadmap & Missions | 100% | Backend + frontend complete |
| Phase 3 -- Adaptation Engine | 100% | Backend + frontend (alerts + skill graph) |
| Phase 4 -- Interview Bot | 100% | Backend + frontend (chat UI + feedback report) |
| Phase 4.5 -- Delivery Analytics | 100% | MediaPipe WASM non-verbal tracking + audio prosody |
| Phase 5 -- Polish & Beta | 90% | DPDP consent, ErrorBoundary rewrite, RLS audit, deployment configs ready |

**Overall MVP: ~98% Complete (Deploy Ready)**

---

## Supabase Database

| Table | RLS | Purpose |
|-------|-----|---------|
| `learners` | ✅ | Core identity, linked to auth.users |
| `learner_profiles` | ✅ | Assembled profile (skills, interests, resume data) |
| `roadmaps` | ✅ | Versioned career roadmaps with phases JSONB |
| `daily_missions` | ✅ | Daily tasks with status tracking |
| `resumes` | ✅ | Upload history, parsed data, scores |
| `event_log` | ✅ | Append-only adaptation events |
| `interview_sessions` | ✅ | Interview transcripts and feedback |
| `skill_baselines` | ❌ | Reference data (shared, not user-scoped) — 5 roles seeded |

**Storage:** `resumes` bucket (private, learner-isolated RLS)

For detailed task status, see remainingtasks.md.
For build history, see logs.md.
