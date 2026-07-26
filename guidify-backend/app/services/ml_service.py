"""
ML Service

MED-05 / PERF-01 FIX: SentenceTransformer is now lazy-loaded on first use
  instead of blocking for 3-8 seconds at module import time.
HIGH-08 FIX: All print() replaced with structured logger calls.
"""

import logging
import numpy as np
from typing import List, Dict, Any, Optional

logger = logging.getLogger("guidify")

# MED-05 FIX: Module-level variables initialized to None.
# Model loaded on first use via _get_encoder() — prevents blocking cold start.
_sentence_model = None
_lgbm_model = None


def _get_encoder():
    """Lazy-load the SentenceTransformer model on first use."""
    global _sentence_model
    if _sentence_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading SentenceTransformer model (first-use lazy load)...")
            _sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("SentenceTransformer model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load SentenceTransformer model: {e}")
            _sentence_model = None
    return _sentence_model


def _get_lgbm_model():
    """Lazy-load LightGBM model on first use."""
    global _lgbm_model
    if _lgbm_model is None:
        try:
            import lightgbm as lgb
            import os
            model_paths = [
                "models/career_model.lgb",
                os.path.join(os.path.dirname(__file__), "../../models/career_model.lgb")
            ]
            for path in model_paths:
                if os.path.exists(path):
                    _lgbm_model = lgb.Booster(model_file=path)
                    logger.info(f"LightGBM model loaded from {path}")
                    break
            if _lgbm_model is None:
                logger.warning("No LightGBM model found — similarity-only mode will be used")
        except Exception as e:
            logger.error(f"Failed to load LightGBM model: {e}")
    return _lgbm_model


class MLService:
    """ML-powered recommendation and profiling service."""

    def generate_profile_features(self, profile: Any) -> Optional[np.ndarray]:
        """
        Generate feature vector for the given learner profile.
        MED-05 FIX: Calls _get_encoder() which lazy-loads the model.
        """
        encoder = _get_encoder()
        if encoder is None:
            logger.warning("Encoder unavailable — cannot generate profile features")
            return None

        try:
            profile_text = self._profile_to_text(profile)
            features = encoder.encode(profile_text)
            return features
        except Exception as e:
            logger.error(f"Profile feature generation failed: {e}")
            return None

    def get_recommendations(self, profile: Any, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Get ranked recommendations for the given profile using semantic similarity.
        HIGH-08 FIX: All errors logged via logger, not print().
        """
        encoder = _get_encoder()
        if encoder is None:
            logger.warning("ML encoder unavailable — returning empty recommendations")
            return []

        try:
            profile_text = self._profile_to_text(profile)
            query_embedding = encoder.encode(profile_text)

            candidate_texts = [
                f"{c.get('title', '')} {c.get('description', '')}"
                for c in candidates
            ]

            # PERF-05: Batch encode all candidates in one call
            candidate_embeddings = encoder.encode(candidate_texts)

            similarities = np.dot(candidate_embeddings, query_embedding) / (
                np.linalg.norm(candidate_embeddings, axis=1) * np.linalg.norm(query_embedding) + 1e-8
            )

            sorted_indices = np.argsort(similarities)[::-1]
            return [
                {
                    **candidates[i],
                    "similarity_score": float(similarities[i]),
                    "rank": rank + 1
                }
                for rank, i in enumerate(sorted_indices[:20])
            ]
        except Exception as e:
            logger.error(f"ML recommendation error: {e}")
            return []

    def _profile_to_text(self, profile: Any) -> str:
        """Convert profile object to text for embedding."""
        parts = []
        if hasattr(profile, 'career_goal') and profile.career_goal:
            parts.append(f"Career goal: {profile.career_goal}")
        if hasattr(profile, 'skills') and profile.skills:
            parts.append(f"Skills: {', '.join(profile.skills)}")
        if hasattr(profile, 'stream') and profile.stream:
            parts.append(f"Stream: {profile.stream}")
        return " ".join(parts) if parts else "general learner"


# Singleton instance (no model loading at import time — lazy via _get_encoder)
ml_service = MLService()
