"""Build step: MiVOLO v2 (PyTorch) -> ONNX, verified, so the Lambda needs no PyTorch.

Runs in the Dockerfile's export stage. Fails the build if the ONNX model's ages
differ from PyTorch's by more than 0.05 years, or if preprocess.py differs from
MiVOLO's own preparation.

    python export_onnx.py /out/mivolo_v2.onnx
"""

import sys

import numpy as np
import onnxruntime as ort
import torch
from huggingface_hub import snapshot_download
from mivolo.data.misc import prepare_classification_images
from transformers import AutoModelForImageClassification

import preprocess

REPO = "iitolstykh/mivolo_v2"
REVISION = "53393526c220e34cdd7b722b36d22b6f9e5f4241"  # pinned; Apache-2.0


class AgeOnly(torch.nn.Module):
    """faces, bodies (N, 3, 384, 384) -> age in years (N, 1)."""

    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, faces, bodies):
        return self.model(faces_input=faces, body_input=bodies).age_output


def main(out_path: str) -> None:
    path = snapshot_download(REPO, revision=REVISION, allow_patterns=["*.json", "*.py", "model.safetensors"])
    model = AutoModelForImageClassification.from_pretrained(path, trust_remote_code=True, torch_dtype=torch.float32)
    wrapper = AgeOnly(model.eval()).eval()

    # preprocess.py must match MiVOLO's preparation exactly.
    rng = np.random.default_rng(0)
    for shape in [(120, 90, 3), (640, 300, 3), (384, 384, 3), (33, 400, 3)]:
        crop = rng.integers(0, 256, size=shape, dtype=np.uint8)
        theirs = prepare_classification_images([crop], 384, preprocess.MEAN, preprocess.STD)[0].numpy()
        ours = preprocess.prepare(crop)
        assert np.abs(theirs - ours).max() < 1e-5, f"preprocessing differs for {shape}"
    theirs_none = prepare_classification_images([None], 384, preprocess.MEAN, preprocess.STD)[0].numpy()
    assert np.abs(theirs_none - preprocess.prepare(None)).max() < 1e-5, "preprocessing differs for a missing crop"

    def single(face_shape, body_shape):
        face = preprocess.prepare(rng.integers(0, 256, face_shape, dtype=np.uint8))
        body = preprocess.prepare(rng.integers(0, 256, body_shape, dtype=np.uint8) if body_shape else None)
        return torch.from_numpy(face[None]), torch.from_numpy(body[None])

    # Batch size 1, fixed: the Lambda scores one photo per request, and VOLO's
    # fold (ONNX Col2Im) needs a constant output size. VOLO passes it from the
    # input's shape, which tracing records as a tensor, so it is made a plain
    # int tuple for the export (same values: the parity check below confirms).
    faces, bodies = single((200, 160, 3), (500, 260, 3))
    fold = torch.nn.functional.fold
    torch.nn.functional.fold = lambda x, output_size, *a, **k: fold(x, tuple(int(s) for s in output_size), *a, **k)
    try:
        torch.onnx.export(
            wrapper, (faces, bodies), out_path,
            input_names=["faces", "bodies"], output_names=["age"], opset_version=18,
        )
    finally:
        torch.nn.functional.fold = fold

    session = ort.InferenceSession(out_path, providers=["CPUExecutionProvider"])
    worst = 0.0
    for face_shape, body_shape in [((200, 160, 3), (500, 260, 3)), ((90, 70, 3), None), ((400, 300, 3), (900, 500, 3))]:
        faces, bodies = single(face_shape, body_shape)
        with torch.no_grad():
            expected = float(wrapper(faces, bodies).numpy().ravel()[0])
        got = float(session.run(["age"], {"faces": faces.numpy(), "bodies": bodies.numpy()})[0].ravel()[0])
        worst = max(worst, abs(expected - got))
        print(f"PyTorch {expected:.3f}  ONNX {got:.3f}")
    print(f"ONNX vs PyTorch: max age difference {worst:.5f} years")
    assert worst < 0.05, "ONNX export does not match PyTorch"


if __name__ == "__main__":
    main(sys.argv[1])
