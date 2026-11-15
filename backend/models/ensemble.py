"""Soft-voting ensemble fusion for MSPE-DeiT multimodal framework.
Combines MSPE-DeiT, XGBoost, and ANN probability branches.
"""
from typing import Dict, List, Optional, Tuple, Union
import math


def soft_vote(
    p_mspe: float,
    p_xgb: float,
    p_ann: float,
    weights: Optional[Tuple[float, float, float]] = None,
) -> float:
    """Computes soft-voting ensemble probability.
    
    Default: equal-weighted average (1/3, 1/3, 1/3).
    """
    for name, p in [("MSPE-DeiT", p_mspe), ("XGBoost", p_xgb), ("ANN", p_ann)]:
        if not math.isfinite(p) or not (0.0 <= p <= 1.0):
            raise ValueError(f"{name} probability must be in [0.0, 1.0], got {p}")

    if weights is None:
        weights = (1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0)

    if len(weights) != 3 or not math.isclose(sum(weights), 1.0, abs_tol=1e-5):
        raise ValueError(f"Weights must be length 3 and sum to 1.0, got {weights}")

    p_final = p_mspe * weights[0] + p_xgb * weights[1] + p_ann * weights[2]
    return float(max(0.0, min(1.0, p_final)))


def classify_risk(probability: float) -> Tuple[str, str]:
    """Classifies risk level and provides clinical decision support recommendation.
    
    Thresholds:
      - Low Risk: < 0.30
      - Moderate Risk: 0.30 - 0.65
      - High Risk: > 0.65
    """
    if probability < 0.30:
        level = "Low Risk"
        rec = "Lesion features indicate low malignancy probability. Routine self-monitoring advised; re-screen if ABCDE changes occur."
    elif probability <= 0.65:
        level = "Moderate Risk"
        rec = "Atypical features detected. Dermatological clinical examination and serial digital dermoscopy recommended within 4-6 weeks."
    else:
        level = "High Risk"
        rec = "Dermatology referral recommended for dermoscopic biopsy correlation and histopathological evaluation."
    return level, rec


def ensemble_assessment(
    p_mspe: float,
    p_xgb: float,
    p_ann: float,
    weights: Optional[Tuple[float, float, float]] = None,
) -> Dict[str, Union[float, str, Dict[str, float]]]:
    """Complete ensemble evaluation with branch breakdown and risk level."""
    p_final = soft_vote(p_mspe, p_xgb, p_ann, weights)
    risk_level, recommendation = classify_risk(p_final)

    return {
        "ensemble_probability": round(p_final, 4),
        "risk_level": risk_level,
        "recommendation": recommendation,
        "model_probabilities": {
            "mspe_deit": round(p_mspe, 4),
            "xgboost": round(p_xgb, 4),
            "ann": round(p_ann, 4),
        },
    }


# Backwards compatibility with ml.inference.ensemble
def fuse(probabilities: List[float], weights=(1 / 3, 1 / 3, 1 / 3)) -> float:
    if len(probabilities) != 3:
        raise ValueError("Three model probabilities are required")
    return soft_vote(probabilities[0], probabilities[1], probabilities[2], tuple(weights))
