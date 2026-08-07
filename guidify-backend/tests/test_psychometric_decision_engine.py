"""
Unit tests for the yes/maybe/no psychometric decision engine
(app.services.psychometric_decision_engine).

Covers: deterministic scoring, canonicalized career mapping, confidence
differentiation, and the engine's tolerance of partial/duplicate answers
(validation lives in the API layer, not the engine).
"""

from app.models.psychometric_test_schemas import AnswerSubmission
from app.services.psychometric_decision_engine import (
    QUESTION_BANK,
    PsychometricDecisionEngine,
)


def _all(value: str) -> list:
    return [
        AnswerSubmission(question_id=q["id"], answer=value)
        for q in QUESTION_BANK
    ]


def test_all_yes_scores_high():
    """Every 'yes' -> every category near-max (some items have <1.0 'yes' weight)."""
    result = PsychometricDecisionEngine.evaluate(_all("yes"))
    assert result.overall_score >= 95.0
    for cs in result.category_scores:
        assert cs.score >= 95.0


def test_all_no_scores_low():
    """Every 'no' -> every category near-min (some items have >0.0 'no' weight)."""
    result = PsychometricDecisionEngine.evaluate(_all("no"))
    assert result.overall_score <= 5.1
    for cs in result.category_scores:
        assert cs.score <= 7.0


def test_all_maybe_scores_50():
    """Every 'maybe' -> every category 50, overall 50."""
    result = PsychometricDecisionEngine.evaluate(_all("maybe"))
    assert result.overall_score == 50.0
    for cs in result.category_scores:
        assert cs.score == 50.0


def test_response_time_is_ignored():
    """Client-supplied response_time_ms must not alter scores (removed scoring feature)."""
    fast = _all("maybe")
    slow = _all("maybe")
    for a in fast:
        a.response_time_ms = 1
    for a in slow:
        a.response_time_ms = 60000
    fast_result = PsychometricDecisionEngine.evaluate(fast)
    slow_result = PsychometricDecisionEngine.evaluate(slow)
    assert fast_result.overall_score == slow_result.overall_score == 50.0


def test_recommendation_is_order_independent():
    """Top-2 recommendation must not depend on which tied category sorts first."""
    tie_scores = {
        "Technical Aptitude": 100.0,
        "Analytical Reasoning": 100.0,
        "Creative Thinking": 40.0,
        "Leadership": 40.0,
        "Interpersonal Skills": 40.0,
    }
    a = PsychometricDecisionEngine._get_recommendations(tie_scores)
    reversed_order = dict(reversed(list(tie_scores.items())))
    b = PsychometricDecisionEngine._get_recommendations(reversed_order)
    assert a == b == ("Software Engineer", "Data Scientist")


def test_peaked_profile_is_more_confident_than_flat():
    """Differentiated (peaked) profiles should yield higher confidence than flat ones."""
    flat = PsychometricDecisionEngine.evaluate(_all("maybe"))
    peaked = PsychometricDecisionEngine.evaluate(_all("yes"))
    assert peaked.confidence > flat.confidence


def test_missing_answers_tolerated_by_engine():
    """The engine averages over answered items only (API enforces completeness)."""
    partial = _all("yes")[:-1]
    result = PsychometricDecisionEngine.evaluate(partial)
    assert 0 <= result.overall_score <= 100
