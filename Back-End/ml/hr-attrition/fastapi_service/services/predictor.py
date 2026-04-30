"""
predictor.py
============
Loads the trained RandomForest model once at startup
and exposes a predict() method used by the API route.
"""

import os
import joblib
import numpy as np
from utils.feature_builder import build_features, risk_level

# ── Resolve path to models/ folder ──
# services/predictor.py  →  services/  →  fastapi_service/  →  hr-attrition/  →  models/
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(BASE_DIR, "models")


class AttritionPredictor:
    """Singleton-style predictor — model loaded once at app startup."""

    def __init__(self):
        model_path = os.path.join(MODELS_DIR, "hr_attrition_model.pkl")

        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model not found at {model_path}. "
                "Run train.py first to generate the model."
            )

        self.model = joblib.load(model_path)
        print(f"✅ Model loaded from {model_path}")

    def predict(self, employee) -> dict:
        """
        Returns:
            {
                "risk": 0.82,          # probability 0.0 → 1.0
                "level": "high",       # low | medium | high
                "will_leave": True     # boolean hard prediction
            }
        """
        features     = build_features(employee)
        probability  = float(self.model.predict_proba(features)[0][1])
        will_leave   = bool(self.model.predict(features)[0] == 1)

        return {
            "risk":       round(probability, 4),
            "level":      risk_level(probability),
            "will_leave": will_leave,
        }


# Single instance — imported by main.py
predictor = AttritionPredictor()
