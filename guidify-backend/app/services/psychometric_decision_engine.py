"""
Psychometric Decision Engine

Scores yes/maybe/no responses across 5 assessment categories using a weighted
multi-dimensional scoring matrix. Produces career recommendations and a
personality profile from the aggregate score vector.

Categories:
    1. Technical Aptitude    — comfort with tools, code, systems
    2. Creative Thinking    — novelty, design, imagination
    3. Leadership           — initiative, ownership, guiding others
    4. Analytical Reasoning — data, logic, problem decomposition
    5. Interpersonal Skills — empathy, communication, collaboration
"""

import uuid
import time
import logging
from typing import List, Dict, Tuple

from app.models.psychometric_test_schemas import (
    Question,
    QuestionOption,
    CategoryScore,
    DecisionResult,
    AnswerSubmission,
)

logger = logging.getLogger("guidify.psychometric.decision_engine")


# ── Question Bank ────────────────────────────────────────────────────
# 30 questions across 5 categories, 6 per category.
# Each question has yes/maybe/no with differential weights per category.

QUESTION_BANK: List[Dict] = [
    # ── Technical Aptitude ──
    {"id": "ta_01", "text": "I enjoy learning how software and systems work under the hood.", "category": "Technical Aptitude",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ta_02", "text": "I feel comfortable working with code, scripts, or automation tools.", "category": "Technical Aptitude",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ta_03", "text": "I like troubleshooting technical problems until I find a solution.", "category": "Technical Aptitude",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ta_04", "text": "I prefer hands-on experimentation over reading theoretical documentation.", "category": "Technical Aptitude",
     "weights": {"yes": 0.8, "maybe": 0.5, "no": 0.3}},
    {"id": "ta_05", "text": "I am excited by emerging technologies like AI, blockchain, or robotics.", "category": "Technical Aptitude",
     "weights": {"yes": 0.9, "maybe": 0.5, "no": 0.1}},
    {"id": "ta_06", "text": "I would rather build a prototype than write a proposal document.", "category": "Technical Aptitude",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},

    # ── Creative Thinking ──
    {"id": "ct_01", "text": "I enjoy brainstorming new ideas and imagining what does not yet exist.", "category": "Creative Thinking",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ct_02", "text": "I often approach problems from unusual angles before trying standard methods.", "category": "Creative Thinking",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ct_03", "text": "I find inspiration in art, music, nature, or everyday experiences.", "category": "Creative Thinking",
     "weights": {"yes": 0.8, "maybe": 0.5, "no": 0.2}},
    {"id": "ct_04", "text": "I prefer roles where I can design, write, or create visual content.", "category": "Creative Thinking",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ct_05", "text": "I enjoy combining unrelated concepts to form novel solutions.", "category": "Creative Thinking",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ct_06", "text": "I feel energized when working on open-ended projects with no fixed template.", "category": "Creative Thinking",
     "weights": {"yes": 0.9, "maybe": 0.5, "no": 0.1}},

    # ── Leadership ──
    {"id": "ld_01", "text": "I naturally take charge in group settings when no one else steps up.", "category": "Leadership",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ld_02", "text": "I enjoy setting goals and motivating others to work toward them.", "category": "Leadership",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ld_03", "text": "I am comfortable making decisions even when others disagree.", "category": "Leadership",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ld_04", "text": "I prefer delegating tasks and coordinating team efforts over doing everything myself.", "category": "Leadership",
     "weights": {"yes": 0.9, "maybe": 0.5, "no": 0.1}},
    {"id": "ld_05", "text": "I have experience resolving conflicts between team members.", "category": "Leadership",
     "weights": {"yes": 0.8, "maybe": 0.5, "no": 0.2}},
    {"id": "ld_06", "text": "I take ownership of outcomes, including failures.", "category": "Leadership",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},

    # ── Analytical Reasoning ──
    {"id": "ar_01", "text": "I enjoy breaking complex problems into smaller, manageable parts.", "category": "Analytical Reasoning",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ar_02", "text": "I like working with data, numbers, and statistical patterns.", "category": "Analytical Reasoning",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ar_03", "text": "I prefer making decisions based on evidence rather than intuition.", "category": "Analytical Reasoning",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ar_04", "text": "I enjoy puzzles, logic games, and strategy-based challenges.", "category": "Analytical Reasoning",
     "weights": {"yes": 0.9, "maybe": 0.5, "no": 0.1}},
    {"id": "ar_05", "text": "I often evaluate risks and trade-offs before making a decision.", "category": "Analytical Reasoning",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ar_06", "text": "I find satisfaction in optimizing processes to make them more efficient.", "category": "Analytical Reasoning",
     "weights": {"yes": 0.9, "maybe": 0.5, "no": 0.1}},

    # ── Interpersonal Skills ──
    {"id": "ip_01", "text": "I enjoy collaborating with others and value diverse perspectives.", "category": "Interpersonal Skills",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ip_02", "text": "I am good at listening and understanding what others really mean.", "category": "Interpersonal Skills",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ip_03", "text": "I feel comfortable presenting ideas to groups or stakeholders.", "category": "Interpersonal Skills",
     "weights": {"yes": 0.9, "maybe": 0.5, "no": 0.1}},
    {"id": "ip_04", "text": "I enjoy mentoring or helping others learn new skills.", "category": "Interpersonal Skills",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
    {"id": "ip_05", "text": "I adapt my communication style depending on who I am talking to.", "category": "Interpersonal Skills",
     "weights": {"yes": 0.8, "maybe": 0.5, "no": 0.2}},
    {"id": "ip_06", "text": "I thrive in environments where teamwork is essential.", "category": "Interpersonal Skills",
     "weights": {"yes": 1.0, "maybe": 0.5, "no": 0.0}},
]

# Category weights for overall score computation
CATEGORY_WEIGHTS = {
    "Technical Aptitude": 0.25,
    "Creative Thinking": 0.20,
    "Leadership": 0.15,
    "Analytical Reasoning": 0.25,
    "Interpersonal Skills": 0.15,
}

# Score label thresholds
SCORE_LABELS = [
    (80, "Strong"),
    (60, "Moderate"),
    (40, "Developing"),
    (0, "Low"),
]

# Career mapping: top category combinations -> recommendations
# Keys are canonicalized (sorted) pairs so recommendation is order-independent.
CAREER_MAP = {
    ("Analytical Reasoning", "Technical Aptitude"): ("Software Engineer", "Data Scientist"),
    ("Creative Thinking", "Technical Aptitude"): ("Full-Stack Developer", "UX Engineer"),
    ("Leadership", "Technical Aptitude"): ("Engineering Manager", "Technical Lead"),
    ("Analytical Reasoning", "Creative Thinking"): ("Data Analyst", "Research Scientist"),
    ("Creative Thinking", "Interpersonal Skills"): ("Product Manager", "Marketing Strategist"),
    ("Analytical Reasoning", "Leadership"): ("Management Consultant", "Strategy Analyst"),
    ("Interpersonal Skills", "Leadership"): ("Team Lead", "HR Business Partner"),
    ("Analytical Reasoning", "Interpersonal Skills"): ("Organizational Psychologist", "Training Specialist"),
}

# Default fallback careers
DEFAULT_CAREERS = {
    "Technical Aptitude": ("Software Developer", "IT Analyst"),
    "Creative Thinking": ("Designer", "Content Creator"),
    "Leadership": ("Project Manager", "Operations Lead"),
    "Analytical Reasoning": ("Data Analyst", "Business Intelligence Analyst"),
    "Interpersonal Skills": ("Customer Success Manager", "Recruiter"),
}

PERSONALITY_PROFILES = {
    "Technical Aptitude": "You are a systems thinker who thrives on understanding how things work. Your strength lies in building, debugging, and optimizing.",
    "Creative Thinking": "You are an imaginative problem-solver who sees possibilities where others see dead ends. You bring fresh perspectives to every challenge.",
    "Leadership": "You are a natural initiator who steps up when it matters. You inspire action and take responsibility for outcomes.",
    "Analytical Reasoning": "You are a logical mind who excels at dissecting complexity. You make decisions grounded in evidence and clear reasoning.",
    "Interpersonal Skills": "You are a people-first communicator who builds trust and understanding. You make teams stronger through empathy and collaboration.",
}


class PsychometricDecisionEngine:
    """
    Stateless decision engine. Takes responses, produces scores and recommendations.
    All state lives in the request; no session storage needed for scoring.
    """

    @staticmethod
    def get_questions() -> List[Question]:
        """Return the full question set with standardized options."""
        questions = []
        for q in QUESTION_BANK:
            options = [
                QuestionOption(value="yes", label="Yes", weight=q["weights"]["yes"]),
                QuestionOption(value="maybe", label="Maybe", weight=q["weights"]["maybe"]),
                QuestionOption(value="no", label="No", weight=q["weights"]["no"]),
            ]
            questions.append(Question(
                id=q["id"],
                text=q["text"],
                category=q["category"],
                options=options,
            ))
        return questions

    @staticmethod
    def generate_session_id() -> str:
        return f"psy_{uuid.uuid4().hex[:12]}_{int(time.time())}"

    @staticmethod
    def _compute_category_scores(answers: List[AnswerSubmission]) -> Dict[str, float]:
        """Compute raw score per category (0-100)."""
        category_raw: Dict[str, List[float]] = {cat: [] for cat in CATEGORY_WEIGHTS}

        answer_map = {a.question_id: a for a in answers}

        for q in QUESTION_BANK:
            answer = answer_map.get(q["id"])
            if not answer:
                continue

            # Validate answer
            if answer.answer not in ("yes", "maybe", "no"):
                logger.warning(f"Invalid answer '{answer.answer}' for question {q['id']}")
                continue

            weight = q["weights"][answer.answer]
            category_raw[q["category"]].append(weight)

        scores = {}
        for cat, values in category_raw.items():
            if values:
                scores[cat] = round(sum(values) / len(values) * 100, 1)
            else:
                scores[cat] = 0.0

        return scores

    @staticmethod
    def _compute_confidence(answers: List[AnswerSubmission], category_scores: Dict[str, float]) -> float:
        """
        Confidence is higher when:
        - More questions answered (completion rate)
        - Fewer 'maybe' responses (decisiveness)
        - Stronger differentiation across categories (clear peak)
        """
        total_questions = len(QUESTION_BANK)
        answered = len(answers)
        completion = answered / total_questions if total_questions > 0 else 0

        maybe_count = sum(1 for a in answers if a.answer == "maybe")
        decisiveness = 1 - (maybe_count / answered) if answered > 0 else 0

        # Differentiation: a clear peak across categories strengthens the
        # recommendation, so reward peaked profiles and flag flat ones.
        # Max achievable peak-mean spread is 80 (100 vs four 0s) -> normalized.
        if category_scores:
            values = list(category_scores.values())
            mean = sum(values) / len(values)
            peak = max(values)
            differentiation = min(1.0, max(0.0, (peak - mean) / 80.0))
        else:
            differentiation = 0

        confidence = (completion * 0.4) + (decisiveness * 0.3) + (differentiation * 0.3)
        return round(min(1.0, max(0.0, confidence)), 2)

    @staticmethod
    def _get_score_label(score: float) -> str:
        for threshold, label in SCORE_LABELS:
            if score >= threshold:
                return label
        return "Low"

    @staticmethod
    def _get_recommendations(category_scores: Dict[str, float]) -> Tuple[str, str]:
        """Determine top 2 career recommendations based on strongest categories."""
        sorted_cats = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)
        top_two = tuple(sorted(cat for cat, _ in sorted_cats[:2]))

        if top_two in CAREER_MAP:
            return CAREER_MAP[top_two]

        # Fallback: use individual category defaults
        primary = DEFAULT_CAREERS.get(sorted_cats[0][0], ("Generalist", "Analyst"))
        secondary = DEFAULT_CAREERS.get(sorted_cats[1][0], ("Coordinator", "Associate"))
        return primary[0], secondary[0]

    @staticmethod
    def _get_personality_profile(sorted_cats: List[Tuple[str, float]]) -> str:
        """Build a short personality description from top 2 categories."""
        top_cat = sorted_cats[0][0]
        return PERSONALITY_PROFILES.get(top_cat, "You are a versatile individual with a balanced skill set.")

    @staticmethod
    def _get_strengths(category_scores: Dict[str, float]) -> List[str]:
        """Extract strengths from high-scoring categories."""
        strengths = []
        for cat, score in category_scores.items():
            if score >= 70:
                strengths.append(f"{cat} ({PsychometricDecisionEngine._get_score_label(score)})")
        return strengths if strengths else ["Adaptability"]

    @staticmethod
    def _get_growth_areas(category_scores: Dict[str, float]) -> List[str]:
        """Identify growth areas from low-scoring categories."""
        areas = []
        for cat, score in category_scores.items():
            if score < 40:
                areas.append(f"{cat} ({PsychometricDecisionEngine._get_score_label(score)})")
        return areas

    @classmethod
    def evaluate(cls, answers: List[AnswerSubmission]) -> DecisionResult:
        """
        Main decision function. Takes raw answers, produces full result.

        Scoring Algorithm:
        1. Map each answer to a weight (yes=1.0, maybe=0.5, no=0.0) per question
        2. Average weights per category -> category score (0-100)
        3. Weighted average across categories -> overall score
        4. Derive recommendations from top-2 category vector
        """
        category_scores_raw = cls._compute_category_scores(answers)
        confidence = cls._compute_confidence(answers, category_scores_raw)

        # Build category score objects
        category_scores = []
        for cat, weight in CATEGORY_WEIGHTS.items():
            raw = category_scores_raw.get(cat, 0.0)
            label = cls._get_score_label(raw)
            category_scores.append(CategoryScore(
                category=cat,
                score=raw,
                confidence=confidence,
                label=label,
            ))

        # Overall score: weighted average
        overall_score = round(
            sum(cs.score * CATEGORY_WEIGHTS[cs.category] for cs in category_scores),
            1,
        )

        # Recommendations
        primary, secondary = cls._get_recommendations(category_scores_raw)

        # Personality profile
        sorted_cats = sorted(category_scores_raw.items(), key=lambda x: x[1], reverse=True)
        personality = cls._get_personality_profile(sorted_cats)

        # Strengths and growth areas
        strengths = cls._get_strengths(category_scores_raw)
        growth = cls._get_growth_areas(category_scores_raw)

        # Summary
        top_cat = sorted_cats[0][0] if sorted_cats else "versatile"
        summary = (
            f"Your assessment reveals a {cls._get_score_label(overall_score).lower()} "
            f"affinity for {top_cat.lower()}-oriented roles. "
            f"Your overall readiness score is {overall_score}/100 with {confidence*100:.0f}% confidence. "
            f"Recommended path: {primary} with {secondary} as an alternative."
        )

        return DecisionResult(
            primary_recommendation=primary,
            secondary_recommendation=secondary,
            category_scores=category_scores,
            overall_score=overall_score,
            confidence=confidence,
            personality_profile=personality,
            strengths=strengths,
            growth_areas=growth,
            summary=summary,
        )
