"""Automated verification tests for MSPE-DeiT model architecture,
clinical tabular classifiers, and soft-voting ensemble.
"""
import pytest
import torch
import numpy as np

from models.mspe_deit import MSPEDeiT, load_or_init_mspe_deit
from models.clinical_models import ANNClinicalModel, XGBoostClinicalModel, load_or_init_ann
from models.ensemble import soft_vote, classify_risk, ensemble_assessment, fuse


def test_mspe_deit_forward_dermoscopy():
    """Verify MSPE-DeiT forward pass with (1, 3, 224, 224) dummy tensor under dermoscopy."""
    model = MSPEDeiT(depth=2)  # depth=2 for fast test execution
    model.eval()
    dummy = torch.randn(1, 3, 224, 224)

    with torch.no_grad():
        logits = model(dummy, modality="dermoscopy")
        prob = model.predict_proba(dummy, modality="dermoscopy")

    assert logits.shape == (1,)
    assert prob.shape == (1,)
    assert 0.0 <= prob.item() <= 1.0


def test_mspe_deit_forward_3d_tbp():
    """Verify MSPE-DeiT forward pass under 3D Total Body Photography modality."""
    model = MSPEDeiT(depth=2)
    model.eval()
    dummy = torch.randn(1, 3, 224, 224)

    with torch.no_grad():
        logits = model(dummy, modality="3d_tbp")
        prob = model.predict_proba(dummy, modality="3d_tbp")

    assert logits.shape == (1,)
    assert prob.shape == (1,)
    assert 0.0 <= prob.item() <= 1.0


def test_mspe_deit_modality_specific_weights():
    """Ensure dermoscopy and 3D-TBP routes use distinct projection layers."""
    model = MSPEDeiT(depth=1)
    assert model.patch_embed_dermoscopy is not model.patch_embed_tbp
    # Ensure invalid modality raises descriptive error
    with pytest.raises(ValueError):
        model(torch.randn(1, 3, 224, 224), modality="unsupported_camera")


def test_tabular_ann_forward_pass_and_range():
    """Verify ANN 3-dense-block forward pass produces probabilities in [0.0, 1.0]."""
    model = ANNClinicalModel(input_dim=14, hidden_dims=[64, 32, 16])
    model.eval()
    x = torch.randn(4, 14)

    with torch.no_grad():
        logits = model(x)
        probs = model.predict_proba(x)

    assert logits.shape == (4,)
    assert probs.shape == (4,)
    for p in probs:
        assert 0.0 <= p.item() <= 1.0


def test_xgboost_prediction_range():
    """Verify XGBoost classifier outputs valid probabilities in [0.0, 1.0]."""
    xgb_wrapper = XGBoostClinicalModel()
    X_test = np.random.rand(5, 14).astype(np.float32)
    probs = xgb_wrapper.predict_proba(X_test)

    assert len(probs) == 5
    for p in probs:
        assert 0.0 <= float(p) <= 1.0


def test_soft_voting_ensemble_accuracy():
    """Verify equal-weighted soft-voting ensemble accuracy (P_final = (P1 + P2 + P3) / 3)."""
    p_mspe = 0.812
    p_xgb = 0.745
    p_ann = 0.795
    expected = (0.812 + 0.745 + 0.795) / 3.0

    result = soft_vote(p_mspe, p_xgb, p_ann)
    assert abs(result - expected) < 1e-5


def test_ensemble_risk_classification():
    """Verify risk classification tiers (<0.30 low, 0.30-0.65 moderate, >0.65 high)."""
    low_lvl, _ = classify_risk(0.15)
    assert low_lvl == "Low Risk"

    mod_lvl, _ = classify_risk(0.45)
    assert mod_lvl == "Moderate Risk"

    high_lvl, _ = classify_risk(0.78)
    assert high_lvl == "High Risk"

