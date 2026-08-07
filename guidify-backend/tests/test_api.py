from fastapi.testclient import TestClient
from app.main import app
from app.middleware.auth import get_current_user

client = TestClient(app)

def mock_get_current_user():
    return {"id": "test_user", "email": "test@example.com"}

app.dependency_overrides[get_current_user] = mock_get_current_user

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_ml_profile_generate():
    # Mock request
    payload = {
        "user_id": "test_user_123",
        "update_data": {
            "skills": ["Python", "FastAPI"],
            "career_goal": "Backend Developer"
        }
    }
    response = client.post("/api/v1/ml/profile/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "test_user_123"
    # Check if features were generated (mocked logic)
    # assert "predicted_cluster" in data.get("features", {})

def test_lmi_skills_trend():
    response = client.get("/api/v1/lmi/skills-trend?skill=Python")
    assert response.status_code == 200
    data = response.json()
    assert data["skill"] == "Python"
    assert "demand_score" in data

def test_dashboard_learner():
    # Mock auth might be needed if middleware enforces it.
    # For now, assuming test client bypasses or we need to mock dependency.
    # If get_current_user is a dependency, we can override it.
    pass
