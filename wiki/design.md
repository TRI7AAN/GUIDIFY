# GUIDIFY — Design Principles (UX/UI)

**Version:** 1.0
**Stack:** React + TailwindCSS + Shadcn UI + Recharts

---

## 1. Design Philosophy

GUIDIFY's core promise is: **you never have to guess what to do next.** Every screen should reinforce this. The design should feel less like a course catalog and more like a single, calm, daily checklist with a sense of forward motion.

Guiding principles:
1. **One clear next action, always.** The home/dashboard view leads with "Today's Mission" — not a wall of options.
2. **Progress should be visible and emotionally rewarding**, without becoming gamification-for-its-own-sake (no dark patterns, no anxiety-inducing streak-loss guilt messaging).
3. **Complexity is hidden until asked for.** The roadmap has depth (phases, skills, resources) but the default view is shallow — expandable, not overwhelming.
4. **Trust through transparency.** When the roadmap changes, tell the learner why ("Your roadmap updated because you completed 3 projects faster than expected").

---

## 2. Core Screens (MVP)

### 2.1 Onboarding
- Multi-step questionnaire (Shadcn `Stepper`-style pattern), one question group per screen, progress indicator at top.
- Resume upload as its own step, with a clear "or skip and fill manually" escape hatch — never force resume upload as a hard blocker.

### 2.2 Dashboard (Home)
- **Hero zone:** Today's Mission card — title, estimated time, "Start" CTA.
- **Secondary zone:** Current phase name + a slim progress bar (not the whole roadmap).
- **Tertiary zone:** Streak counter, readiness score (interview + placement), quick links to Resume / Interview Bot.

### 2.3 Roadmap View
- Vertical phase timeline (Phase 1 → Career Ready), current phase expanded, others collapsed.
- Each phase expandable to show objectives/skills/projects/milestones.
- Clear "why this changed" changelog entries tied to regeneration events.

### 2.4 Mission View
- Single-focus screen: mission content, one primary action (Mark Complete / Mark Too Hard / Skip).
- No competing navigation — this screen should feel like a task, not a dashboard.

### 2.5 Resume Analysis
- Score prominently displayed (single number, e.g., out of 100) with a short one-line summary.
- Gap analysis as a scannable list, each item linking to "add this to my roadmap."

### 2.6 Interview Bot
- Chat-style interface, clearly marked as AI (avoid implying a real recruiter).
- **Pre-session consent screen**: clearly explains what will be analyzed (eye contact, posture, pacing), states plainly that video is never recorded or uploaded ("Your camera never leaves your device — we only calculate a few numbers like eye contact percentage"), with camera defaulted off and an explicit toggle to enable.
- During the session, if camera is enabled, show a small, unobtrusive "Camera analysis active" indicator — no live overlay of the metrics themselves during the interview (seeing a live "eye contact: 40%" number while trying to answer a question would be actively harmful to performance and increase anxiety — save all feedback for the post-session report, consistent with the existing "structured scannable feedback cards" pattern already specified).
- Post-session: feedback report as a structured card (strengths / gaps / suggested missions), not a wall of text. Includes a **Delivery** section alongside the existing Strengths/Gaps/Missions cards — presented with the same calm, non-punitive tone (§5 Tone of Voice) as the rest of the report.

### 2.7 Progress/Skill Graph
- Recharts radar or bar chart of skill coverage vs. target role requirements.
- Keep to a single chart per view — avoid dashboard clutter.

### 2.8 Delivery Trends View (Dashboard)
- A simple line/trend chart (Recharts) per tracked metric (eye contact, pacing, filler-word rate) across the learner's session history — reinforces the "you're improving" framing that's central to GUIDIFY's non-punitive design philosophy, and gives a concrete, motivating reason to do another mock interview.

---

## 3. Visual Language

- **Typography:** one strong display typeface for headings (used sparingly — mission titles, phase names), a clean system/sans font for body. Avoid default-feeling font pairings; pick something with character consistent with the "We build what outlives us" brand tone already established for IgniteX.
- **Color:** a calm, focused base palette (avoid loud gamified colors typical of ed-tech apps aimed at kids) — this product should feel credible to a fresh graduate preparing for a real interview, not like a school app.
- **Motion:** subtle, purposeful (mission completion confirmation, phase transition) — never decorative motion that delays the user from their next action.
- **Empty states:** every empty state should suggest the next concrete step (e.g., empty resume state → "Upload your resume to unlock personalized missions").

Full component-level and token-level guidance should be pulled from the `frontend-design` skill at build time — this doc defines intent, not final CSS tokens.

---

## 4. Accessibility & Responsiveness

- MVP is responsive web only (no native apps) — must work well on mobile browser since students will check "today's mission" on their phones.
- Minimum contrast ratios per WCAG AA.
- All primary actions (mark complete, start interview, upload resume) reachable via keyboard and screen-reader labeled.

---

## 5. Tone of Voice (UI Copy)

- Direct, encouraging, never condescending. "Today's Mission" not "Fun Task!"
- When the roadmap changes, explain the *reason* in plain language, not system-speak ("roadmap_v3 regenerated" is not acceptable copy).
- Failure states (failed assessment, missed streak) are framed as adaptation triggers, not punishment: "Let's adjust your pace" not "You broke your streak."

---

## 6. Psychometric Assessment UX

### 6.1 Framing
- Positioned as **"Quick Fit Check"** (not "Personality Test") — avoids clinical/diagnostic framing that reduces completion friction.
- Framed as optional and skippable during onboarding — never a hard gate before roadmap generation.
- A short explanation screen before questions start: "This helps us tailor your roadmap's pace and style to how you work best. Takes ~3 minutes. Completely optional."

### 6.2 Assessment flow
- Clean, focused single-question-per-screen layout (consistent with the onboarding questionnaire pattern in `design.md` §2.1).
- Progress bar showing question count (e.g., "Question 3 of 15").
- No timer — self-paced, no pressure.
- "Skip this" link always visible — learner can exit at any point without penalty.

### 6.3 Results screen — interpretive framing only
- **Never** shows a raw score dashboard (no "You are 72% Conscientiousness" gauges or bar charts of trait percentages).
- Shows only the narrative summary from `psychometrics.narrate`: e.g., "You tend to do best with clear, incremental structure and hands-on projects."
- Framed as encouraging and actionable: "We've adjusted your roadmap to match how you learn best."
- No "share results" or "compare with others" features — this is private data, not social content.

### 6.4 Consent screen
- Separate, dedicated consent step before the assessment begins (not bundled into general onboarding consent).
- Clear explanation: "We'll ask a few questions about how you like to work. Your answers help us personalize your learning pace. This is optional — you can skip it and your roadmap will still work great."
- Explicit opt-in toggle, not pre-checked.
