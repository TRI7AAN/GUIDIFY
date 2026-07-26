# GUIDIFY — Business Logic & Rules

**Version:** 1.0
**Companion to:** `dataflow.md`, `techspec.md`

This document defines the concrete rules governing roadmap adaptation, mission difficulty, and compliance — the logic referenced but not detailed elsewhere.

---

## 1. Roadmap Regeneration Triggers

Per `GUIDIFY.md` §Dynamic AI Roadmap, four trigger categories exist. Each has a concrete rule below.

### 1.1 Completes projects faster than expected → roadmap advances
- **Condition:** Learner completes ≥ 3 consecutive missions in less than 50% of the estimated time AND passes any associated assessment.
- **Action:** Advance mission difficulty within the current phase first (cheap). Only trigger a full phase-skip / roadmap regeneration if this pattern holds for a full phase's worth of missions.

### 1.2 Fails assessments → roadmap revises
- **Condition:** Learner fails the same assessment twice, or fails ≥ 2 assessments within the current phase.
- **Action:** Insert remedial missions before the next assessment attempt. Do **not** immediately regenerate the whole roadmap — first attempt a targeted insertion. Full regeneration only if remedial missions are also failed.

### 1.3 Changes career goal → full regeneration
- **Condition:** Learner explicitly changes target role/career in profile settings.
- **Action:** Immediate full roadmap regeneration (this is the one case where a full regenerate is always correct — the destination changed, so the path must).

### 1.4 Uploads new certificate/credential → roadmap updates
- **Condition:** New certificate uploaded that maps to a skill already in or adjacent to the current roadmap.
- **Action:** Update Skill Gap Analysis; if the certificate closes a gap that was driving current-phase missions, skip those missions and advance to the next objective. Do not fully regenerate — this is an update, not a goal change.

---

## 2. Guardrails Against Regeneration Thrash

- **Debounce window:** No more than one full roadmap regeneration per learner per 24 hours, except for explicit goal changes (§1.3), which always take priority and bypass the debounce.
- **Minimum mission history:** A newly generated roadmap (version N) must have at least 3 completed or attempted missions logged before any non-goal-change trigger (§1.1, §1.2, §1.4) can cause version N+1. This prevents oscillation on a fresh roadmap.
- **Always additive to history:** No roadmap version is ever deleted. Every regeneration is a new version with a changelog entry citing the trigger event (see `dataflow.md` §2).

---

## 3. Daily Mission Generation Rules

- Missions are generated one at a time, scoped to the current phase — never the whole roadmap at once (cost + adaptability, per `techspec.md` §3.3).
- A mission must include: title, estimated time, objective, and (where applicable) a linked assessment or mini-project.
- Mission difficulty adjusts incrementally (small steps) based on the last 3 mission outcomes — large difficulty jumps are avoided to prevent frustration or boredom swings.
- If a learner marks a mission "Too Hard" twice in a row, the next mission must be a remedial/simpler variant, not the next sequential mission.

---

## 4. Skill Gap Analysis Rules

- Runs whenever: profile changes materially (new resume, new certificate), target role changes, or on a scheduled weekly basis as a background refresh.
- Compares current Learner Profile skills against a target-role skill baseline (curated per role/company where available — see `techspec.md` §Company-Specific Preparation as a P2 feature — else a general industry baseline).
- Output feeds both roadmap regeneration decisions (§1) and the Resume Analysis gap list.

---

## 5. Resume Scoring Rules

- Score is relative to the learner's stated target role if one exists; otherwise scored against a general early-career baseline for their field.
- Score must always be paired with at least 2 concrete, actionable improvement suggestions — a bare number without explanation is not acceptable output (enforced at the prompt/schema level, see `prompts.md`).

---

## 6. Interview Readiness Scoring

- Readiness sub-score is derived from: mock interview feedback reports (most recent weighted higher) + roadmap phase progress (are placement-readiness milestones complete) + resume score.
- Readiness score is a guidance signal only — never presented as a guarantee of interview outcome. UI copy must reflect this (see `design.md` §5, tone of voice).

---

## 7. Compliance Rules (India DPDP Act 2023)

- Resume and profile data are personal data under the Act — explicit consent must be captured at upload/questionnaire time, not assumed from account signup alone.
- Learners must be able to request data export and full account/data deletion (see `dataflow.md` §6 cascade-delete flow).
- No resume/profile data is used to train or fine-tune any model without separate, explicit, revocable consent — this is a hard rule, not a default-on setting.
- Data processing location and any cross-border transfer (if using a non-India-hosted AI provider) must be disclosed in the privacy policy — flag for legal review before launch, this doc does not constitute legal sign-off.

---

## 8. Company-Specific Preparation Rules (P2, forward-looking)

- Company tracks are curated content (skills, interview patterns, common questions) layered on top of the general roadmap — they do not replace the core phased roadmap, they specialize it.
- A company track can only be "completed" if the underlying general skills it depends on are also marked complete in the core roadmap — prevents learners from skipping fundamentals to chase a company badge.
