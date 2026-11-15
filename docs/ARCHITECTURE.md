# Architecture

The Expo client authenticates to FastAPI over a configurable URL. Access and refresh tokens are held in SecureStore. FastAPI uses Argon2 password hashes, rotating opaque refresh tokens, SQLite, private local image files, and ownership checks on assessment routes. The backend loads saved PyTorch, XGBoost, preprocessing, calibration, and ensemble artifacts only for real inference. It does not host uploaded images publicly.

`MSPEDeiT` has separate 16 × 16 convolutional patch projections for dermoscopic and 3D-TBP images. A 192-dimensional class token plus 196 image tokens enter twelve shared transformer blocks with three attention heads. The binary head emits logits. Clinical XGBoost and ANN share a saved preprocessing pipeline. Their calibrated probabilities combine with the image probability by weighted average.

The implementation is an explicit approximation because no separate research document or exact trained checkpoint specification was supplied. The classification head and both modality projections require training. The included weight mapping helper can initialize compatible shared DeiT-Tiny layers and both projections from a source state dict; no pretrained weight file is bundled.
