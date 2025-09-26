import os
import json
import pickle
import numpy as np
import pandas as pd
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import lightgbm as lgb
from app.models.schemas import LearnerProfile, RecommendationItem

# Paths
MODEL_DIR = os.path.join(os.path.dirname(__file__), "../../data/ml_models")
LGBM_MODEL_PATH = os.path.join(MODEL_DIR, "profiling_model.txt")
ENCODER_PATH = os.path.join(MODEL_DIR, "encoder.pkl")

class MLService:
    def __init__(self):
        self.embedding_model = None
        self.lgbm_model = None
        self._load_models()

    def _load_models(self):
        # Load Embedding Model (Lazy load or on startup)
        try:
            print("Loading SentenceTransformer...")
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            print("SentenceTransformer loaded.")
        except Exception as e:
            print(f"Error loading SentenceTransformer: {e}")

        # Load LightGBM Model
        if os.path.exists(LGBM_MODEL_PATH):
            try:
                self.lgbm_model = lgb.Booster(model_file=LGBM_MODEL_PATH)
                print("LightGBM model loaded.")
            except Exception as e:
                print(f"Error loading LightGBM model: {e}")
        else:
            print("No LightGBM model found. Will use rule-based fallback.")

    def generate_profile_features(self, profile: LearnerProfile) -> Dict[str, Any]:
        """
        Generate features for the learner profile using ML/Rules.
        """
        # 1. Rule-based features
        features = {
            "skill_count": len(profile.skills),
            "avg_assessment_score": np.mean(list(profile.assessments.values())) if profile.assessments else 0.0,
            "engagement_score": np.mean(list(profile.engagement_signals.values())) if profile.engagement_signals else 0.0,
        }

        # 2. ML Inference (if model exists)
        if self.lgbm_model:
            # Convert profile to feature vector (simplified)
            # In production, use a proper Feature Store / Vectorizer
            input_vector = [
                features["skill_count"],
                features["avg_assessment_score"],
                features["engagement_score"]
            ]
            prediction = self.lgbm_model.predict([input_vector])[0]
            features["predicted_cluster"] = int(np.argmax(prediction)) if isinstance(prediction, np.ndarray) else int(prediction)
        
        return features

    def get_recommendations(self, profile: LearnerProfile, candidates: List[Dict[str, Any]]) -> List[RecommendationItem]:
        """
        Rank candidates (courses/jobs) for the user.
        """
        if not candidates:
            return []

        # 1. Embed Profile (Career Goal + Skills)
        query_text = f"{profile.career_goal} {' '.join(profile.skills)}"
        query_embedding = self.embedding_model.encode(query_text)

        # 2. Embed Candidates
        candidate_texts = [f"{c.get('title', '')} {c.get('description', '')}" for c in candidates]
        candidate_embeddings = self.embedding_model.encode(candidate_texts)

        # 3. Cosine Similarity
        similarities = cosine_similarity([query_embedding], candidate_embeddings)[0]

        # 4. Rank and Format
        recommendations = []
        for i, score in enumerate(similarities):
            candidate = candidates[i]
            # Explainability (Simple)
            reasons = []
            if score > 0.7:
                reasons.append("High match with your career goal")
            if any(s.lower() in candidate.get('description', '').lower() for s in profile.skills):
                reasons.append("Matches your skills")

            rec = RecommendationItem(
                id=str(candidate.get('id', i)),
                title=candidate.get('title', 'Unknown'),
                type=candidate.get('type', 'course'),
                score=float(score),
                reasons=reasons,
                metadata=candidate
            )
            recommendations.append(rec)

        # Sort by score desc
        recommendations.sort(key=lambda x: x.score, reverse=True)
        return recommendations

ml_service = MLService()
