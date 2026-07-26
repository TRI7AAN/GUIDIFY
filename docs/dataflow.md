# GUIDIFY — Data Flow

**Version:** 1.0
**Companion to:** `techspec.md`, `schema.md`, `api.md`

---

## 1. End-to-End Flow (Signup → Career Ready)

```
User Signup
   │
   ▼
Profile Creation (auth record + empty Learner Profile)
   │
   ▼
Onboarding Questionnaire ──► Learner Profile (partial)
   │
   ▼
Resume Upload ──► Storage ──► Resume Parse (AI Gateway) ──► Learner Profile (enriched)
   │
   ▼
Learner Profile Generation (assembled: questionnaire + resume + inferred fields)
   │
   ▼
AI Analysis (Skill Gap Analysis vs. target role, if set)
   │
   ▼
Roadmap Generation (AI Gateway: roadmap.generate) ──► Roadmap v1 (persisted, versioned)
   │
   ▼
Daily Mission Generator (AI Gateway: mission.generate, scoped to current phase)
   │
   ▼
Dashboard (renders mission, phase, streak, readiness)
   │
   ▼
Progress Tracking (mission completion events logged)
   │
   ▼
Roadmap Update Evaluation (rules.md triggers checked)
   │
   ├── No trigger met ──► next Daily Mission Generator cycle
   │
   └── Trigger met ──► Roadmap Regeneration ──► Roadmap v(n+1) (old version archived, not deleted)
```

This mirrors the AI Workflow in `GUIDIFY.md` §8, expanded with explicit persistence and trigger-evaluation steps.

---

## 2. Event Log (source of truth for adaptation)

Every mission-related and profile-related action is written to an append-only **Event Log** table before any derived state (roadmap, dashboard numbers) is updated. This gives us:
- Auditability (why did the roadmap change on date X?)
- Replayability (regenerate derived aggregates if a bug is found)
- A dataset for future personalization model improvements

Event types (non-exhaustive, see `schema.md` for full enum):
- `mission.completed`, `mission.failed`, `mission.skipped`
- `assessment.failed`, `assessment.passed`
- `resume.uploaded`, `certificate.uploaded`
- `goal.changed`
- `roadmap.regenerated` (system-generated, references the trigger event)
- `interview.session_completed`

---

## 3. Roadmap Regeneration Data Flow (detail)

```
Trigger Event (e.g., goal.changed)
   │
   ▼
Rules Engine evaluates trigger against rules.md thresholds
   │
   ├── Debounce check (has a regeneration happened too recently? — see rules.md §Guardrails)
   │
   ▼
If eligible: Skill Gap Analysis re-run (current profile vs. new/updated target)
   │
   ▼
AI Gateway: roadmap.generate (context = full Learner Profile + prior roadmap summary + trigger reason)
   │
   ▼
New Roadmap version persisted; prior version status → "superseded" (never deleted)
   │
   ▼
Changelog entry created ("Your roadmap updated because...") ──► surfaced in UI (design.md §2.3)
   │
   ▼
Mission Engine re-anchors to new current phase
```

---

## 4. Resume Analysis Data Flow (detail)

```
Resume Upload (PDF/DOCX) ──► Supabase Storage (private bucket)
   │
   ▼
Text Extraction (server-side)
   │
   ▼
AI Gateway: resume.parse ──► structured JSON (skills, education, experience, projects, certifications)
   │
   ▼
Persisted to Learner Profile (resume_data field, versioned by upload)
   │
   ▼
AI Gateway: resume.score ──► score + gap analysis (against target role if set, else general baseline)
   │
   ▼
Event Log: resume.uploaded ──► feeds Roadmap Regeneration evaluation (rules.md)
```

---

## 5. Interview Bot Data Flow

```
Session Start (track selected: technical | HR)
   │
   ▼
AI Gateway: interview.question (context = profile + track + prior answers in session)
   │
   ▼
Learner answers ──► appended to session transcript
   │
   ▼
Loop until N questions or time cap reached
   │
   ▼
AI Gateway: interview.feedback (context = full transcript + profile)
   │
   ▼
Feedback Report persisted ──► Event Log: interview.session_completed
   │
   ▼
Readiness sub-score updated ──► Dashboard
   │
   ▼
Suggested missions from feedback ──► queued into Mission Engine (next mission may reference gaps found)
```

---

## 6. Data Retention & Deletion Flow

- Learner-initiated account deletion must cascade: Learner Profile, Resumes/Storage objects, Roadmap versions, Event Log entries tied to that learner — all removed or anonymized per DPDP Act 2023 obligations (see `rules.md` §Compliance).
- Event Log entries used only in aggregate/anonymized form for product analytics are exempt from cascade-delete if properly anonymized before aggregation — this must be verified with legal review before implementation, not assumed.
