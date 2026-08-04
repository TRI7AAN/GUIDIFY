# GUIDIFY — System Architecture

**Version:** 1.0
**Companion to:** `techspec.md`, `api.md`, `schema.md`

---

## 1. High-Level Architecture Diagram (textual)

```
┌─────────────────────────────┐
│        React Frontend       │
│  (Vercel) — Tailwind+Shadcn │
└──────────────┬───────────────┘
               │ HTTPS (REST, /api/v1)
               ▼
┌─────────────────────────────┐
│      FastAPI Backend        │
│         (Render)            │
│  ┌────────────────────────┐ │
│  │ Auth & Profile Service │ │
│  │ Resume Service         │ │
│  │ Roadmap Engine         │ │
│  │ Mission Engine         │ │
│  │ Interview Service      │ │
│  │ Analytics Service      │ │
│  │ Rules Engine           │ │
│  └───────────┬────────────┘ │
│              │              │
│              ▼              │
│      ┌───────────────┐      │
│      │  AI Gateway   │      │
│      └───────┬───────┘      │
└──────────────┼──────────────┘
               │
   ┌───────────┼────────────┐
   ▼                        ▼
┌─────────┐          ┌──────────────┐
│ Gemini  │          │ Gemma        │
│ (cloud) │          │ (future, on- │
│         │          │ device)      │
└─────────┘          └──────────────┘

               │
               ▼
┌─────────────────────────────┐
│   Supabase (PostgreSQL +    │
│   Auth + Storage)           │
└─────────────────────────────┘
```

---

## 2. Repository Layout

```
GUIDIFY/
├── frontend/                     # React app (Vercel)
│   ├── src/
│   │   ├── components/           # Shadcn-based UI components
│   │   ├── pages/                # Dashboard, Roadmap, Mission, Resume, Interview
│   │   ├── hooks/
│   │   ├── lib/                  # API client, Supabase client
│   │   │   ├── delivery-analytics/       # NEW — client-side CV/audio pipeline
│   │   │   │   ├── face-pose-tracker.ts  # MediaPipe Face/Pose wrapper
│   │   │   │   ├── audio-prosody.ts      # Web Audio-based pacing/pause detection
│   │   │   │   └── metrics-aggregator.ts # combines raw signals into the final metrics payload
│   │   └── charts/               # Recharts skill graph, progress charts
│   └── package.json
│
├── backend/                      # FastAPI app (Render)
│   ├── app/
│   │   ├── main.py
│   │   ├── api/                  # route modules matching api.md sections
│   │   │   ├── auth.py
│   │   │   ├── resume.py
│   │   │   ├── roadmap.py
│   │   │   ├── missions.py
│   │   │   ├── interview.py
│   │   │   └── dashboard.py
│   │   ├── services/             # business logic, one per module in techspec.md §2
│   │   │   ├── roadmap_engine.py
│   │   │   ├── mission_engine.py
│   │   │   ├── resume_service.py
│   │   │   ├── interview_service.py
│   │   │   └── rules_engine.py
│   │   ├── ai_gateway/           # provider abstraction (techspec.md §3)
│   │   │   ├── gateway.py
│   │   │   ├── providers/
│   │   │   │   ├── gemini.py
│   │   │   │   └── gemma.py
│   │   │   └── prompts/          # versioned prompt templates, see prompts.md
│   │   ├── models/               # Pydantic schemas
│   │   ├── db/                   # Supabase client, RLS-aware queries
│   │   └── core/                 # config, auth middleware, logging
│   └── requirements.txt
│
└── docs/                          # this documentation set
```

---

## 3. Request Lifecycle Example (Daily Mission Fetch)

1. Frontend calls `GET /missions/today` with Supabase JWT.
2. FastAPI auth middleware validates JWT, extracts `learner_id`.
3. `Mission Engine` service checks: does a mission for today already exist for this learner?
   - If yes → return it directly (no AI call, fast path).
   - If no → fetch current active roadmap phase → call `AI Gateway.generate("mission.generate", context)` → persist new mission → return it.
4. Response serialized per `api.md` §4 schema.

This fast-path-first design keeps the common case (mission already generated) cheap and instant, and only invokes AI generation on the boundary case (new day rollover).

---

## 4. Deployment Topology

| Environment | Frontend | Backend | Database |
|---|---|---|---|
| Local | Vite dev server | Uvicorn (hot reload) | Supabase local / dev project |
| Staging | Vercel preview | Render (staging service) | Supabase staging project |
| Production | Vercel production | Render (production service) | Supabase production project (backups enabled) |

CI/CD: push to `main` → staging auto-deploy; tagged release → production deploy (manual approval gate recommended given AI cost implications of bugs in the Rules Engine).

---

## 5. Scaling Considerations (post-MVP)

- **AI Gateway** is the natural first bottleneck under load (rate limits, latency) — designed as a separately scalable module so it can be extracted into its own service later without touching feature code (interfaces already decoupled per `techspec.md` §2).
- **Mission Engine fast path** (§3 above) means most traffic never touches the AI provider at all — this is the key lever for cost/latency at scale, not infrastructure horizontal scaling.
- Supabase Postgres should handle MVP-to-early-growth scale comfortably; read replicas / connection pooling (e.g., PgBouncer, which Supabase provides) become relevant only past meaningful concurrent user counts — not a Day 1 concern.
- If/when Gemma on-device inference (§`techspec.md` §3.1) ships, it primarily affects the Mission Engine's offline/low-connectivity path — architecturally isolated behind the same `AIProvider` interface, so no other service needs to change.
- **Delivery Analytics** is unusual among GUIDIFY's features in that it scales with *zero* additional backend or AI-provider cost per user — it's a pure client-compute feature. It should not appear as a line item in AI cost-scaling discussions; the only backend cost is trivial metrics-row storage.
