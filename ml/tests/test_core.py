import pytest

from ml.inference.ensemble import fuse


def test_equal_weight_fusion():
    assert fuse([0.2, 0.4, 0.6]) == pytest.approx(0.4)


def test_missing_model_cannot_be_fused():
    with pytest.raises(ValueError):
        fuse([0.2, 0.4])


def test_modality_routes_and_gradients():
    torch = pytest.importorskip("torch")
    pytest.importorskip("timm")
    from ml.architectures.mspe_deit import MSPEDeiT
    model = MSPEDeiT(depth=1)
    data = torch.randn(1, 3, 224, 224)
    output = model(data, "dermoscopic")
    assert output.shape == (1,)
    output.sum().backward()
    assert model.patch_embeddings["dermoscopic"].weight.grad is not None
    assert model.patch_embeddings["tbp_3d"].weight.grad is None
    with pytest.raises(ValueError):
        model(data, "smartphone")


def test_ann_forward_pass():
    torch = pytest.importorskip("torch")
    from ml.training.ann import ClinicalANN
    model = ClinicalANN(input_dim=8, hidden_dims=[64, 32], dropout=0.3)
    x = torch.randn(4, 8)
    with torch.no_grad():
        out = torch.sigmoid(model(x))
    assert out.shape == (4,)
    assert all(0.0 <= v.item() <= 1.0 for v in out.flatten())


def test_xgboost_available():
    xgb = pytest.importorskip("xgboost")
    import numpy as np
    booster = xgb.XGBClassifier(n_estimators=5, max_depth=2, use_label_encoder=False, eval_metric='logloss')
    X = np.random.rand(20, 5).astype(np.float32)
    y = np.array([0,1]*10)
    booster.fit(X, y)
    probs = booster.predict_proba(X)[:,1]
    assert all(0.0 <= p <= 1.0 for p in probs)


def test_ensemble_soft_voting_equal_weights():
    from ml.inference.ensemble import fuse
    result = fuse([0.8, 0.7, 0.9])
    assert abs(result - (0.8+0.7+0.9)/3) < 1e-9
