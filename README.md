# GUIDIFY - AI-Driven Career Guidance Platform

GUIDIFY is a comprehensive, AI-powered career guidance platform designed to bridge the gap between learners, training providers, and the labour market. It leverages Machine Learning for personalized profiling, integrates with NCVET for verified qualifications, and provides real-time Labour Market Intelligence (LMI).

## 🚀 Key Features

- **AI/ML Learner Profiling**: Hybrid profiling using rule-based logic and LightGBM + SentenceTransformers for deep skill analysis.
- **NCVET Integration**: Syncs with National Council for Vocational Education and Training data for verified course recommendations.
- **Career Guidance Dashboard**: Role-based dashboards for Learners, Trainers, and Policymakers with rich analytics.
- **Real-time LMI**: Maps job market trends to skills using LMI ingestion pipelines.
- **Multilingual & Accessible**: Supports English, Hindi, Bengali. WCAG AA compliant UI.
- **Scalable Architecture**: Microservices-ready backend (FastAPI), Redis caching, Rate limiting, and Dockerized deployment.
- **Privacy & Security**: GDPR-compliant data export/delete, RBAC, and secure data handling.

## 🛠 Tech Stack

- **Frontend**: React (Vite), Styled Components, Recharts, Framer Motion, i18next.
- **Backend**: Python (FastAPI), Uvicorn, Pydantic.
- **ML/AI**: LightGBM, SentenceTransformers (all-MiniLM-L6-v2), Google Gemini (LLM).
- **Database**: Supabase (PostgreSQL), Redis (Caching/Queue).
- **Ops**: Docker, Docker Compose, Prometheus, Grafana.

## 📦 Setup & Installation

### Prerequisites
- Docker & Docker Compose
- Python 3.9+
- Node.js 18+
- Supabase Account (or local Postgres)

### Local Development

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-repo/guidify.git
    cd guidify
    ```

2.  **Backend Setup**
    ```bash
    cd guidify-backend
    python -m venv venv
    source venv/bin/activate  # or venv\Scripts\activate on Windows
    pip install -r requirements.txt
    ```
    Create `.env` file in `guidify-backend`:
    ```env
    SUPABASE_URL=your_supabase_url
    SUPABASE_KEY=your_supabase_key
    GOOGLE_API_KEY=your_gemini_key
    REDIS_URL=redis://localhost:6379/0
    ```

3.  **Frontend Setup**
    ```bash
    cd guidify-frontend
    npm install
    ```
    Create `.env` file in `guidify-frontend`:
    ```env
    VITE_REACT_APP_SUPABASE_URL=your_supabase_url
    VITE_REACT_APP_SUPABASE_ANON_KEY=your_supabase_key
    ```

4.  **Run with Docker Compose (Recommended)**
    ```bash
    # From root directory
    docker-compose up --build
    ```
    - Frontend: http://localhost:3000
    - Backend API: http://localhost:8000/docs
    - Grafana: http://localhost:3001
    - Prometheus: http://localhost:9090

### Running Tests

**Backend Tests**
```bash
cd guidify-backend
pytest tests/
```

**Frontend Tests**
```bash
cd guidify-frontend
npm test
```

## 📊 Monitoring & Observability

- **Prometheus**: Metrics exposed at `/metrics`.
- **Grafana**: Dashboards for API latency, error rates, and system health.
- **Health Checks**: `/health` endpoint.

## 🔒 Privacy & Compliance

- **Data Export**: `GET /api/user/export`
- **Right to be Forgotten**: `DELETE /api/user/`
- **Consent Management**: `POST /api/user/consent`

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---
**License**: MIT
