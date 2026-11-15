import torch
from torch import nn


class ClinicalANN(nn.Module):
    def __init__(self, input_dim: int, hidden_dims=(128, 64, 32), dropout=0.2):
        super().__init__()
        layers = []
        previous = input_dim
        for width in hidden_dims:
            layers.extend([nn.Linear(previous, width), nn.ReLU(), nn.Dropout(dropout)])
            previous = width
        layers.append(nn.Linear(previous, 1))
        self.layers = nn.Sequential(*layers)

    def forward(self, x):
        return self.layers(x).squeeze(-1)


def focal_loss(logits, targets, gamma=2.0, alpha=0.5):
    cross_entropy = nn.functional.binary_cross_entropy_with_logits(logits, targets.float(), reduction="none")
    probability = torch.exp(-cross_entropy)
    return (alpha * (1 - probability).pow(gamma) * cross_entropy).mean()
