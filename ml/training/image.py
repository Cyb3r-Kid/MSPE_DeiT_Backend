"""MSPE-DeiT training with patient-isolated manifest and validation checkpointing."""
import argparse
import json
import time
from pathlib import Path

import pandas as pd
import torch
from PIL import Image
from sklearn.metrics import roc_auc_score
from torch.utils.data import DataLoader, Dataset

from ml.architectures.mspe_deit import MSPEDeiT
from ml.preprocessing.images import inference_transform, training_transform


class Lesions(Dataset):
    def __init__(self, rows, training=False):
        self.rows = rows.reset_index(drop=True)
        self.transform = training_transform() if training else inference_transform

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index):
        row = self.rows.iloc[index]
        with Image.open(row.image_path) as image:
            tensor = self.transform(image)
        return tensor, torch.tensor(float(row.label)), row.modality


def epoch_run(model, loader, device, optimizer=None):
    model.train(optimizer is not None)
    losses, labels, probabilities = [], [], []
    for images, targets, modalities in loader:
        images, targets = images.to(device), targets.to(device)
        if optimizer:
            optimizer.zero_grad()
        # Samples can have different modality projections; batch by modality.
        logits = torch.empty(len(modalities), device=device)
        for modality in set(modalities):
            indices = [i for i, value in enumerate(modalities) if value == modality]
            logits[indices] = model(images[indices], modality)
        loss = torch.nn.functional.binary_cross_entropy_with_logits(logits, targets)
        if optimizer:
            loss.backward()
            optimizer.step()
        losses.append(loss.item())
        labels.extend(targets.detach().cpu().tolist())
        probabilities.extend(torch.sigmoid(logits).detach().cpu().tolist())
    auroc = roc_auc_score(labels, probabilities) if len(set(labels)) == 2 else None
    return {"loss": sum(losses) / len(losses), "auroc": auroc}


def train(manifest, output, epochs=30, batch_size=16, seed=42, resume=False):
    torch.manual_seed(seed)
    frame = pd.read_csv(manifest)
    train_rows = frame[frame.split == "train"]
    valid_rows = frame[frame.split == "validation"]
    if train_rows.empty or valid_rows.empty:
        raise ValueError("Train and validation split required")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = MSPEDeiT().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    output.mkdir(parents=True, exist_ok=True)
    checkpoint_path = output / "mspe.pt"
    start_epoch, best = 0, float("inf")
    if resume and checkpoint_path.exists():
        checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
        model.load_state_dict(checkpoint["state_dict"])
        optimizer.load_state_dict(checkpoint["optimizer"])
        start_epoch, best = checkpoint["epoch"] + 1, checkpoint["validation_loss"]
    train_loader = DataLoader(Lesions(train_rows, training=True), batch_size=batch_size, shuffle=True)
    valid_loader = DataLoader(Lesions(valid_rows), batch_size=batch_size)
    patience = 0
    for epoch in range(start_epoch, epochs):
        start = time.perf_counter()
        training = epoch_run(model, train_loader, device, optimizer)
        with torch.no_grad():
            validation = epoch_run(model, valid_loader, device)
        scheduler.step()
        print(json.dumps({"epoch": epoch + 1, "training": training, "validation": validation, "seconds": time.perf_counter() - start}))
        if validation["loss"] < best:
            best, patience = validation["loss"], 0
            torch.save({"state_dict": model.state_dict(), "optimizer": optimizer.state_dict(), "epoch": epoch, "validation_loss": best, "architecture": "MSPEDeiT-v1", "seed": seed}, checkpoint_path)
        else:
            patience += 1
        if patience >= 8:
            break


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest")
    parser.add_argument("--output", type=Path, default=Path("artifacts"))
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    train(args.manifest, args.output, args.epochs, args.batch_size, resume=args.resume)
