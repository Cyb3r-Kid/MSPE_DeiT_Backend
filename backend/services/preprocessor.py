"""Data ingestion and preprocessing pipelines for MSPE-DeiT.
Handles multimodal inputs: image standardization and clinical tabular encoding.
"""
import io
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union
import numpy as np
from PIL import Image
import torch
import torchvision.transforms as T

# Standard ImageNet normalization parameters
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

image_transform = T.Compose([
    T.Resize((224, 224), interpolation=T.InterpolationMode.BICUBIC),
    T.ToTensor(),
    T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])


def preprocess_image(
    image_source: Union[str, Path, bytes, io.BytesIO, Image.Image]
) -> torch.Tensor:
    """Loads, verifies, and transforms lesion image into [1, 3, 224, 224] tensor."""
    if isinstance(image_source, Image.Image):
        image = image_source
    elif isinstance(image_source, (str, Path)):
        image = Image.open(image_source)
    elif isinstance(image_source, bytes):
        image = Image.open(io.BytesIO(image_source))
    elif isinstance(image_source, io.BytesIO):
        image = Image.open(image_source)
    else:
        raise TypeError(f"Unsupported image source type: {type(image_source)}")

    image = image.convert("RGB")
    tensor = image_transform(image)  # [3, 224, 224]
    return tensor.unsqueeze(0)        # [1, 3, 224, 224]


# Anatomic sites vocabulary
ANATOMIC_SITES = ["head/neck", "upper extremity", "lower extremity", "torso", "palms/soles", "oral/genital"]
FITZPATRICK_TYPES = ["I", "II", "III", "IV", "V", "VI"]


def preprocess_clinical(metadata: Dict[str, Any]) -> Tuple[np.ndarray, torch.Tensor]:
    """Encodes clinical metadata into 14-dimensional feature vector.
    
    Features:
      0: normalized age (age / 100.0)
      1: sex is male (1.0 or 0.0)
      2: sex is female (1.0 or 0.0)
      3: anatomical site - head/neck (1.0 or 0.0)
      4: anatomical site - torso (1.0 or 0.0)
      5: anatomical site - upper extremity (1.0 or 0.0)
      6: anatomical site - lower extremity (1.0 or 0.0)
      7: lesion diameter in mm / 20.0
      8: evolution / history of growth (1.0 or 0.0)
      9: family history of melanoma (1.0 or 0.0)
      10: itch / bleeding present (1.0 or 0.0)
      11: fitzpatrick type I/II (1.0 or 0.0)
      12: fitzpatrick type III/IV (1.0 or 0.0)
      13: fitzpatrick type V/VI (1.0 or 0.0)
    """
    age = float(metadata.get("age", 45) or 45)
    age_norm = max(0.0, min(1.2, age / 100.0))

    sex = str(metadata.get("sex", "unknown") or "unknown").lower()
    is_male = 1.0 if sex == "male" else 0.0
    is_female = 1.0 if sex == "female" else 0.0

    site = str(metadata.get("anatomical_site") or metadata.get("anatomical_location") or "unknown").lower()
    site_head_neck = 1.0 if any(k in site for k in ["head", "neck", "face", "scalp"]) else 0.0
    site_torso = 1.0 if any(k in site for k in ["torso", "chest", "back", "abdomen", "trunk"]) else 0.0
    site_upper = 1.0 if any(k in site for k in ["arm", "hand", "shoulder", "upper"]) else 0.0
    site_lower = 1.0 if any(k in site for k in ["leg", "foot", "thigh", "lower", "shin"]) else 0.0

    diameter = float(metadata.get("diameter_mm") or metadata.get("lesion_diameter_mm") or 5.0)
    diameter_norm = max(0.0, min(2.0, diameter / 20.0))

    evolution = 1.0 if bool(metadata.get("evolution") or metadata.get("history_growth") or metadata.get("evolution_history")) else 0.0
    family_hist = 1.0 if bool(metadata.get("family_history") or metadata.get("family_melanoma")) else 0.0
    itch_bleed = 1.0 if bool(metadata.get("itch_bleed") or metadata.get("symptoms_itch") or metadata.get("symptoms_bleed")) else 0.0

    fitz = str(metadata.get("fitzpatrick") or metadata.get("fitzpatrick_skin_type") or "III").upper()
    fitz_1_2 = 1.0 if fitz in ("I", "II", "1", "2") else 0.0
    fitz_3_4 = 1.0 if fitz in ("III", "IV", "3", "4") else 0.0
    fitz_5_6 = 1.0 if fitz in ("V", "VI", "5", "6") else 0.0

    vec = [
        age_norm,
        is_male,
        is_female,
        site_head_neck,
        site_torso,
        site_upper,
        site_lower,
        diameter_norm,
        evolution,
        family_hist,
        itch_bleed,
        fitz_1_2,
        fitz_3_4,
        fitz_5_6,
    ]
    np_vec = np.array([vec], dtype=np.float32)
    torch_tensor = torch.tensor(np_vec, dtype=torch.float32)
    return np_vec, torch_tensor

