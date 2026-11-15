"""Fit calibration and ensemble weights on held-out validation rows only."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
from PIL import Image
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import brier_score_loss

from ml.architectures.mspe_deit import MSPEDeiT
from ml.preprocessing.images import inference_transform
from ml.training.ann import ClinicalANN
from ml.training.clinical import FIELDS


def probabilities(frame: pd.DataFrame, artifacts: Path):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    image_model = MSPEDeiT().to(device)
    image_model.load_state_dict(torch.load(artifacts / "mspe.pt", map_location=device, weights_only=True)["state_dict"])
    image_model.eval()
    preprocessing = joblib.load(artifacts / "clinical_preprocessor.joblib")
    features = preprocessing.transform(frame[FIELDS])
    features = features.toarray() if hasattr(features, "toarray") else features
    xgb = joblib.load(artifacts / "xgb.joblib")
    xgb_scores = xgb.predict_proba(features)[:, 1]
    checkpoint = torch.load(artifacts / "ann.pt", map_location=device, weights_only=True)
    ann = ClinicalANN(checkpoint["input_dim"], checkpoint["hidden_dims"], checkpoint["dropout"]).to(device)
    ann.load_state_dict(checkpoint["state_dict"])
    ann.eval()
    with torch.no_grad():
        ann_scores = torch.sigmoid(ann(torch.tensor(features, dtype=torch.float32, device=device))).cpu().numpy()
    image_scores = []
    with torch.no_grad():
        for row in frame.itertuples():
            with Image.open(row.image_path) as image:
                tensor = inference_transform(image).unsqueeze(0).to(device)
            image_scores.append(torch.sigmoid(image_model(tensor, row.modality)).item())
    return np.column_stack([image_scores, xgb_scores, ann_scores])


def calibrate(manifest: Path, artifacts: Path):
    frame = pd.read_csv(manifest)
    valid = frame[frame.split == "validation"]
    if len(valid) < 30 or valid.label.nunique() < 2:
        raise ValueError("Calibration needs at least 30 validation cases and both classes")
    raw = probabilities(valid, artifacts)
    labels = valid.label.to_numpy()
    calibrators = {}
    calibrated = []
    for index, name in enumerate(("image", "xgb", "ann")):
        calibrator = IsotonicRegression(out_of_bounds="clip").fit(raw[:, index], labels)
        calibrators[name] = calibrator
        calibrated.append(calibrator.predict(raw[:, index]))
    calibrated = np.column_stack(calibrated)
    # The documented research baseline uses equal weights. No test data is touched.
    weights = [1 / 3] * 3
    final = calibrated @ np.asarray(weights)
    threshold = 0.5
    joblib.dump(calibrators, artifacts / "calibrators.joblib")
    metadata = {"model_version": "mspe-deit-v1", "calibration_version": datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"), "clinical_fields": FIELDS, "modalities": sorted(valid.modality.unique().tolist()), "weights": weights, "threshold": threshold, "validation_count": len(valid), "validation_brier": float(brier_score_loss(labels, final)), "note": "Threshold is a research operating point, not a clinically validated risk category."}
    (artifacts / "ensemble.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--artifacts", type=Path, default=Path("artifacts"))
    args = parser.parse_args()
    print(json.dumps(calibrate(args.manifest, args.artifacts), indent=2))
