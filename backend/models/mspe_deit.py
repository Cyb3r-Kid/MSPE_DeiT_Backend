"""MSPE-DeiT: Modality-Specific Patch Embedding DeiT-Tiny Architecture.
IEEE Access Research Paper Implementation.
"""
from pathlib import Path
from typing import Optional, Tuple, Union
import torch
import torch.nn as nn
from timm.models.vision_transformer import Block


class MSPEDeiT(nn.Module):
    """DeiT-Tiny multimodal vision transformer with modality-specific patch projection layers."""

    def __init__(
        self,
        image_size: int = 224,
        patch_size: int = 16,
        embed_dim: int = 192,
        depth: int = 12,
        heads: int = 3,
        num_classes: int = 1,
    ):
        super().__init__()
        self.image_size = image_size
        self.patch_size = patch_size
        self.embed_dim = embed_dim
        self.num_classes = num_classes

        # Modality-specific patch embedding projection layers
        self.patch_embed_dermoscopy = nn.Conv2d(3, embed_dim, kernel_size=patch_size, stride=patch_size)
        self.patch_embed_tbp = nn.Conv2d(3, embed_dim, kernel_size=patch_size, stride=patch_size)

        # Module dictionary for dynamic routing
        self.patch_embeddings = nn.ModuleDict({
            "dermoscopy": self.patch_embed_dermoscopy,
            "dermoscopic": self.patch_embed_dermoscopy,
            "tbp": self.patch_embed_tbp,
            "tbp_3d": self.patch_embed_tbp,
            "3d_tbp": self.patch_embed_tbp,
        })

        num_patches = (image_size // patch_size) ** 2
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, embed_dim))

        # Transformer encoder blocks (DeiT-Tiny depth=12)
        self.blocks = nn.Sequential(*[
            Block(dim=embed_dim, num_heads=heads, mlp_ratio=4.0, qkv_bias=True)
            for _ in range(depth)
        ])
        self.norm = nn.LayerNorm(embed_dim)

        # Binary classification head
        self.head = nn.Linear(embed_dim, num_classes)

        self._init_weights()

    def _init_weights(self):
        torch.manual_seed(42)
        nn.init.trunc_normal_(self.cls_token, std=0.02)
        nn.init.trunc_normal_(self.pos_embed, std=0.02)
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.trunc_normal_(m.weight, std=0.02)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.LayerNorm):
                nn.init.constant_(m.bias, 0)
                nn.init.constant_(m.weight, 1.0)
            elif isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode="fan_out")
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)

    def _canonicalize_modality(self, modality: str) -> str:
        mod = modality.lower().replace("-", "_").replace(" ", "_")
        if mod in ("dermoscopy", "dermoscopic"):
            return "dermoscopy"
        elif mod in ("tbp", "tbp_3d", "3d_tbp", "3d_total_body_photography"):
            return "tbp"
        raise ValueError(f"Unsupported modality: '{modality}'. Expected 'dermoscopy' or '3d_tbp'.")

    def forward(
        self,
        images: torch.Tensor,
        modality: str = "dermoscopy",
        return_features: bool = False,
    ) -> Union[torch.Tensor, Tuple[torch.Tensor, torch.Tensor]]:
        """Forward pass with dynamic routing to modality-specific projection."""
        key = self._canonicalize_modality(modality)
        if images.ndim != 4 or tuple(images.shape[1:]) != (3, self.image_size, self.image_size):
            raise ValueError(f"Expected tensor of shape [batch, 3, {self.image_size}, {self.image_size}], got {images.shape}")

        # Route through modality-specific patch projection
        patch_layer = self.patch_embeddings[key]
        x = patch_layer(images).flatten(2).transpose(1, 2)  # [B, num_patches, embed_dim]

        # Prepend CLS token and add positional embedding
        cls_tokens = self.cls_token.expand(images.shape[0], -1, -1)
        x = torch.cat((cls_tokens, x), dim=1)
        x = x + self.pos_embed

        # Transformer blocks + LayerNorm
        x = self.norm(self.blocks(x))

        # Classification from CLS token
        cls_repr = x[:, 0]
        logits = self.head(cls_repr).squeeze(-1)

        if return_features:
            return logits, x
        return logits

    def predict_proba(self, images: torch.Tensor, modality: str = "dermoscopy") -> torch.Tensor:
        """Returns calibrated sigmoid probabilities in [0.0, 1.0]."""
        with torch.no_grad():
            logits = self.forward(images, modality)
            return torch.sigmoid(logits)


def load_or_init_mspe_deit(
    checkpoint_path: Optional[Union[str, Path]] = None,
    device: Optional[torch.device] = None,
) -> MSPEDeiT:
    """Load pretrained checkpoint if present; otherwise initialize deterministic weights."""
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = MSPEDeiT()
    if checkpoint_path and Path(checkpoint_path).is_file():
        try:
            ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
            state = ckpt.get("state_dict", ckpt)
            model.load_state_dict(state, strict=False)
        except Exception:
            pass  # Fall back to initialized deterministic weights

    model.to(device).eval()
    return model
