"""Interview delivery-analytics consent and final-feedback integration tests."""

from types import SimpleNamespace

import pytest

from app.api import interview
from app.models.schemas import InterviewAnswerRequest, InterviewSessionRequest


@pytest.mark.asyncio
@pytest.mark.parametrize("camera_enabled", [False, True])
async def test_session_records_only_explicit_camera_consent(monkeypatch, camera_enabled):
    consent_calls = []
    updates = []

    async def create_session(learner_id, track):
        return {"id": "session-1", "learner_id": learner_id, "track": track}

    async def create_consent(*args, **kwargs):
        consent_calls.append((args, kwargs))
        return {"id": "consent-1"}

    async def update_session(session_id, data):
        updates.append((session_id, data))
        return data

    async def no_profile(_learner_id):
        return None

    async def generate(**_kwargs):
        return {"question": "First question?"}

    monkeypatch.setattr(interview.queries, "create_interview_session", create_session)
    monkeypatch.setattr(interview.queries, "create_consent", create_consent)
    monkeypatch.setattr(interview.queries, "update_interview_session", update_session)
    monkeypatch.setattr(interview.queries, "get_learner_profile", no_profile)
    monkeypatch.setattr(interview.queries, "get_learner", no_profile)
    monkeypatch.setattr(interview, "gateway", SimpleNamespace(generate=generate))

    response = await interview.start_interview_session(
        InterviewSessionRequest(track="technical", camera_enabled=camera_enabled),
        learner_id="learner-1",
    )

    assert response.camera_enabled is camera_enabled
    assert len(consent_calls) == int(camera_enabled)
    consent_updates = [data for _, data in updates if "delivery_consent_id" in data]
    assert len(consent_updates) == int(camera_enabled)


@pytest.mark.asyncio
async def test_final_answer_metrics_feed_feedback_and_persist(monkeypatch):
    updates = []
    gateway_contexts = []
    session = {
        "id": "session-1",
        "status": "in_progress",
        "track": "technical",
        "question_count": interview.MAX_QUESTIONS_PER_SESSION,
        "delivery_consent_id": "consent-1",
        "transcript": [{"role": "interviewer", "content": "Final question?"}],
    }

    async def get_session(_session_id, _learner_id):
        return session

    async def no_profile(_learner_id):
        return None

    async def update_session(session_id, data):
        updates.append((session_id, data))
        return data

    async def generate(**kwargs):
        gateway_contexts.append(kwargs["context"])
        return {
            "strengths": ["Clear structure"],
            "gaps": [],
            "communication_notes": "Good delivery.",
            "readiness_subscore": 82,
            "suggested_missions": [],
        }

    monkeypatch.setattr(interview.queries, "get_interview_session", get_session)
    monkeypatch.setattr(interview.queries, "get_learner_profile", no_profile)
    monkeypatch.setattr(interview.queries, "get_learner", no_profile)
    monkeypatch.setattr(interview.queries, "update_interview_session", update_session)
    monkeypatch.setattr(interview, "gateway", SimpleNamespace(generate=generate))

    request = InterviewAnswerRequest(
        answer="My final answer",
        delivery_metrics={
            "camera_enabled": True,
            "eye_contact_pct": 76,
            "posture_score": 0.84,
            "expression_stability_score": 0.78,
            "fidget_frequency": 0.2,
            "words_per_minute": 135,
            "filler_word_rate": 0.03,
            "pause_frequency": 2.0,
        },
    )
    response = await interview.submit_answer("session-1", request, "learner-1")

    assert response.status == "completed"
    assert gateway_contexts[0]["delivery_metrics"]["eye_contact_pct"] == 76
    assert gateway_contexts[0]["camera_enabled"] is True
    persisted = updates[-1][1]
    assert persisted["status"] == "completed"
    assert persisted["camera_enabled"] is True
    assert persisted["delivery_metrics"]["words_per_minute"] == 135
