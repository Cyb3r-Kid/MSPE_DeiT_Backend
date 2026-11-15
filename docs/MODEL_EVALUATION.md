# Evaluation

`ml.evaluation.evaluate_artifacts` writes `artifacts/test_evaluation.json` with sample count, malignant count, prevalence, accuracy, precision, recall/sensitivity, specificity, F1, AUROC, AUPRC, Brier score, confusion matrix, source, modality, checkpoint, split and date. Metrics are computed from held-out labels and model outputs. No metrics have been measured in this repository.

The accuracy 91.76%, AUROC 0.953, specificity 91.77%, and sensitivity 84.81% in the user brief are external research benchmarks, **not results of this implementation**. Calibration quality, uncertainty intervals, subgroup performance, and external modality validation remain necessary.
