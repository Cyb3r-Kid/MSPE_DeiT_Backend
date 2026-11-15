"""Local manifest validation and patient isolated 60/20/20 splitting."""
import argparse
import hashlib
from pathlib import Path

import pandas as pd
from PIL import Image
from sklearn.model_selection import StratifiedGroupKFold

REQUIRED = {"image_path", "patient_id", "label", "modality", "source"}


def validate_manifest(frame: pd.DataFrame):
    missing = REQUIRED - set(frame.columns)
    if missing:
        raise ValueError(f"Missing manifest columns: {sorted(missing)}")
    if not set(frame.label.dropna().unique()).issubset({0, 1}):
        raise ValueError("Labels must be binary")
    if frame["patient_id"].isna().any() or frame["label"].isna().any():
        raise ValueError("Missing patient ID or label")
    if not set(frame.modality.unique()).issubset({"dermoscopic", "tbp_3d"}):
        raise ValueError("Unsupported image modality")
    hashes = []
    for path in frame.image_path:
        p = Path(path)
        with Image.open(p) as image:
            image.verify()
        hashes.append(hashlib.sha256(p.read_bytes()).hexdigest())
    frame = frame.copy()
    frame["sha256"] = hashes
    duplicates = frame.groupby("sha256").patient_id.nunique()
    if (duplicates > 1).any():
        raise ValueError("Identical images occur under different patients")
    return frame


def split_manifest(frame: pd.DataFrame, seed=42):
    frame = validate_manifest(frame)
    if frame.patient_id.nunique() < 5:
        raise ValueError("At least five patients are required for isolated 60/20/20 splits")
    splitter = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=seed)
    folds = list(splitter.split(frame, frame.label, frame.patient_id))
    test_indices = folds[0][1]
    validation_indices = folds[1][1]
    if set(frame.iloc[test_indices].patient_id) & set(frame.iloc[validation_indices].patient_id):
        raise ValueError("Patient leakage across folds")
    result = frame.copy()
    result["split"] = "train"
    result.iloc[test_indices, result.columns.get_loc("split")] = "test"
    result.iloc[validation_indices, result.columns.get_loc("split")] = "validation"
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input_csv")
    parser.add_argument("output_csv")
    args = parser.parse_args()
    split_manifest(pd.read_csv(args.input_csv)).to_csv(args.output_csv, index=False)
