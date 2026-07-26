# GUIDIFY — API Contract

**Version:** 1.0
**Backend:** FastAPI
**Companion to:** `schema.md`, `techspec.md`, `architecture.md`

Base URL (staging/prod set via env): `/api/v1`
Auth: Bearer token (Supabase Auth JWT) on all endpoints except `/health`.
All error responses follow: `{ "error": { "code": string, "message": string } }`.

---

## 1. Auth & Profile

### `POST /auth/onboarding`
Submit onboarding questionnaire.
```
Request: { "segment": "college", "questionnaire_data": {...} }
Response: { "profile_id": "uuid", "onboarding_completed": true }
```

### `GET /profile/me`
Returns the current learner's assembled profile.
```
Response: {
  "learner": {...},
  "profile": { "skills": [...], "interests": [...], "strengths": [...], "weaknesses": [...] }
}
```

### `PATCH /profile/target-role`
Update stated career goal — triggers regeneration per `rules.md` §1.3.
```
Request: { "target_role": "Backend Software Engineer" }
Response: { "roadmap_regeneration_queued": true }
```

---

## 2. Resume

### `POST /resume/upload`
Multipart upload. Returns immediately with a job id; parsing is async.
```
Response: { "resume_id": "uuid", "status": "processing" }
```

### `GET /resume/{resume_id}`
```
Response: {
  "resume_id": "uuid",
  "status": "completed",
  "parsed_data": {...},
  "score": 78,
  "gap_analysis": [ { "skill": "System Design", "gap": 2, "suggestion": "..." } ]
}
```

### `GET /resume/current`
Returns the learner's current (`is_current = true`) resume analysis.

---

## 3. Roadmap

### `GET /roadmap/current`
```
Response: {
  "roadmap_id": "uuid",
  "version": 3,
  "phases": [
    { "id": "uuid", "order_index": 1, "name": "Foundations", "status": "complete", ... },
    { "id": "uuid", "order_index": 2, "name": "Applied Projects", "status": "current", ... }
  ]
}
```

### `GET /roadmap/history`
Returns prior (superseded) versions with `trigger_reason`, for the "why did my roadmap change" changelog (`design.md` §2.3).

### `POST /roadmap/regenerate` (internal/system-triggered; not typically called directly by frontend)
Used by the Rules Engine when a trigger condition (`rules.md` §1) fires. Exposed as an internal endpoint, not part of the public learner-facing surface.

---

## 4. Missions

### `GET /missions/today`
```
Response: {
  "mission_id": "uuid",
  "title": "Build a REST endpoint with FastAPI",
  "objective": "...",
  "estimated_minutes": 45,
  "linked_assessment": {...} | null,
  "status": "pending"
}
```

### `POST /missions/{mission_id}/complete`
```
Request: { "notes": "optional learner reflection" }
Response: { "status": "completed", "next_mission_queued": true }
```

### `POST /missions/{mission_id}/status`
Generic status update for `failed` / `skipped` / `too_hard`.
```
Request: { "status": "too_hard" }
Response: { "status": "too_hard", "remedial_mission_queued": true }
```

---

## 5. Interview

### `POST /interview/session`
Start a new session.
```
Request: { "track": "technical" }
Response: { "session_id": "uuid", "first_question": "..." }
```

### `POST /interview/session/{session_id}/answer`
```
Request: { "answer": "..." }
Response: { "next_question": "..." } | { "status": "completed", "feedback_report": {...} }
```

### `GET /interview/session/{session_id}`
Returns full transcript + feedback report (once completed).

---

## 6. Progress / Dashboard

### `GET /dashboard`
Aggregated view for the home screen.
```
Response: {
  "streak_days": 12,
  "current_phase": "Applied Projects",
  "roadmap_progress_pct": 42,
  "interview_readiness": 61,
  "placement_readiness": 55,
  "skill_graph": [ { "skill": "Python", "level": 3, "target_level": 4 }, ... ]
}
```

---

## 7. Rate Limiting & AI Cost Guardrails

- `/resume/upload`: rate-limited to prevent repeated re-uploads triggering redundant AI Gateway calls (per `techspec.md` §3.3 cost control).
- `/roadmap/regenerate` (internal): enforces the debounce rule from `rules.md` §2 at the API layer, not just in application logic — reject with `409 Conflict` and a `code: "regeneration_debounced"` if called too soon, except for goal-change triggers.
- `/interview/session/*/answer`: capped question count per session (see `techspec.md` §6) enforced server-side, not just in the UI.

---

## 8. Versioning

This is `/api/v1`. Breaking changes (schema changes to response bodies, removed fields) require a `/api/v2` path — additive changes (new optional fields) do not require a version bump.
