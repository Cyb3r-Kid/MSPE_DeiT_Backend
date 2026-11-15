"""Inference Service Provider for MSPE-DeiT.
Supports:
1. Remote Microservice via INFERENCE_SERVICE_URL (lightweight HTTP forward for Vercel/serverless)
2. Local PyTorch + XGBoost + ANN execution (when ML packages and checkpoints are available)
3. Clear unavailable response (503) if neither is configured. Never fabricates predictions.
"""
import io
import json
import os
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from fastapi import HTTPException
import httpx


class InferenceService:
    def __init__(self):
        self._remote_url = os.getenv("INFERENCE_SERVICE_URL", "").rstrip("/")
        self._local_initialized = False
        self._mspe_model = None
        self._ann_model = None
        self._xgb_model = None
        self._device = None

    @property
    def has_remote_service(self) -> bool:
        return bool(self._remote_url)

    @property
    def is_local_ml_available(self) -> bool:
        try:
            import torch
            import xgboost
            import timm
            return True
        except ImportError:
            return False

    @property
    def is_ready(self) -> bool:
        if self.has_remote_service:
            return True
        if self.is_local_ml_available:
            return True
        return False

    def init_local_models(self) -> bool:
        if self._local_initialized:
            return True
        if not self.is_local_ml_available:
            return False

        try:
            import torch
            from models.mspe_deit import load_or_init_mspe_deit
            from models.clinical_models import XGBoostClinicalModel, load_or_init_ann

            self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            backend_dir = Path(__file__).resolve().parent.parent

            # Locate checkpoints
            custom = os.getenv("CHECKPOINT_DIR")
            candidates = [
                Path(custom).resolve() if custom else None,
                backend_dir / "checkpoints",
                Path("./checkpoints").resolve(),
                (Path(os.getenv("LOCALAPPDATA", "")) / "MSPE_DeiT" / "checkpoints") if os.getenv("LOCALAPPDATA") else None,
            ]
            ckpt_dir = Path(custom or "./checkpoints")
            for c in candidates:
                if c and (c / "mspe.pt").is_file():
                    ckpt_dir = c
                    break

            mspe_ckpt = ckpt_dir / "mspe.pt"
            ann_ckpt = ckpt_dir / "ann.pt"
            xgb_ckpt = ckpt_dir / "xgb.joblib"

            self._mspe_model = load_or_init_mspe_deit(mspe_ckpt if mspe_ckpt.is_file() else None, device=self._device)
            self._ann_model = load_or_init_ann(ann_ckpt if ann_ckpt.is_file() else None, input_dim=14, device=self._device)
            self._xgb_model = XGBoostClinicalModel(xgb_ckpt if xgb_ckpt.is_file() else None)
            self._local_initialized = True
            return True
        except Exception as e:
            print(f"[InferenceService] Local model init error: {e}")
            return False

    async def run_inference(
        self,
        image_bytes: bytes,
        modality: str,
        clinical_data: Dict[str, Any],
        filename: str = "lesion.jpg",
        content_type: str = "image/jpeg",
    ) -> Dict[str, Any]:
        """Runs multimodal inference either via remote worker or local models."""
        # Option A: Remote inference worker (e.g. Render, Railway, Hugging Face Spaces)
        if self.has_remote_service:
            return await self._run_remote_inference(image_bytes, modality, clinical_data, filename, content_type)

        # Option B: Local PyTorch + XGBoost inference (when packages are installed)
        if self.is_local_ml_available:
            if not self._local_initialized:
                self.init_local_models()
            if self._local_initialized:
                return self._run_local_inference(image_bytes, modality, clinical_data)

        # Option C: Incompatible / missing environment -> return clean HTTP 503
        raise HTTPException(
            status_code=503,
            detail=(
                "AI Model inference is unavailable on this serverless instance. "
                "PyTorch and XGBoost are excluded to comply with Vercel package size limits (500MB). "
                "To enable live AI inference on Vercel, set the INFERENCE_SERVICE_URL environment variable "
                "to point to an external GPU/CPU inference worker, or run the backend container locally."
            )
        )

    async def _run_remote_inference(
        self,
        image_bytes: bytes,
        modality: str,
        clinical_data: Dict[str, Any],
        filename: str,
        content_type: str,
    ) -> Dict[str, Any]:
        endpoint = f"{self._remote_url}/infer"
        clinical_payload = dict(clinical_data)
        clinical_payload["modality"] = modality

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"file": (filename, image_bytes, content_type)}
                data = {"clinical": json.dumps(clinical_payload)}
                response = await client.post(endpoint, files=files, data=data)

                if response.status_code == 200:
                    res_json = response.json()
                    # Ensure standard keys are present
                    p_mspe = float(res_json.get("image_probability", res_json.get("p_mspe", 0.5)))
                    p_xgb = float(res_json.get("xgboost_probability", res_json.get("p_xgb", 0.5)))
                    p_ann = float(res_json.get("ann_probability", res_json.get("p_ann", 0.5)))
                    p_ens = float(res_json.get("ensemble_probability", (p_mspe * 0.5 + p_xgb * 0.25 + p_ann * 0.25)))
                    return {
                        "p_mspe": p_mspe,
                        "p_xgb": p_xgb,
                        "p_ann": p_ann,
                        "ensemble_probability": p_ens,
                        "risk_level": res_json.get("risk_level", "Moderate Risk"),
                        "recommendation": res_json.get("recommendation", "Clinical evaluation recommended."),
                        "model_version": res_json.get("model_version", "MSPE-DeiT-v1.0-remote"),
                    }
                else:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Inference service returned HTTP {response.status_code}: {response.text}"
                    )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to connect to inference service at {self._remote_url}: {str(e)}"
            )

    def _run_local_inference(
        self,
        image_bytes: bytes,
        modality: str,
        clinical_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        from services.preprocessor import preprocess_image, preprocess_clinical
        from models.ensemble import ensemble_assessment

        img_tensor = preprocess_image(image_bytes).to(self._device)
        np_clin, torch_clin = preprocess_clinical(clinical_data)
        torch_clin = torch_clin.to(self._device)

        p_mspe = float(self._mspe_model.predict_proba(img_tensor, modality).item())
        p_xgb = float(self._xgb_model.predict_proba(np_clin)[0])
        p_ann = float(self._ann_model.predict_proba(torch_clin).item())

        assessment_res = ensemble_assessment(p_mspe, p_xgb, p_ann)
        return {
            "p_mspe": p_mspe,
            "p_xgb": p_xgb,
            "p_ann": p_ann,
            "ensemble_probability": assessment_res["ensemble_probability"],
            "risk_level": assessment_res["risk_level"],
            "recommendation": assessment_res["recommendation"],
            "model_version": "MSPE-DeiT-v1.0",
        }


# Global singleton inference service
inference_service = InferenceService()
