"""Train clinical models on the same schema; fit preprocessing on train only."""
import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

from ml.training.ann import ClinicalANN, focal_loss

FIELDS = ["age", "sex", "anatomical_location"]


def make_preprocessor():
    return ColumnTransformer([
        ("numeric", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), ["age"]),
        ("categorical", Pipeline([("impute", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), ["sex", "anatomical_location"]),
    ])


def train(frame: pd.DataFrame, output: Path, epochs=100, seed=42):
    torch.manual_seed(seed)
    np.random.seed(seed)
    required = set(FIELDS + ["label", "split"])
    if not required.issubset(frame.columns):
        raise ValueError(f"Missing columns: {sorted(required - set(frame.columns))}")
    train = frame[frame.split == "train"]
    valid = frame[frame.split == "validation"]
    if train.empty or valid.empty:
        raise ValueError("Train and validation rows required")
    preprocessing = make_preprocessor().fit(train[FIELDS])
    X_train = preprocessing.transform(train[FIELDS])
    X_valid = preprocessing.transform(valid[FIELDS])
    X_train = X_train.toarray() if hasattr(X_train, "toarray") else X_train
    X_valid = X_valid.toarray() if hasattr(X_valid, "toarray") else X_valid
    y_train = train.label.to_numpy(dtype=np.float32)
    y_valid = valid.label.to_numpy(dtype=np.float32)
    positives = max(1, int(y_train.sum()))
    negatives = max(1, len(y_train) - positives)
    xgb = XGBClassifier(n_estimators=300, max_depth=3, learning_rate=0.03, subsample=0.8, colsample_bytree=0.8, scale_pos_weight=negatives / positives, random_state=seed, eval_metric="logloss")
    xgb.fit(X_train, y_train, eval_set=[(X_valid, y_valid)], verbose=False)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ann = ClinicalANN(X_train.shape[1]).to(device)
    optimizer = torch.optim.AdamW(ann.parameters(), lr=1e-3)
    train_x = torch.tensor(X_train, dtype=torch.float32, device=device)
    train_y = torch.tensor(y_train, dtype=torch.float32, device=device)
    valid_x = torch.tensor(X_valid, dtype=torch.float32, device=device)
    valid_y = torch.tensor(y_valid, dtype=torch.float32, device=device)
    best_loss = float("inf")
    best_state = None
    patience = 0
    for epoch in range(epochs):
        ann.train()
        optimizer.zero_grad()
        loss = focal_loss(ann(train_x), train_y)
        loss.backward()
        optimizer.step()
        ann.eval()
        with torch.no_grad():
            validation_loss = focal_loss(ann(valid_x), valid_y).item()
        if validation_loss < best_loss:
            best_loss = validation_loss
            best_state = {key: value.detach().cpu().clone() for key, value in ann.state_dict().items()}
            patience = 0
        else:
            patience += 1
        if patience >= 15:
            break
    output.mkdir(parents=True, exist_ok=True)
    joblib.dump(preprocessing, output / "clinical_preprocessor.joblib")
    joblib.dump(xgb, output / "xgb.joblib")
    torch.save({"state_dict": best_state, "input_dim": X_train.shape[1], "hidden_dims": (128, 64, 32), "dropout": 0.2, "fields": FIELDS}, output / "ann.pt")
    (output / "clinical_training.json").write_text(json.dumps({"train_count": len(train), "validation_count": len(valid), "ann_validation_loss": best_loss, "epochs_run": epoch + 1, "seed": seed}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest")
    parser.add_argument("--output", default="artifacts")
    args = parser.parse_args()
    train(pd.read_csv(args.manifest), Path(args.output))
