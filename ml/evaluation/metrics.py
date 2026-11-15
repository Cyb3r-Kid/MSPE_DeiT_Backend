import numpy as np
from sklearn.metrics import accuracy_score, average_precision_score, brier_score_loss, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score


def evaluate(y_true, probabilities, threshold=0.5):
    labels = np.asarray(y_true)
    scores = np.asarray(probabilities)
    prediction = scores >= threshold
    tn, fp, fn, tp = confusion_matrix(labels, prediction, labels=[0, 1]).ravel()
    return {
        "sample_count": int(len(labels)), "malignant_count": int(labels.sum()), "prevalence": float(labels.mean()),
        "accuracy": float(accuracy_score(labels, prediction)), "precision": float(precision_score(labels, prediction, zero_division=0)),
        "recall": float(recall_score(labels, prediction, zero_division=0)), "f1": float(f1_score(labels, prediction, zero_division=0)),
        "sensitivity": float(tp / (tp + fn)) if tp + fn else None, "specificity": float(tn / (tn + fp)) if tn + fp else None,
        "auroc": float(roc_auc_score(labels, scores)) if len(set(labels)) == 2 else None,
        "auprc": float(average_precision_score(labels, scores)) if len(set(labels)) == 2 else None,
        "brier": float(brier_score_loss(labels, scores)), "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]], "threshold": threshold,
    }
