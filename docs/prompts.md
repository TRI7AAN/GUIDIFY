# GUIDIFY — AI Prompt Specifications

**Version:** 1.0
**Companion to:** `techspec.md` §3, `skills.md`, `rules.md`

All prompts below are called through the **AI Gateway** (never directly from feature code, per `techspec.md` §2). Every prompt must produce **strict JSON** matching the schema shown, validated by the gateway before being trusted by any service. This doc defines intent and structure; exact wording should be iterated based on real output quality, not treated as final copy.

---

## 1. General Prompting Principles for GUIDIFY

1. **Always constrain skill names to the taxonomy** (`skills.md`) — instruct the model to use normalized skill names and flag anything unrecognized as `"new_skill_candidate"` rather than inventing free text that pollutes the data model.
2. **Always require structured JSON, no prose wrapper.** System prompt must explicitly state: "Respond with ONLY valid JSON matching the schema. No explanation, no markdown fences."
3. **Ground every generation in the learner's actual profile data** — never let the model "assume" a background; pass the relevant profile fields explicitly in context rather than relying on conversation history.
4. **Explain-your-reasoning fields are for the user, not chain-of-thought.** Where a "reason" field is requested (e.g., roadmap changelog), it should be a short user-facing explanation, not internal model reasoning — keep these separate from any debugging/trace data.

---

## 2. `roadmap.generate`

**Purpose:** Produce a phased roadmap from a learner profile (initial generation or regeneration).

**Context passed in:**
- Full Learner Profile (skills w/ levels, interests, target role, segment)
- Skill Gap Analysis output (`skills.md` §5)
- If regeneration: prior roadmap summary + `trigger_reason` (from `rules.md` §1)

**Output schema (conceptual):**
```json
{
  "phases": [
    {
      "order_index": 1,
      "name": "string",
      "objectives": ["string"],
      "target_skills": [{"skill": "string", "target_level": 1-4}],
      "projects": ["string"],
      "resources": ["string"],
      "milestones": ["string"]
    }
  ],
  "changelog_reason": "string (user-facing, only present on regeneration)"
}
```

**Key instruction notes:** Phases must end at "Career Ready" per `GUIDIFY.md` §Personalized Learning Roadmap. Number of phases should scale to the size of the actual skill gap — not a fixed count regardless of learner starting point.

---

## 3. `mission.generate`

**Purpose:** Produce a single next daily mission, scoped to the current phase only (cheap, frequent call — see `techspec.md` §3.3).

**Context passed in:**
- Current phase objectives/target skills (not the full roadmap)
- Last 3 mission outcomes (for difficulty calibration, per `rules.md` §3)
- Flag if this is a remedial mission request (post "Too Hard" x2, per `rules.md` §3)

**Output schema:**
```json
{
  "title": "string",
  "objective": "string",
  "estimated_minutes": "integer",
  "linked_assessment": {"type": "string", "criteria": "string"} | null,
  "target_skill": "string (must match taxonomy, skills.md)"
}
```

**Key instruction notes:** Must be completable in under an hour (per `GUIDIFY.md` "small, achievable daily missions"). If remedial flag is set, mission must be strictly easier than the mission that triggered "Too Hard," not the next sequential step.

---

## 4. `resume.parse`

**Purpose:** Extract structured data from raw resume text.

**Context passed in:** Raw extracted resume text.

**Output schema:**
```json
{
  "skills": [{"name": "string (taxonomy-normalized)", "inferred_level": 1-4, "evidence": "string"}],
  "education": [{"institution": "string", "degree": "string", "year": "string"}],
  "experience": [{"role": "string", "org": "string", "duration": "string", "summary": "string"}],
  "projects": [{"name": "string", "summary": "string", "skills_used": ["string"]}],
  "certifications": [{"name": "string", "issuer": "string", "year": "string"}]
}
```

**Key instruction notes:** `inferred_level` must follow the levels defined in `skills.md` §3 — instruct the model explicitly with the level definitions, don't assume it infers the same scale unprompted.

---

## 5. `resume.score`

**Purpose:** Score + gap analysis against a target role (or general baseline if none set).

**Context passed in:** Parsed resume data (from `resume.parse`) + target role baseline (from `skill_baselines`, per `schema.md` §9) if available.

**Output schema:**
```json
{
  "score": "integer 0-100",
  "summary": "string, one line",
  "gap_analysis": [
    {"skill": "string", "gap_level": "integer", "suggestion": "string, concrete and actionable"}
  ]
}
```

**Key instruction notes:** Per `rules.md` §5, a bare score with no suggestions is invalid output — schema should make `gap_analysis` required with a minimum of 2 entries where any gap exists.

---

## 6. `interview.question`

**Purpose:** Generate the next interview question, contextual to prior answers in the session.

**Context passed in:** Track (technical/HR), learner profile summary, full transcript so far.

**Output schema:**
```json
{
  "question": "string",
  "question_type": "technical" | "behavioral" | "follow_up"
}
```

**Key instruction notes:** Follow-ups should reference specifics from the learner's prior answer (per `GUIDIFY.md` §Interview Bot "Follow-up questions") — the prompt must explicitly instruct the model to reference the previous answer content, not ask generic questions in sequence.

---

## 7. `interview.feedback`

**Purpose:** Generate the post-session feedback report.

**Context passed in:** Full transcript, track, learner profile.

**Output schema:**
```json
{
  "strengths": ["string"],
  "gaps": ["string"],
  "communication_notes": "string",
  "readiness_subscore": "integer 0-100",
  "suggested_missions": [{"title": "string", "target_skill": "string"}]
}
```

**Key instruction notes:** `readiness_subscore` must be framed per `rules.md` §6 — a guidance signal, not a guarantee; the model should avoid absolute language ("you will pass/fail") in `communication_notes`.

---

## 8. Prompt Versioning

Every prompt template stored under `backend/app/ai_gateway/prompts/` (per `architecture.md` §2) should carry a version identifier. When a prompt is materially changed, bump the version and log which version generated any persisted AI output (roadmap, mission, resume analysis) — this matters for debugging quality regressions and for the auditability principle established in `dataflow.md` §2.
