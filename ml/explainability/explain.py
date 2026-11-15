"""Input integrated gradients and clinical feature attribution for saved artifacts."""
import base64
import io
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
from PIL import Image

from ml.architectures.mspe_deit import MSPEDeiT
from ml.preprocessing.images import inference_transform
from ml.training.ann import ClinicalANN


def integrated_gradients(model, value, forward, steps=8):
    baseline = torch.zeros_like(value)
    total = torch.zeros_like(value)
    for fraction in torch.linspace(1 / steps, 1, steps, device=value.device):
        sample = (baseline + fraction * (value - baseline)).detach().requires_grad_(True)
        output = forward(model, sample)
        gradient = torch.autograd.grad(output.sum(), sample)[0]
        total += gradient.detach()
    return ((value - baseline) * total / steps).detach()


def explain(image_path: str, modality: str, clinical: dict, artifacts: Path):
    import shap
    metadata = json.loads((artifacts / "ensemble.json").read_text(encoding="utf-8"))
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = MSPEDeiT().to(device)
    model.load_state_dict(torch.load(artifacts / "mspe.pt", map_location=device, weights_only=True)["state_dict"])
    model.eval()
    with Image.open(image_path) as original:
        display = original.convert("RGB").resize((224, 224))
        image = inference_transform(original).unsqueeze(0).to(device)
    attribution = integrated_gradients(model, image, lambda m, x: m(x, modality))
    heat = attribution.abs().sum(dim=1).squeeze(0).cpu().numpy()
    scale = np.percentile(heat, 99)
    heat = np.clip(heat / scale, 0, 1) if scale > 0 else np.zeros_like(heat)
    pixels = np.asarray(display).astype(np.float32)
    pixels[:, :, 0] = pixels[:, :, 0] * (1 - 0.45 * heat) + 255 * 0.45 * heat
    pixels[:, :, 1:] *= (1 - 0.45 * heat[:, :, None])
    overlay = Image.fromarray(np.uint8(np.clip(pixels, 0, 255)))
    buffer = io.BytesIO()
    overlay.save(buffer, format="PNG")
    preprocessing = joblib.load(artifacts / "clinical_preprocessor.joblib")
    fields = metadata["clinical_fields"]
    features = preprocessing.transform(pd.DataFrame([{field: clinical.get(field) for field in fields}]))
    features = features.toarray() if hasattr(features, "toarray") else features
    names = preprocessing.get_feature_names_out().tolist()
    xgb = joblib.load(artifacts / "xgb.joblib")
    raw_shap = shap.TreeExplainer(xgb).shap_values(features)
    xgb_values = np.asarray(raw_shap)
    if xgb_values.ndim == 3:
        xgb_values = xgb_values[:, :, 1]
    checkpoint = torch.load(artifacts / "ann.pt", map_location=device, weights_only=True)
    ann = ClinicalANN(checkpoint["input_dim"], checkpoint["hidden_dims"], checkpoint["dropout"]).to(device)
    ann.load_state_dict(checkpoint["state_dict"])
    ann.eval()
    ann_features = torch.tensor(features, dtype=torch.float32, device=device)
    ann_values = integrated_gradients(ann, ann_features, lambda m, x: m(x)).squeeze(0).cpu().numpy()
    return {
        "available": True,
        "image_method": "Input integrated gradients, 8 steps, zero normalized baseline",
        "image_overlay_png_base64": base64.b64encode(buffer.getvalue()).decode("ascii"),
        "xgboost_method": "Tree SHAP on preprocessed features",
        "xgboost_contributions": [{"feature": name, "value": float(value)} for name, value in zip(names, xgb_values[0])],
        "ann_method": "Input integrated gradients, 8 steps, zero feature baseline",
        "ann_contributions": [{"feature": name, "value": float(value)} for name, value in zip(names, ann_values)],
        "limitations": "Attribution depends on preprocessing and baseline. Highlighted pixels are not proven cancer locations. Feature contributions are in model output space, not causal effects.",
    }
