"""MiVOLO v2, the second age estimator of policy G1, on CPU (ONNX Runtime).

Same model, preprocessing and crops as the clothsy-age Lambda (age/preprocess.py
is copied in at build time). Lessons carried over from it:
- load on first use, not at import, when the container starts on demand: Lambda
  gives the init phase 10 s and a cold container reads the image's layers lazily;
- basic graph optimisation (loads in about a third of the time, same speed);
- one thread per CPU this process may use (oversubscription made it 5x slower).
Under provisioned concurrency the model is loaded, and run once, during init,
so the first real request pays nothing.
"""

import os

import numpy as np
import onnxruntime as ort

import preprocess

MODEL = "mivolo_v2@5339352"
_session: ort.InferenceSession | None = None


def model() -> ort.InferenceSession:
    global _session
    if _session is None:
        options = ort.SessionOptions()
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
        options.intra_op_num_threads = max(1, len(os.sched_getaffinity(0)))
        options.inter_op_num_threads = 1
        _session = ort.InferenceSession(
            os.path.join(os.path.dirname(__file__), "mivolo_v2.onnx"), options, providers=["CPUExecutionProvider"]
        )
    return _session


def warm() -> None:
    """Load the model and run it once (the first run allocates ONNX Runtime's memory arenas)."""
    blank = preprocess.prepare(None)[None]
    model().run(["age"], {"faces": blank, "bodies": blank})


def estimate(image_bgr: np.ndarray, face_box: dict, person_box: dict | None) -> dict:
    face, body = preprocess.crops(image_bgr, face_box, person_box)
    if face.size == 0:
        raise ValueError("empty face box")
    years = model().run(["age"], {"faces": preprocess.prepare(face)[None], "bodies": preprocess.prepare(body)[None]})[0]
    return {
        "age": round(float(years.ravel()[0]), 1),
        "faceSize": int(min(face.shape[:2])),
        "personUsed": body is not None,
        "model": MODEL,
    }


if os.environ.get("AWS_LAMBDA_INITIALIZATION_TYPE") == "provisioned-concurrency":
    warm()
