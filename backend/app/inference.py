"""Artifact-backed inference. No synthetic outputs or automatic demo fallback."""
import json
import os
from pathlib import Path

from fastapi import HTTPException


def artifact_dir() -> Path:
    return Path(os.getenv("ARTIFACT_DIR", "../artifacts")).resolve()


def status() -> dict:
    root = artifact_dir()
    names = ("mspe.pt", "xgb.joblib", "ann.pt", "clinical_preprocessor.joblib", "calibrators.joblib", "ensemble.json")
    files = {name: (root / name).is_file() for name in names}
    valid_metadata = False
    if all(files.values()):
        try:
            data = json.loads((root / "ensemble.json").read_text(encoding="utf-8"))
            valid_metadata = (len(data["weights"]) == 3 and abs(sum(data["weights"]) - 1) < 1e-6 and 0 <= data["threshold"] <= 1 and data["model_version"] and data["calibration_version"] and data["clinical_fields"] and data["modalities"])
        except (ValueError, KeyError, TypeError, OSError):
            pass
    ready = bool(all(files.values()) and valid_metadata)
    return {"ready": ready, "artifacts": files, "mode": "real" if ready else "unavailable", "supported_modalities": ["dermoscopic", "tbp_3d"]}


def metadata() -> dict:
    path = artifact_dir() / "ensemble.json"
    if not path.is_file():
        return {"ready": False, "clinical_fields": ["age", "sex", "anatomical_location"], "note": "No validated model artifacts installed"}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        raise HTTPException(503, "Model metadata is unreadable")
    return {"ready": status()["ready"], "clinical_fields": data.get("clinical_fields", []), "model_version": data.get("model_version"), "modalities": data.get("modalities", [])}


def predict(image_path: str, modality: str, clinical: dict) -> dict:
    if modality not in ("dermoscopic", "tbp_3d"):
        raise HTTPException(422, "Smartphone photos are not validated for this model; use a supported research modality")
    if not status()["ready"]:
        raise HTTPException(503, "Model unavailable: install trained, calibrated, compatible artifacts")
    try:
        import joblib
        import torch
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
        from PIL import Image
        from ml.architectures.mspe_deit import MSPEDeiT
        from ml.training.ann import ClinicalANN
        from ml.inference.ensemble import fuse
        from ml.preprocessing.images import inference_transform
        root = artifact_dir()
        meta = json.loads((root / "ensemble.json").read_text(encoding="utf-8"))
        if modality not in meta["modalities"]:
            raise HTTPException(422, "Modality was not evaluated for this checkpoint")
        fields = meta["clinical_fields"]
        missing = [field for field in fields if clinical.get(field) is None]
        if missing:
            raise HTTPException(422, f"Required clinical fields missing: {', '.join(missing)}")
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        image_model = MSPEDeiT()
        image_checkpoint = torch.load(root / "mspe.pt", map_location=device, weights_only=True)
        image_model.load_state_dict(image_checkpoint["state_dict"])
        image_model.to(device).eval()
        with Image.open(image_path) as image:
            tensor = inference_transform(image).unsqueeze(0).to(device)
        with torch.no_grad():
            image_probability = torch.sigmoid(image_model(tensor, modality)).item()
        preprocessor = joblib.load(root / "clinical_preprocessor.joblib")
        import pandas as pd
        X = preprocessor.transform(pd.DataFrame([{field: clinical.get(field) for field in fields}]))
        xgb = joblib.load(root / "xgb.joblib")
        xgb_probability = float(xgb.predict_proba(X)[0, 1])
        ann_checkpoint = torch.load(root / "ann.pt", map_location=device, weights_only=True)
        ann = ClinicalANN(ann_checkpoint["input_dim"], ann_checkpoint["hidden_dims"], ann_checkpoint["dropout"])
        ann.load_state_dict(ann_checkpoint["state_dict"])
        ann.to(device).eval()
        with torch.no_grad():
            ann_probability = torch.sigmoid(ann(torch.tensor(X.toarray() if hasattr(X, "toarray") else X, dtype=torch.float32, device=device))).item()
        probabilities = [image_probability, xgb_probability, ann_probability]
        # Calibration is mandatory and represented by fitted per-model maps.
        calibrators = joblib.load(root / "calibrators.joblib")
        probabilities = [float(calibrators[key].predict([value])[0]) for key, value in zip(("image", "xgb", "ann"), probabilities)]
        final = fuse(probabilities, meta["weights"])
        return {"model_version": meta["model_version"], "image_probability": probabilities[0], "xgboost_probability": probabilities[1], "ann_probability": probabilities[2], "ensemble_probability": final, "threshold": meta["threshold"], "calibration_version": meta["calibration_version"]}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, "Model artifacts are incompatible or inference failed") from exc
