"""clothsy-age: the second age estimator of safety policy G1 (MiVOLO v2).

POST /v1/age on the clothsy-safety API, with the same client credential as
/v1/screen (x-client-id / x-client-token, checked against the RPAPIR client
table). The backend sends the image and the face and person boxes Rekognition
already found, so no detector runs here:

    {"image": "<base64 JPEG or PNG>",
     "face":   {"Left": .., "Top": .., "Width": .., "Height": ..},
     "person": {"Left": .., ...} | null}

and gets {"age": 27.4, "faceSize": 212, "personUsed": true, "model": "mivolo_v2@5339352"}.
The backend applies the policy; this function only estimates. Like /v1/screen,
it stores nothing and never logs images, boxes, credentials or results.
"""

import base64
import binascii
import hashlib
import hmac
import json
import os
import re

import boto3
import cv2
import numpy as np
import onnxruntime as ort

import preprocess

MAX_BYTES = 4 * 1024 * 1024
MAX_BODY = 5_700_000
MODEL = "mivolo_v2@5339352"
BASE64 = re.compile(r"^[A-Za-z0-9+/]+={0,2}$")
BOX_KEYS = ("Left", "Top", "Width", "Height")

_ddb = boto3.client("dynamodb")
_session: ort.InferenceSession | None = None


def _model() -> ort.InferenceSession:
    """Loaded on first use, not at import. Lambda gives the init phase 10 s and
    restarts it if it runs over; on a cold container that fetches the image's
    layers on first read, model loading did (measured: init at 10 s, twice).
    Basic graph optimisation loads in about a third of the time of "all" with
    the same inference speed (0.7 s against 2.0 s, measured)."""
    global _session
    if _session is None:
        options = ort.SessionOptions()
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
        # One thread per CPU this process may use: os.cpu_count() can report the
        # host's cores, and oversubscribed threads made one estimate 5x slower.
        options.intra_op_num_threads = max(1, len(os.sched_getaffinity(0)))
        _session = ort.InferenceSession(
            os.path.join(os.path.dirname(__file__), "mivolo_v2.onnx"), options, providers=["CPUExecutionProvider"]
        )
    return _session


def _reply(status: int, value: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json", "cache-control": "no-store"},
        "body": json.dumps(value),
    }


def _authenticated(headers: dict) -> bool:
    client_id, token = headers.get("x-client-id"), headers.get("x-client-token")
    if not isinstance(client_id, str) or not client_id or len(client_id) > 128:
        return False
    if not isinstance(token, str) or not token or len(token) > 512:
        return False
    item = _ddb.get_item(
        TableName=os.environ["CLIENT_TABLE_NAME"],
        Key={"clientId": {"S": client_id}},
        ConsistentRead=True,
        ProjectionExpression="tokenHash, revokedAt",
    ).get("Item") or {}
    expected = (item.get("tokenHash") or {}).get("S", "")
    if "revokedAt" in item or not re.fullmatch(r"[a-fA-F0-9]{64}", expected):
        return False
    return hmac.compare_digest(hashlib.sha256(token.encode()).hexdigest(), expected.lower())


def _box(value) -> dict | None:
    if not isinstance(value, dict):
        return None
    try:
        box = {k: float(value[k]) for k in BOX_KEYS}
    except (KeyError, TypeError, ValueError):
        return None
    if not all(-0.5 <= box[k] <= 1.5 for k in ("Left", "Top")) or not all(0 < box[k] <= 1.5 for k in ("Width", "Height")):
        return None
    return box


def estimate(image_bgr: np.ndarray, face_box: dict, person_box: dict | None) -> dict:
    face, body = preprocess.crops(image_bgr, face_box, person_box)
    if face.size == 0:
        raise ValueError("empty face box")
    age = _model().run(
        ["age"],
        {"faces": preprocess.prepare(face)[None], "bodies": preprocess.prepare(body)[None]},
    )[0]
    return {
        "age": round(float(age.ravel()[0]), 1),
        "faceSize": int(min(face.shape[:2])),
        "personUsed": body is not None,
        "model": MODEL,
    }


def handler(event, context):
    try:
        # The EventBridge schedule (terraform/age.tf) keeps a container warm.
        # Only a direct Lambda invoke can send this: API Gateway wraps every
        # request in its own event, with the client's JSON as a string body.
        if event.get("warmup") is True and "requestContext" not in event:
            _model()
            return {"warm": True}
        if event.get("requestContext", {}).get("http", {}).get("method") != "POST" or event.get("rawPath") != "/v1/age":
            return _reply(404, {"error": "not_found"})
        if not _authenticated(event.get("headers") or {}):
            return _reply(401, {"error": "unauthorized"})
        raw = event.get("body")
        if event.get("isBase64Encoded") or not raw or len(raw) > MAX_BODY:
            return _reply(413, {"error": "image_too_large"})
        try:
            body = json.loads(raw)
        except ValueError:
            return _reply(400, {"error": "invalid_request"})
        image, face_box, person_box = body.get("image"), _box(body.get("face")), _box(body.get("person"))
        if not isinstance(image, str) or not BASE64.match(image) or len(image) > (MAX_BYTES // 3) * 4 + 8 or face_box is None:
            return _reply(400, {"error": "invalid_request"})
        try:
            data = base64.b64decode(image, validate=True)
        except (binascii.Error, ValueError):
            return _reply(400, {"error": "invalid_request"})
        if not data or len(data) > MAX_BYTES:
            return _reply(413, {"error": "image_too_large"})
        decoded = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
        if decoded is None:
            return _reply(400, {"error": "invalid_image"})
        return _reply(200, estimate(decoded, face_box, person_box))
    except Exception:
        # Never log image bytes, boxes, headers or results.
        return _reply(503, {"error": "age_unavailable"})
