import math


def fuse(probabilities, weights=(1 / 3, 1 / 3, 1 / 3)):
    if len(probabilities) != 3 or len(weights) != 3:
        raise ValueError("Three model probabilities and three weights are required")
    if any(not math.isfinite(p) or p < 0 or p > 1 for p in probabilities):
        raise ValueError("Probabilities must be finite and within [0,1]")
    if any(w < 0 for w in weights) or not math.isclose(sum(weights), 1, abs_tol=1e-6):
        raise ValueError("Weights must be nonnegative and sum to one")
    return sum(p * w for p, w in zip(probabilities, weights))
