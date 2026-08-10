"""
Tests for POST /api/v1/roadmap/regenerate — api.md §3.

Covers the full regeneration flow with a mocked AI Gateway and mocked DB layer:
    - first-time generation (version 1, "roadmap_generated" event)
    - regeneration (version increments, old superseded, "roadmap_regenerated" event)
    - 24h debounce (rules.md §2): 409 inside the window, allowed after
    - AI Gateway failure → 502, nothing persisted
    - DB save failure → 500
    - missing learner → 404
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.auth import get_current_learner_id
from app.api import roadmap as roadmap_api

SAMPLE_ROADMAP = {
    "title": "Roadmap to Data Scientist",
    "total_phases": 3,
    "estimated_weeks": 24,
    "phases": [
        {
            "phase_number": 1,
            "title": "Phase 1: Foundations",
            "description": "Core programming and statistics.",
            "skills": ["Python", "Statistics"],
            "estimated_weeks": 8,
            "difficulty": "beginner",
            "milestones": ["Write a data pipeline"],
        },
        {
            "phase_number": 2,
            "title": "Phase 2: Machine Learning",
            "description": "Supervised and unsupervised methods.",
            "skills": ["scikit-learn", "Pandas"],
            "estimated_weeks": 8,
            "difficulty": "intermediate",
            "milestones": [],
        },
        {
            "phase_number": 3,
            "title": "Phase 3: Job Readiness",
            "description": "Portfolio, networking, interview prep.",
            "skills": ["Portfolio", "Interviewing"],
            "estimated_weeks": 8,
            "difficulty": "advanced",
            "milestones": ["Complete portfolio project"],
        },
    ],
}


class FakeGateway:
    """Replaces the AI Gateway singleton for roadmap.generate."""

    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error
        self.calls = 0

    async def generate(self, task_type, context, response_model=None, system_instruction=None):
        self.calls += 1
        assert task_type == "roadmap.generate"
        if self.error:
            raise self.error
        return dict(self.result)


class FakeStore:
    """In-memory stand-in for the queries module."""

    def __init__(self):
        self.learner = {
            "id": "test_user",
            "target_role": "Data Scientist",
            "segment": "college",
        }
        self.profile = {
            "skills": ["Python"],
            "interests": ["ML"],
            "strengths": ["Analytical"],
            "weaknesses": ["Public speaking"],
            "questionnaire_data": {"learning_hours": "5"},
        }
        self.roadmaps = []
        self.events = []
        self.last_regeneration = None
        self.save_failure = False
        self.learner_present = True

    async def get_learner(self, learner_id):
        return dict(self.learner) if self.learner_present else None

    async def get_learner_profile(self, learner_id):
        return dict(self.profile)

    async def get_last_regeneration(self, learner_id):
        return self.last_regeneration

    async def create_roadmap(self, learner_id, data):
        if self.save_failure:
            return None
        version = (max(r["version"] for r in self.roadmaps) + 1) if self.roadmaps else 1
        for r in self.roadmaps:
            r["status"] = "superseded"
        row = {
            **data,
            "id": f"rm_{version}",
            "learner_id": learner_id,
            "version": version,
            "status": "active",
        }
        self.roadmaps.append(row)
        return dict(row)

    async def create_event(self, learner_id, event_type, payload,
                           related_mission_id=None, related_roadmap_id=None):
        event = {
            "learner_id": learner_id,
            "event_type": event_type,
            "payload": payload,
            "related_roadmap_id": related_roadmap_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.events.append(event)
        if event_type == "roadmap_regenerated":
            self.last_regeneration = event["created_at"]
        return event


@pytest.fixture()
def client(monkeypatch):
    async def fake_learner_id():
        return "test_user"

    app.dependency_overrides[get_current_learner_id] = fake_learner_id
    yield TestClient(app)
    app.dependency_overrides.pop(get_current_learner_id, None)


@pytest.fixture()
def store():
    return FakeStore()


@pytest.fixture()
def installed(monkeypatch, store):
    """Install FakeGateway + FakeStore into the roadmap route module."""
    monkeypatch.setattr(roadmap_api, "gateway", FakeGateway(result=SAMPLE_ROADMAP))
    monkeypatch.setattr(roadmap_api.queries, "get_learner", store.get_learner)
    monkeypatch.setattr(roadmap_api.queries, "get_learner_profile", store.get_learner_profile)
    monkeypatch.setattr(roadmap_api.queries, "get_last_regeneration", store.get_last_regeneration)
    monkeypatch.setattr(roadmap_api.queries, "create_roadmap", store.create_roadmap)
    monkeypatch.setattr(roadmap_api.queries, "create_event", store.create_event)
    return store


def test_regenerate_creates_first_roadmap(client, installed):
    response = client.post("/api/v1/roadmap/regenerate")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["title"] == SAMPLE_ROADMAP["title"]
    assert data["total_phases"] == 3

    assert len(installed.roadmaps) == 1
    saved = installed.roadmaps[0]
    assert saved["version"] == 1
    assert saved["status"] == "active"
    assert saved["trigger_reason"] == "regenerate_request"
    assert len(saved["phases"]) == 3

    event_types = [e["event_type"] for e in installed.events]
    assert event_types == ["roadmap_generated"]


def test_regenerate_increments_version_and_supersedes(client, installed):
    installed.roadmaps.append({
        "id": "rm_1",
        "learner_id": "test_user",
        "title": "Old",
        "version": 1,
        "status": "active",
        "total_phases": 2,
        "estimated_weeks": 10,
        "phases": [],
        "trigger_reason": "onboarding",
    })
    assert installed.roadmaps[0]["version"] == 1

    response = client.post("/api/v1/roadmap/regenerate")
    assert response.status_code == 200

    assert len(installed.roadmaps) == 2
    assert installed.roadmaps[0]["status"] == "superseded"
    assert installed.roadmaps[1]["version"] == 2
    assert installed.roadmaps[1]["status"] == "active"

    event_types = [e["event_type"] for e in installed.events]
    assert event_types == ["roadmap_regenerated"]
    assert installed.last_regeneration is not None


def test_regenerate_debounced_within_24h(client, installed):
    installed.last_regeneration = datetime.now(timezone.utc).isoformat()
    response = client.post("/api/v1/roadmap/regenerate")
    assert response.status_code == 409
    assert "24 hours" in response.json()["error"]["message"]
    assert installed.roadmaps == []
    assert installed.events == []


def test_regenerate_allowed_after_24h(client, installed):
    installed.last_regeneration = (
        datetime.now(timezone.utc) - timedelta(hours=25)
    ).isoformat()
    response = client.post("/api/v1/roadmap/regenerate")
    assert response.status_code == 200
    assert len(installed.roadmaps) == 1


def test_regenerate_ai_failure_returns_502(client, monkeypatch, store):
    from app.core.exceptions import AIServiceError
    gateway = FakeGateway(error=AIServiceError(message="model timeout"))
    monkeypatch.setattr(roadmap_api, "gateway", gateway)
    monkeypatch.setattr(roadmap_api.queries, "get_learner", store.get_learner)
    monkeypatch.setattr(roadmap_api.queries, "get_learner_profile", store.get_learner_profile)
    monkeypatch.setattr(roadmap_api.queries, "get_last_regeneration", store.get_last_regeneration)
    monkeypatch.setattr(roadmap_api.queries, "create_roadmap", store.create_roadmap)
    monkeypatch.setattr(roadmap_api.queries, "create_event", store.create_event)

    response = client.post("/api/v1/roadmap/regenerate")
    assert response.status_code == 502
    assert "failed" in response.json()["error"]["message"]
    assert store.roadmaps == []
    assert store.events == []


def test_regenerate_save_failure_returns_500(client, installed):
    installed.save_failure = True
    response = client.post("/api/v1/roadmap/regenerate")
    assert response.status_code == 500
    assert installed.roadmaps == []
    assert installed.events == []


def test_regenerate_missing_learner_returns_404(client, installed):
    installed.learner_present = False
    response = client.post("/api/v1/roadmap/regenerate")
    assert response.status_code == 404
    assert installed.roadmaps == []
    assert installed.events == []
