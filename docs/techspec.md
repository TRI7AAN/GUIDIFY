# GUIDIFY — Technical Specification

**Version:** 1.0
**Companion to:** `prd.md`, `architecture.md`, `schema.md`, `api.md`

---

## 1. Stack Overview

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + TailwindCSS + Shadcn UI + Recharts | Recharts for skill graph / progress dashboards |
| Backend | FastAPI (Python) | Async, typed with Pydantic |
| Database | Supabase PostgreSQL | Row-Level Security (RLS) for per-learner data isolation |
| Auth | Supabase Auth | Email + OAuth (Google) |
| AI | Gemini (primary), Gemma (future on-device/offline) | Abstracted behind an internal `AIProvider` interface |
| Storage | Supabase Storage | Resumes, certificates, generated reports |
| Deployment | Vercel (frontend), Render (backend) | Matches existing team deployment pattern (VeriFasal, CROPIC) |

This mirrors stack choices already proven in the founder's other projects (VeriFasal: Vercel + Render; CROPIC: FastAPI + React), reducing operational risk.

---

## 2. Service Boundaries

GUIDIFY backend is organized as a modular monolith on FastAPI (not microservices at MVP — team size and timeline don't justify the operational overhead). Modules:

1. **Auth & Profile Service** — signup, onboarding questionnaire, profile CRUD.
2. **Resume Service** — upload, parse, extract, score.
3. **Roadmap Engine** — phase generation, regeneration triggers, versioning.
4. **Mission Engine** — daily mission generation and serving, completion tracking.
5. **Interview Service** — mock interview session, question generation, feedback report.
6. **Analytics/Progress Service** — dashboard aggregation (streaks, skill graph, readiness score).
7. **AI Gateway** — single internal module that all other services call into for any LLM interaction (never call Gemini directly from feature code). Centralizes prompt versioning, retries, cost logging, and provider abstraction (Gemini today, Gemma for on-device later).

Rationale for the AI Gateway: every AI-dependent feature (roadmap, missions, resume, interview) needs consistent retry/fallback behavior and cost tracking. Centralizing this avoids five different ad-hoc integrations.

---

## 3. AI Architecture

### 3.1 Provider abstraction
```
AIProvider (interface)
 ├── GeminiProvider (default, cloud)
 └── GemmaProvider (future, on-device/offline use cases)
```
Feature services call `ai_gateway.generate(task_type, context)` — they never know which model is behind it. This lets us swap models per task (e.g., cheaper model for daily mission text, stronger model for full roadmap generation) without touching feature code.

### 3.2 Task types routed through the gateway
- `roadmap.generate` — full or partial roadmap generation (expensive, infrequent)
- `mission.generate` — next daily mission (cheap, frequent — should use a lighter prompt/model)
- `resume.parse` / `resume.score`
- `interview.question` / `interview.feedback`
- `mentor.chat` (P2)

### 3.3 Cost control
- **Roadmap regeneration is NOT triggered on every event.** It runs against the rules in `rules.md` (debounced, batched signals) so a single mission completion doesn't cause a full re-generation.
- Daily mission generation reuses the current roadmap phase context (small prompt) rather than re-sending the entire learner profile every time.
- Resume parsing runs once per upload, cached; re-parsing only on re-upload.
- All AI Gateway calls are logged with token counts for cost dashboards.

### 3.4 Structured outputs
All AI Gateway calls that feed the UI (roadmap phases, missions, resume scores, interview feedback) require the model to return **strict JSON** matching a Pydantic schema. The gateway validates and retries once on schema failure before surfacing an error. See `prompts.md` for the exact system prompts and schemas.

---

## 4. Roadmap & Mission Data Model (conceptual)

- A **Roadmap** belongs to a Learner and has a `version` and `status` (active/superseded).
- A Roadmap contains ordered **Phases** (Phase 1 → Career Ready, per `GUIDIFY.md` §Major Features).
- Each Phase contains **Objectives**, target **Skills**, **Projects**, **Resources**, and **Milestones**.
- **Missions** are generated day-by-day against the *current* phase — missions are not pre-generated for the whole roadmap up front (this keeps generation cheap and allows adaptation).
- Regeneration creates a **new Roadmap version**; the old version is archived, never deleted (auditability — see `rules.md` and `schema.md`).

Full schema in `schema.md`.

---

## 5. Resume Parsing Pipeline

1. Upload (PDF/DOCX) → Supabase Storage.
2. Text extraction (server-side; PDF via text-extraction library, DOCX via python-docx-equivalent).
3. AI Gateway call (`resume.parse`) → structured extraction: skills, education, experience, projects, certifications.
4. AI Gateway call (`resume.score`) → score + gap analysis against learner's stated target role (if set) or general industry baseline (if not).
5. Result persisted to Learner Profile; triggers a roadmap re-evaluation check (per `rules.md`).

---

## 6. Interview Bot (MVP scope)

- **Format:** Text-based chat interview (voice is post-MVP).
- **Tracks:** Technical (role/skill-specific question bank + AI follow-ups) and HR/Behavioral.
- **Flow:** fixed opening question → AI generates contextual follow-ups based on the learner's answer → session ends after N questions or time cap → feedback report generated (`interview.feedback` task).
- **Feedback report** includes: strengths, gaps, suggested missions to close gaps, and a readiness sub-score that feeds the dashboard.

---

## 7. Security & Privacy

- Supabase RLS: every table with learner data scoped by `auth.uid()`.
- Resumes and certificates stored in private Supabase Storage buckets; signed URLs only, short expiry.
- No resume/profile data used to train external models beyond the inference call itself (no fine-tuning on user data without explicit consent — flag for legal review before any such feature).
- DPDP Act 2023 compliance requirements tracked in `rules.md` §Compliance.

---

## 8. Environments

- **Local dev:** Supabase local emulator or dev project; FastAPI with hot reload; React dev server.
- **Staging:** Render (backend) + Vercel preview deployments, connected to a staging Supabase project.
- **Production:** Render (backend), Vercel (frontend), production Supabase project with backups enabled.

---

## 9. Open Technical Decisions

- Exact resume-parsing library choice (pure-LLM extraction vs. hybrid rule-based + LLM) — recommend starting LLM-first for speed to MVP, add rule-based validation later if extraction quality is inconsistent.
- Whether Mission Engine pre-generates 1 day ahead (smoother UX) or generates on-demand at midnight rollover (simpler, cheaper) — recommend on-demand with a loading state for MVP.
- Embedding-based retrieval (per `GUIDIFY.md` §9) is explicitly deferred — not needed until the resource/content library grows large enough that retrieval (vs. direct prompt context) becomes necessary.
