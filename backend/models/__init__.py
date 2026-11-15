"""MSPE-DeiT Multimodal Models Package.
Provides lazy-safe exports so importing lightweight ensemble helpers does not require PyTorch or XGBoost.
"""
try:
    from .mspe_deit import MSPEDeiT, load_or_init_mspe_deit
except (ImportError, Exception):
    MSPEDeiT = None  # type: ignore
    load_or_init_mspe_deit = None  # type: ignore

try:
    from .clinical_models import ANNClinicalModel, XGBoostClinicalModel, load_or_init_ann
except (ImportError, Exception):
    ANNClinicalModel = None  # type: ignore
    XGBoostClinicalModel = None  # type: ignore
    load_or_init_ann = None  # type: ignore

from .ensemble import soft_vote, classify_risk, ensemble_assessment, fuse

__all__ = [
    "MSPEDeiT",
    "load_or_init_mspe_deit",
    "ANNClinicalModel",
    "XGBoostClinicalModel",
    "load_or_init_ann",
    "soft_vote",
    "classify_risk",
    "ensemble_assessment",
    "fuse",
]
