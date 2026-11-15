"""Export data quality summaries without changing source observations."""
import argparse
import json
from pathlib import Path

import pandas as pd

from ml.datasets.manifest import validate_manifest


def inspect(manifest: Path, output: Path):
    frame = validate_manifest(pd.read_csv(manifest))
    output.mkdir(parents=True, exist_ok=True)
    summary = {
        "rows": len(frame),
        "patients": int(frame.patient_id.nunique()),
        "class_counts": {str(key): int(value) for key, value in frame.label.value_counts().items()},
        "modalities": {str(key): int(value) for key, value in frame.modality.value_counts().items()},
        "sources": {str(key): int(value) for key, value in frame.source.value_counts().items()},
        "missing_clinical": {column: int(frame[column].isna().sum()) for column in ("age", "sex", "anatomical_location") if column in frame.columns},
        "duplicate_images": int(frame.sha256.duplicated().sum()),
    }
    (output / "dataset_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(5, 3))
    frame.label.value_counts().sort_index().plot.bar(ax=ax, color=["#102A43", "#12B8A6"])
    ax.set(xlabel="Binary label", ylabel="Images", title="Class distribution")
    fig.tight_layout()
    fig.savefig(output / "class_distribution.png", dpi=160)
    plt.close(fig)
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, default=Path("artifacts/dataset_inspection"))
    args = parser.parse_args()
    print(json.dumps(inspect(args.manifest, args.output), indent=2))
