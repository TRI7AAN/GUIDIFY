<div align="center">

# GUIDIFY

**Your career won't plan itself. This does.**

AI-powered adaptive career guidance that learns from you, builds your roadmap, and gives you a mission every day until you're job-ready.

[![License: MIT](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-3776AB.svg)](https://python.org)
[![React 19](https://img.shields.io/badge/react-19-61DAFB.svg)](https://reactjs.org)

</div>

---

## What GUIDIFY Does

| Problem | Solution |
|---------|----------|
| Generic career advice that ignores your background | AI profiles your skills, experience, and goals |
| Static roadmaps that don't adapt | Daily missions that adjust based on your progress |
| Resume guesswork | AI-powered scoring with actionable improvements |
| Interview anxiety | Mock interviews with real-time AI feedback |

---

## How It Works

```
Sign Up → Take Assessment → Upload Resume → Get Your Roadmap → Daily Missions → Get Hired
   ↓           ↓                  ↓                ↓                 ↓
 Profile    Skill Gap          AI Parse        Personalized      Adapts to
  Setup     Analysis           & Score         Roadmap           Your Pace
```

---

## Features

- **Smart Onboarding** — Profile + Career Goals + Psychometric Profiling (Big Five & RIASEC)
- **Resume Intelligence** — Upload, AI parse, score, and gap analysis
- **Adaptive Roadmaps** — AI-generated, versioned, regenerates when you fail or accelerate
- **Daily Missions** — Bite-sized tasks (30-45 min) that build toward your goal
- **AI Mock Interviews** — Technical & HR tracks with Delivery Analytics (client-side eye contact, posture, vocal pacing)
- **Progress Tracking** — Streaks, skill graphs, phase completion
- **Adaptation Engine** — Detects patterns and adjusts your path automatically

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TailwindCSS, Vite, MediaPipe |
| Backend | FastAPI, Python 3.11+ |
| Database | Supabase (PostgreSQL) |
| AI | Google Gemini (2.5 Flash / Lite) |
| Auth | Supabase Auth (Email + OAuth) |

---

## Quick Start

```bash
# Clone
git clone https://github.com/your-username/guidify.git
cd guidify

# Backend
cd guidify-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend (new terminal)
cd guidify-frontend
npm install
npm run dev
```

**Environment Variables** — Copy `.env.example` to `.env` in both frontend and backend, then add your Supabase and Gemini API keys.

---

## Project Structure

```
guidify/
├── guidify-backend/
│   ├── app/
│   │   ├── api/          # REST endpoints
│   │   ├── ai_gateway/   # Central AI routing (Gemini 2.5 Flash / Lite)
│   │   ├── services/     # Business logic & Rules Engine
│   │   ├── psychometrics/# Psychometric instrument configs
│   │   ├── db/           # Database queries
│   │   └── models/       # Pydantic schemas
│   └── migrations/       # SQL migrations
├── guidify-frontend/
│   └── src/
│       ├── pages/        # Main screens
│       ├── components/   # Reusable UI
│       └── delivery-analytics/ # MediaPipe tracking & Web Audio
└── wiki/                 # Documentation
```

---

<div align="center">

**Built with care. Adapted by AI. Ready for learners.**

</div>
