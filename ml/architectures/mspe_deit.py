"""DeiT-Tiny encoder with separate trainable patch projections per modality."""
import torch
from torch import nn
from timm.models.vision_transformer import Block


class MSPEDeiT(nn.Module):
    def __init__(self, image_size=224, patch_size=16, embed_dim=192, depth=12, heads=3):
        super().__init__()
        self.image_size = image_size
        self.patch_size = patch_size
        self.patch_embeddings = nn.ModuleDict({
            "dermoscopic": nn.Conv2d(3, embed_dim, patch_size, patch_size),
            "tbp_3d": nn.Conv2d(3, embed_dim, patch_size, patch_size),
        })
        tokens = (image_size // patch_size) ** 2
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, tokens + 1, embed_dim))
        self.blocks = nn.Sequential(*[Block(embed_dim, heads, mlp_ratio=4.0, qkv_bias=True) for _ in range(depth)])
        self.norm = nn.LayerNorm(embed_dim)
        self.head = nn.Linear(embed_dim, 1)
        nn.init.trunc_normal_(self.cls_token, std=0.02)
        nn.init.trunc_normal_(self.pos_embed, std=0.02)

    def forward(self, images: torch.Tensor, modality: str, return_features=False):
        if modality not in self.patch_embeddings:
            raise ValueError(f"Unsupported modality: {modality}")
        if images.ndim != 4 or tuple(images.shape[1:]) != (3, self.image_size, self.image_size):
            raise ValueError(f"Expected [batch,3,{self.image_size},{self.image_size}]")
        x = self.patch_embeddings[modality](images).flatten(2).transpose(1, 2)
        x = torch.cat([self.cls_token.expand(images.shape[0], -1, -1), x], dim=1)
        x = self.norm(self.blocks(x + self.pos_embed))
        logits = self.head(x[:, 0]).squeeze(-1)
        return (logits, x) if return_features else logits


def initialize_from_deit(model: MSPEDeiT, pretrained_state: dict):
    """Map compatible shared DeiT-Tiny weights; both patch projections initialize from source."""
    mapped = {}
    for key, value in pretrained_state.items():
        if key.startswith("patch_embed.proj."):
            suffix = key.removeprefix("patch_embed.proj.")
            for modality in model.patch_embeddings:
                mapped[f"patch_embeddings.{modality}.{suffix}"] = value
        elif key not in ("head.weight", "head.bias") and not key.startswith("head_dist") and not key.startswith("dist_token"):
            mapped[key] = value
    missing, unexpected = model.load_state_dict(mapped, strict=False)
    return {"randomly_initialized": list(missing), "unused_pretrained": list(unexpected)}
