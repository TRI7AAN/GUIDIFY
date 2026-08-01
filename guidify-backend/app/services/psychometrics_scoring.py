"""
Psychometrics Scoring Service — Deterministic, config-driven

Implements scoring for IPIP (Big Five) and RIASEC (Holland Codes) instruments.
Pure functions — no AI Gateway involvement. Unit-testable against known scoring examples.

Per techspec.md §11.1: Instrument definitions (item bank + scoring keys) live as
versioned config files (ipip_bigfive.json, riasec.json, grit.json), not hardcoded logic.
"""

import json
import os
from typing import Any, Dict, List, Optional, Tuple

_INSTRUMENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "psychometrics", "instruments")

# Cache loaded configs at module level
_ipip_config: Optional[Dict[str, Any]] = None
_riasec_config: Optional[Dict[str, Any]] = None
_grit_config: Optional[Dict[str, Any]] = None


def _load_config(filename: str) -> Dict[str, Any]:
    """Load a JSON instrument config file from the instruments directory."""
    filepath = os.path.join(_INSTRUMENTS_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def get_ipip_config() -> Dict[str, Any]:
    global _ipip_config
    if _ipip_config is None:
        _ipip_config = _load_config("ipip_bigfive.json")
    return _ipip_config


def get_riasec_config() -> Dict[str, Any]:
    global _riasec_config
    if _riasec_config is None:
        _riasec_config = _load_config("riasec.json")
    return _riasec_config


def get_grit_config() -> Dict[str, Any]:
    global _grit_config
    if _grit_config is None:
        _grit_config = _load_config("grit.json")
    return _grit_config


def get_ipip_version() -> str:
    return get_ipip_config()["version"]


def get_riasec_version() -> str:
    return get_riasec_config()["version"]


def get_grit_version() -> str:
    return get_grit_config()["version"]


def _normalize_score(raw_sum: int, item_count: int, scale_min: int, scale_max: int,
                     out_min: int = 0, out_max: int = 100) -> int:
    """
    Normalize a Likert sum to 0-100.

    raw_sum ranges from (item_count * scale_min) to (item_count * scale_max).
    Maps linearly to out_min-out_max.
    """
    min_possible = item_count * scale_min
    max_possible = item_count * scale_max
    if max_possible == min_possible:
        return 50
    normalized = (raw_sum - min_possible) / (max_possible - min_possible) * (out_max - out_min) + out_min
    return max(out_min, min(out_max, round(normalized)))


def score_ipip(answers: Dict[str, int]) -> Dict[str, int]:
    """
    Score IPIP-20 answers into Big Five trait scores (0-100).

    Args:
        answers: dict mapping item_id (e.g., "ipip_1") to Likert value (1-5).

    Returns:
        Dict with keys: openness, conscientiousness, extraversion, agreeableness, neuroticism.
        Each value is 0-100.
    """
    config = get_ipip_config()
    scale_min, scale_max = config["scale_range"]
    out_min, out_max = config["normalize_to"]

    # Group items by scale (trait)
    trait_items: Dict[str, List[Dict[str, Any]]] = {}
    for item in config["items"]:
        scale = item["scale"]
        if scale not in trait_items:
            trait_items[scale] = []
        trait_items[scale].append(item)

    scores = {}
    for trait, items in trait_items.items():
        raw_sum = 0
        count = 0
        for item in items:
            item_id = item["id"]
            if item_id in answers:
                value = answers[item_id]
                # Clamp to valid range
                value = max(scale_min, min(scale_max, value))
                # Reverse-code if needed
                if item.get("reverse_scored", False):
                    value = scale_max + scale_min - value
                raw_sum += value
                count += 1

        if count == 0:
            scores[trait] = 50  # Default if no answers provided
        else:
            scores[trait] = _normalize_score(raw_sum, count, scale_min, scale_max, out_min, out_max)

    return scores


def score_riasec(answers: Dict[str, int]) -> Dict[str, int]:
    """
    Score RIASEC-18 answers into Holland Code dimension scores (0-100).

    Args:
        answers: dict mapping item_id (e.g., "ria_1") to Likert value (1-5).

    Returns:
        Dict with keys: realistic, investigative, artistic, social, enterprising, conventional.
        Each value is 0-100.
    """
    config = get_riasec_config()
    scale_min, scale_max = config["scale_range"]
    out_min, out_max = config["normalize_to"]

    # Group items by dimension
    dim_items: Dict[str, List[Dict[str, Any]]] = {}
    for item in config["items"]:
        dim = item["dimension"]
        if dim not in dim_items:
            dim_items[dim] = []
        dim_items[dim].append(item)

    scores = {}
    for dim, items in dim_items.items():
        raw_sum = 0
        count = 0
        for item in items:
            item_id = item["id"]
            if item_id in answers:
                value = answers[item_id]
                value = max(scale_min, min(scale_max, value))
                raw_sum += value
                count += 1

        if count == 0:
            scores[dim] = 50
        else:
            scores[dim] = _normalize_score(raw_sum, count, scale_min, scale_max, out_min, out_max)

    return scores


def score_grit(answers: Dict[str, int]) -> Optional[int]:
    """
    Score Grit-S answers into a single 0-100 follow-through score.

    Args:
        answers: dict mapping item_id (e.g., "grit_1") to Likert value (1-5).

    Returns:
        int 0-100, or None if no grit answers were provided (instrument is optional).
    """
    config = get_grit_config()
    scale_min, scale_max = config["scale_range"]
    out_min, out_max = config["normalize_to"]

    items = [item for item in config["items"] if item["id"] in answers]
    if not items:
        return None

    raw_sum = 0
    for item in items:
        value = answers[item["id"]]
        value = max(scale_min, min(scale_max, value))
        if item.get("reverse_scored", False):
            value = scale_max + scale_min - value
        raw_sum += value

    return _normalize_score(raw_sum, len(items), scale_min, scale_max, out_min, out_max)


def get_top_riasec_codes(scores: Dict[str, int], top_n: int = 3) -> str:
    """
    Return the top N RIASEC codes as a string (e.g., "ISA" for Investigative-Social-Artistic).
    Used for internal tagging, never exposed to learner.
    """
    sorted_dims = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return "".join(dim[0][0].upper() for dim in sorted_dims[:top_n])


def score_all(answers: Dict[str, int]) -> Tuple[Dict[str, int], Dict[str, int], Dict[str, Any]]:
    """
    Score all instruments from a single answers dict.

    Returns:
        (ipip_scores, riasec_scores, metadata)
        metadata includes: instrument versions, item counts, top_riasec_code.
    """
    ipip_scores = score_ipip(answers)
    riasec_scores = score_riasec(answers)

    metadata = {
        "ipip_version": get_ipip_version(),
        "riasec_version": get_riasec_version(),
        "ipip_items_attempted": sum(1 for k in answers if k.startswith("ipip_")),
        "riasec_items_attempted": sum(1 for k in answers if k.startswith("ria_")),
        "top_riasec_code": get_top_riasec_codes(riasec_scores),
    }

    return ipip_scores, riasec_scores, metadata
