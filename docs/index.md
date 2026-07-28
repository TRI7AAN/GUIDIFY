# GUIDIFY Documentation

**AI-powered personalized learning and career navigation platform.**

GUIDIFY replaces static career roadmaps with adaptive, individualized daily missions powered by AI. Learners receive personalized guidance that evolves with their progress, skills, and goals.

---

## Agent Workflow Protocol

When working on GUIDIFY, follow this sequence:

`
1. Read docs/logs.md           -> Understand build history and recent changes
2. Read docs/remainingtasks.md -> Identify what needs to be done next
3. Read this file (index.md)   -> Navigate to the relevant documentation
4. Read specific docs          -> Implement based on specifications
5. Update docs/logs.md         -> Log all changes made in the session
6. Update docs/remainingtasks.md -> Mark completed tasks, add new ones
`

---

## Documentation Map

| Document | Purpose | When to Read |
|----------|---------|--------------|
| prd.md | Product requirements, goals, and MVP scope | Understanding what to build and why |
| techspec.md | Technology stack, service boundaries, infrastructure | Implementation decisions, tech choices |
| architecture.md | System diagram, component layout, repo structure | Understanding how services interconnect |
| schema.md | Database table definitions, columns, RLS policies | Building DB queries, migrations, Pydantic models |
| api.md | REST endpoint contracts, request/response formats | Building or modifying API endpoints |
| dataflow.md | End-to-end data movement across services | Understanding service interactions |
| rules.md | Business logic, adaptation triggers, compliance rules | Building Rules Engine, roadmap adaptation |
| skills.md | Skill taxonomy, categories, gap analysis model | Skill-related features, resume scoring |
| prompts.md | AI prompt specifications, input/output schemas | Creating or modifying AI Gateway prompts |
| design.md | UX/UI principles, screen layouts, interaction patterns | Building frontend components |
| implementationplan.md | MVP build phases, milestones, timeline | Planning next work items |
| roadmap.md | Post-MVP feature sequencing (Horizons 1-3) | Future feature planning |

---

## Architecture Overview

`
+-----------------------------+
|        React Frontend       |
|  (Vercel) -- TailwindCSS    |
+--------------+--------------+
               | HTTPS (REST, /api/v1)
               v
+-----------------------------+
|      FastAPI Backend        |
|         (Render)            |
|  +------------------------+ |
|  | Auth & Profile Service | |
|  | Resume Service         | |
|  | Roadmap Engine         | |
|  | Mission Engine         | |
|  | Interview Service      | |
|  | Analytics Service      | |
|  | Rules Engine           | |
|  +-----------+------------+ |
|              v              |
|      +---------------+      |
|      |  AI Gateway    |      |
|      +-------+--------+      |
+--------------+--------------+
               v
+-----------------------------+
|   Supabase (PostgreSQL +    |
|   Auth + Storage)           |
+-----------------------------+
`

---

## Code Structure

`
guidify-backend/app/
  api/              # Route modules (auth, resume, roadmap, missions, interview, dashboard)
  ai_gateway/       # Central AI Gateway with prompt templates
    gateway.py      # Task routing, validation, retries
    prompts/        # Versioned prompt templates
  core/             # Config, auth, exceptions, logging
  db/               # Supabase RLS-aware queries
  models/           # Pydantic schemas
  services/         # Business logic
  utils/            # File parsing, helpers

guidify-frontend/src/
  pages/            # Dashboard, Onboarding, CareerRoadmap, ResumePage, InterviewPage
  components/       # Reusable UI components
  contexts/         # React contexts (OnboardingContext)
  lib/              # API client, Supabase client
`

---

## Current Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 -- Foundations | 100% | Auth, AI Gateway, design system |
| Phase 1 -- Profile & Resume | 80% | Resume backend done, feedback view pending |
| Phase 2 -- Roadmap & Missions | 90% | Backend + frontend complete |
| Phase 3 -- Adaptation Engine | 0% | Not started |
| Phase 4 -- Interview Bot | 5% | Placeholder UI only |
| Phase 5 -- Polish & Beta | 0% | Not started |

**Overall MVP: ~72% Complete**

For detailed task status, see remainingtasks.md.
For build history, see logs.md.
