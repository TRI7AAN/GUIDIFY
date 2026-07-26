# GUIDIFY — Skills Taxonomy & Gap Analysis Model

**Version:** 1.0
**Companion to:** `schema.md` (`skill_baselines` table), `rules.md` §4, `prompts.md`

This document defines how "skill" is represented across GUIDIFY, since Skill Gap Analysis, roadmap generation, and resume scoring all depend on a shared, consistent taxonomy — without it, comparisons between a learner's profile and a target role are meaningless.

---

## 1. Why a Taxonomy Is Needed

Free-text skills ("good at coding," "Python", "backend dev") don't compare cleanly. GUIDIFY needs a normalized skill representation so that:
- A resume mentioning "REST APIs" and a target-role baseline requiring "API design" can be matched.
- Progress can be tracked at a skill level across missions, projects, and certificates.
- The dashboard's skill graph (`design.md` §2.7) has consistent axes.

---

## 2. Skill Categories

| Category | Examples |
|---|---|
| **Core Technical** | Programming languages, frameworks, databases |
| **Applied/Domain** | Machine learning, cybersecurity, data engineering, cloud |
| **Engineering Practice** | Version control, testing, system design, debugging |
| **Soft/Professional** | Communication, teamwork, leadership, time management |
| **Academic/Foundational** | DSA, math for CS, core CS theory |
| **Career-Readiness** | Resume quality, interview performance, portfolio strength |

Each skill entity carries: `name` (normalized), `category`, `aliases` (for matching free text — e.g., "JS" → "JavaScript"), and optional `parent_skill` (for hierarchy, e.g., "React" → parent "JavaScript").

---

## 3. Skill Proficiency Levels

To avoid a shallow "has it / doesn't have it" model, each learner-skill pairing carries a level:

| Level | Meaning |
|---|---|
| 0 — None | Not present in profile |
| 1 — Aware | Mentioned/exposed (coursework, brief use) |
| 2 — Applied | Used in at least one real project |
| 3 — Proficient | Multiple projects, or certified, or passed an assessment |
| 4 — Advanced | Depth signals (contest performance, advanced projects, teaching/mentoring others) |

Roadmap objectives target moving a specific skill from its current level to a target level required by the role baseline — this is what makes missions specific rather than generic ("Learn Python" becomes "Move Python: Aware → Applied via a mini-project").

---

## 4. Sources That Populate the Skill Model

| Source | How it maps to skills |
|---|---|
| Resume parsing (`resume.parse`) | Extracts mentioned skills + infers level from project/experience context |
| Questionnaire | Self-reported interests and confidence (used as a *signal*, not ground truth — self-assessment is weighted lower than demonstrated evidence) |
| Mission completions | Successful project-based missions bump level (e.g., Applied → Proficient) |
| Certificates | Certain certificates map directly to a level floor for a skill (e.g., a recognized cert sets minimum "Proficient") |
| Interview feedback | Can surface gaps not visible in resume (e.g., communication weaknesses) |

---

## 5. Target-Role Baselines (`skill_baselines` table)

Each target role or company track defines a required skill set with target levels, e.g.:

```
Role: "Software Engineer - Backend"
Required:
  - Python: Proficient
  - System Design: Applied
  - SQL: Applied
  - REST API Design: Proficient
  - Git: Proficient
  - Communication: Applied
```

Skill Gap Analysis (`rules.md` §4) is simply: for each required skill, `gap = target_level - current_level`. Positive gaps become roadmap objectives, prioritized by largest gap × importance weight (some skills are must-haves, others nice-to-haves — baseline data should carry a weight, not just a level).

---

## 6. Curation & Maintenance

- MVP launches with a small, manually curated set of baselines (a handful of common roles: general SDE, backend, frontend, data/ML — matching the founder's own technical network and initial target user base) rather than trying to cover every possible career from day one.
- Company-specific baselines (Google, Microsoft, Amazon, etc. per `GUIDIFY.md` §Company-Specific Preparation) are added incrementally as a P2 feature — curation quality matters more than breadth here; a wrong baseline actively misleads learners.
- Baseline data should be periodically reviewed against real industry signals (job postings, alumni outcomes) rather than treated as static — stale baselines are a real product risk (per `prd.md` §9 risks).

---

## 7. Relationship to Prompts

The skill taxonomy is not just a database concept — it must be embedded in the AI Gateway prompts (`prompts.md`) so that `resume.parse` and `roadmap.generate` output skills using the *same normalized names*, not free text that then has to be reconciled after the fact. Prompt schemas should constrain skill names to the taxonomy (or explicitly flag new/unrecognized skills for a curation queue) rather than accepting arbitrary strings.
