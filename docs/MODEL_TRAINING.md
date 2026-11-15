# Training

Run from repository root after installing `ml/requirements.txt` and preparing a patient-isolated manifest:

```powershell
py -3.12 -m ml.training.image datasets\split_manifest.csv --output artifacts --epochs 30 --batch-size 16
py -3.12 -m ml.training.clinical datasets\split_manifest.csv --output artifacts
py -3.12 -m ml.training.calibrate datasets\split_manifest.csv --artifacts artifacts
py -3.12 -m ml.evaluation.evaluate_artifacts datasets\split_manifest.csv --artifacts artifacts
```

Use `--resume` for image training from its best saved checkpoint. Training uses CUDA when available and CPU otherwise. The clinical preprocessing pipeline is fitted only on training rows. Isotonic probability calibration and equal ensemble weights use validation rows; the final evaluation uses test rows. For robust research results, use a separate calibration partition and external validation, and tune image imbalance handling and training hyperparameters. No such validation has been performed here.

The runtime expects `mspe.pt`, `xgb.joblib`, `ann.pt`, `clinical_preprocessor.joblib`, `calibrators.joblib`, and `ensemble.json` in `artifacts/`. Checkpoints must share the manifest schema. Untrusted artifact files must never be loaded, because PyTorch/joblib serialization can execute code.
