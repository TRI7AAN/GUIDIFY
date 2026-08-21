"""
Unit tests for the deterministic psychometrics scoring engine
(app.services.psychometrics_scoring).

Required cases (per task): all-neutral-midpoint, all-minimum, all-maximum,
known-reference profile (hand-calculated), and instrument-version swap.
Covers IPIP (Big Five), RIASEC, and the optional Grit-S instrument.

The engine must be pure/deterministic: same input -> same output, no I/O,
no AI Gateway involvement.
"""

import json


from app.services import psychometrics_scoring as scoring


# ── helpers ──────────────────────────────────────────────────────────────

def _answer_ids(config: dict):
    """Return (forward_ids, reverse_ids) for a given instrument config."""
    forward, reverse = [], []
    for item in config["items"]:
        (reverse if item.get("reverse_scored", False) else forward).append(item["id"])
    return forward, reverse


def _build_answers(config: dict, forward_value: int, reverse_value: int) -> dict:
    """Build an answer dict where forward items = forward_value and reverse items = reverse_value."""
    forward, reverse = _answer_ids(config)
    return {item_id: forward_value for item_id in forward} | {
        item_id: reverse_value for item_id in reverse
    }


# ── IPIP (Big Five) ──────────────────────────────────────────────────────

def test_ipip_all_midpoint():
    """Every item at the scale midpoint (3 on 1-5) must normalize to 50 on every trait."""
    answers = _build_answers(scoring.get_ipip_config(), 3, 3)
    scores = scoring.score_ipip(answers)
    for trait, value in scores.items():
        assert value == 50, f"{trait} expected 50, got {value}"


def test_ipip_all_minimum():
    """Forward items at scale_min, reverse items at scale_max (consistently 'low') -> 0."""
    answers = _build_answers(scoring.get_ipip_config(), 1, 5)
    scores = scoring.score_ipip(answers)
    for trait, value in scores.items():
        assert value == 0, f"{trait} expected 0, got {value}"


def test_ipip_all_maximum():
    """Forward items at scale_max, reverse items at scale_min (consistently 'high') -> 100."""
    answers = _build_answers(scoring.get_ipip_config(), 5, 1)
    scores = scoring.score_ipip(answers)
    for trait, value in scores.items():
        assert value == 100, f"{trait} expected 100, got {value}"


def test_ipip_known_reference():
    """
    Hand-computed mixed profile.

    For each 4-item trait, sum = forward_raws + Σ(6 - reverse_raw), then
    normalized = (sum - 4) / (20 - 4) * 100.

    expected:
      extraversion      19 -> 93.75  -> 94
      neuroticism        7 -> 18.75  -> 19
      openness          18 -> 87.5   -> 88
      agreeableness     16 -> 75     -> 75
      conscientiousness 12 -> 50     -> 50
    """
    answers = {
        "ipip_1": 5, "ipip_2": 1, "ipip_3": 4, "ipip_4": 1,   # extraversion
        "ipip_5": 2, "ipip_6": 5, "ipip_7": 2, "ipip_8": 4,   # neuroticism
        "ipip_9": 4, "ipip_10": 2, "ipip_11": 5, "ipip_12": 1,  # openness
        "ipip_13": 2, "ipip_14": 4, "ipip_15": 1, "ipip_16": 3,  # agreeableness
        "ipip_17": 5, "ipip_18": 3, "ipip_19": 2, "ipip_20": 4,  # conscientiousness
    }
    expected = {
        "extraversion": 94,
        "neuroticism": 19,
        "openness": 88,
        "agreeableness": 75,
        "conscientiousness": 50,
    }
    assert scoring.score_ipip(answers) == expected


def test_ipip_instrument_version_swap(tmp_path, monkeypatch):
    """Scoring must read item/scoring definitions from the versioned config file."""
    test_config = {
        "instrument": "IPIP-TEST",
        "version": "9.9-test",
        "scoring_method": "likert_sum_normalized",
        "scale_range": [1, 5],
        "normalize_to": [0, 100],
        "items": [
            {"id": "ipip_101", "text": "t", "scale": "extraversion", "reverse_scored": False},
            {"id": "ipip_102", "text": "t", "scale": "neuroticism", "reverse_scored": False},
            {"id": "ipip_103", "text": "t", "scale": "openness", "reverse_scored": False},
            {"id": "ipip_104", "text": "t", "scale": "agreeableness", "reverse_scored": False},
            {"id": "ipip_105", "text": "t", "scale": "conscientiousness", "reverse_scored": False},
        ],
    }
    (tmp_path / "ipip_bigfive.json").write_text(json.dumps(test_config), encoding="utf-8")

    answers = {"ipip_101": 5, "ipip_102": 5, "ipip_103": 5, "ipip_104": 5, "ipip_105": 5}

    real_scores = scoring.score_ipip(answers)  # real config: unknown ids -> all 50

    monkeypatch.setattr(scoring, "_INSTRUMENTS_DIR", str(tmp_path))
    monkeypatch.setattr(scoring, "_ipip_config", None)

    assert scoring.get_ipip_version() == "9.9-test"
    swapped_scores = scoring.score_ipip(answers)
    assert swapped_scores == {
        "extraversion": 100,
        "neuroticism": 100,
        "openness": 100,
        "agreeableness": 100,
        "conscientiousness": 100,
    }
    assert swapped_scores != real_scores


# ── RIASEC ───────────────────────────────────────────────────────────────

def test_riasec_all_midpoint():
    answers = _build_answers(scoring.get_riasec_config(), 3, 3)
    scores = scoring.score_riasec(answers)
    for dim, value in scores.items():
        assert value == 50, f"{dim} expected 50, got {value}"


def test_riasec_all_minimum():
    answers = _build_answers(scoring.get_riasec_config(), 1, 1)
    scores = scoring.score_riasec(answers)
    for dim, value in scores.items():
        assert value == 0, f"{dim} expected 0, got {value}"


def test_riasec_all_maximum():
    answers = _build_answers(scoring.get_riasec_config(), 5, 5)
    scores = scoring.score_riasec(answers)
    for dim, value in scores.items():
        assert value == 100, f"{dim} expected 100, got {value}"


def test_riasec_known_reference():
    """
    Hand-computed mixed profile (no reverse items; 3 items per dimension).

    For each dimension, normalized = (sum - 3) / (15 - 3) * 100.

    expected:
      realistic      6  -> 25
      investigative 14  -> 91.67  -> 92
      artistic       9  -> 50
      social        13  -> 83.33  -> 83
      enterprising   5  -> 16.67  -> 17
      conventional  11  -> 66.67  -> 67
    """
    answers = {
        "ria_1": 1, "ria_2": 3, "ria_3": 2,          # realistic
        "ria_4": 5, "ria_5": 4, "ria_6": 5,          # investigative
        "ria_7": 3, "ria_8": 3, "ria_9": 3,          # artistic
        "ria_10": 4, "ria_11": 5, "ria_12": 4,       # social
        "ria_13": 2, "ria_14": 1, "ria_15": 2,       # enterprising
        "ria_16": 4, "ria_17": 4, "ria_18": 3,       # conventional
    }
    expected = {
        "realistic": 25,
        "investigative": 92,
        "artistic": 50,
        "social": 83,
        "enterprising": 17,
        "conventional": 67,
    }
    assert scoring.score_riasec(answers) == expected


def test_riasec_instrument_version_swap(tmp_path, monkeypatch):
    """Same proof as IPIP: scoring follows the config, not hardcoded logic."""
    test_config = {
        "instrument": "RIASEC-TEST",
        "version": "9.9-test",
        "scoring_method": "likert_sum_normalized",
        "scale_range": [1, 5],
        "normalize_to": [0, 100],
        "items": [
            {"id": "ria_101", "text": "t", "dimension": "realistic"},
            {"id": "ria_102", "text": "t", "dimension": "investigative"},
            {"id": "ria_103", "text": "t", "dimension": "artistic"},
            {"id": "ria_104", "text": "t", "dimension": "social"},
            {"id": "ria_105", "text": "t", "dimension": "enterprising"},
            {"id": "ria_106", "text": "t", "dimension": "conventional"},
        ],
    }
    (tmp_path / "riasec.json").write_text(json.dumps(test_config), encoding="utf-8")

    answers = {f"ria_10{i}": 5 for i in range(1, 7)}

    real_scores = scoring.score_riasec(answers)  # real config: unknown ids -> all 50

    monkeypatch.setattr(scoring, "_INSTRUMENTS_DIR", str(tmp_path))
    monkeypatch.setattr(scoring, "_riasec_config", None)

    assert scoring.get_riasec_version() == "9.9-test"
    swapped_scores = scoring.score_riasec(answers)
    assert swapped_scores == {
        "realistic": 100,
        "investigative": 100,
        "artistic": 100,
        "social": 100,
        "enterprising": 100,
        "conventional": 100,
    }
    assert swapped_scores != real_scores


# ── Grit (optional instrument) ───────────────────────────────────────────

def test_grit_midpoint_min_max():
    answers = _build_answers(scoring.get_grit_config(), 3, 3)
    assert scoring.score_grit(answers) == 50

    answers = _build_answers(scoring.get_grit_config(), 1, 5)
    assert scoring.score_grit(answers) == 0

    answers = _build_answers(scoring.get_grit_config(), 5, 1)
    assert scoring.score_grit(answers) == 100


def test_grit_absent_returns_none():
    assert scoring.score_grit({}) is None


# ── Determinism & aggregation ────────────────────────────────────────────

def test_score_all_is_deterministic():
    answers = {
        "ipip_1": 4, "ipip_2": 2, "ipip_3": 5, "ipip_4": 1,
        "ipip_5": 2, "ipip_6": 4, "ipip_7": 3, "ipip_8": 5,
        "ipip_9": 5, "ipip_10": 1, "ipip_11": 4, "ipip_12": 2,
        "ipip_13": 1, "ipip_14": 5, "ipip_15": 2, "ipip_16": 4,
        "ipip_17": 5, "ipip_18": 1, "ipip_19": 4, "ipip_20": 2,
        "ria_1": 4, "ria_2": 3, "ria_3": 5,
        "ria_4": 5, "ria_5": 4, "ria_6": 5,
        "ria_7": 3, "ria_8": 4, "ria_9": 2,
        "ria_10": 4, "ria_11": 5, "ria_12": 4,
        "ria_13": 2, "ria_14": 3, "ria_15": 1,
        "ria_16": 4, "ria_17": 4, "ria_18": 3,
    }
    first = scoring.score_all(answers)
    second = scoring.score_all(answers)
    assert first[:2] == second[:2]
    assert first[2] == second[2]
    assert set(first[0].keys()) == {"openness", "conscientiousness", "extraversion",
                                    "agreeableness", "neuroticism"}
    assert set(first[1].keys()) == {"realistic", "investigative", "artistic",
                                    "social", "enterprising", "conventional"}
    assert first[2]["ipip_version"] == scoring.get_ipip_version()
    assert first[2]["riasec_version"] == scoring.get_riasec_version()
