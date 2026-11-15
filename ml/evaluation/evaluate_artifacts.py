import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from ml.evaluation.metrics import evaluate
from ml.training.calibrate import probabilities


def test_evaluation(manifest: Path, artifacts: Path):
    frame = pd.read_csv(manifest)
    test = frame[frame.split == "test"]
    if test.empty:
        raise ValueError("No held-out test rows")
    meta = json.loads((artifacts / "ensemble.json").read_text())
    raw = probabilities(test, artifacts)
    calibrators = joblib.load(artifacts / "calibrators.joblib")
    calibrated = np.column_stack([calibrators[name].predict(raw[:, index]) for index, name in enumerate(("image", "xgb", "ann"))])
    result = {name: evaluate(test.label, calibrated[:, index], meta["threshold"]) for index, name in enumerate(("image", "xgb", "ann"))}
    result["ensemble"] = evaluate(test.label, calibrated @ np.asarray(meta["weights"]), meta["threshold"])
    result["metadata"] = {"sources": sorted(test.source.unique().tolist()), "modalities": sorted(test.modality.unique().tolist()), "split": "patient-isolated held-out test", "checkpoint": meta["model_version"], "evaluated_at": datetime.now(timezone.utc).isoformat()}
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--artifacts", type=Path, default=Path("artifacts"))
    args = parser.parse_args()
    result = test_evaluation(args.manifest, args.artifacts)
    (args.artifacts / "test_evaluation.json").write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))
