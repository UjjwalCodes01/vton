"""All the safety observations for one image, gathered in parallel inside AWS.

Today the backend makes these as separate HTTPS calls from Render, re-sending
the image each time (/v1/screen once per Rekognition action, then /v1/age). Here
the four Rekognition actions run concurrently against one decoded copy, and
MiVOLO runs as soon as DetectFaces and DetectLabels have returned the boxes it
needs. Parameters match handler.mjs exactly (AGE_RANGE faces, labels at
MaxLabels 50 / MinConfidence 60, moderation at MinConfidence 30), and the result
keeps Rekognition's field names, so the backend's policy code reads it
unchanged. Decisions stay in the backend for now.
"""

import hashlib
import os
import time
from concurrent.futures import ThreadPoolExecutor, wait

import boto3
import cv2
import numpy as np
from botocore.config import Config

import age

REKOGNITION_MAX_BYTES = 4 * 1024 * 1024  # Rekognition takes up to 5 MB; keep the backend's 4 MiB
REKOGNITION_MAX_SIDE = 4096
RESIZE_LONG_SIDE = 2048
DEADLINE_S = float(os.environ.get("GUARD_DEADLINE_S", "4.0"))

_rekognition = boto3.client(
    "rekognition",
    config=Config(connect_timeout=1.5, read_timeout=3.5, retries={"max_attempts": 2, "mode": "standard"},
                  max_pool_connections=16),
)
_pool = ThreadPoolExecutor(max_workers=16)


class BadImage(Exception):
    pass


class Unavailable(Exception):
    """A required check failed or ran out of time: the backend fails closed (retryable 503)."""


def prepare(data: bytes) -> tuple[bytes, np.ndarray, str]:
    """(bytes for Rekognition, decoded BGR image, sha256 of the bytes received)."""
    digest = hashlib.sha256(data).hexdigest()
    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise BadImage("undecodable")
    h, w = image.shape[:2]
    is_jpeg_or_png = data[:3] == b"\xff\xd8\xff" or data[:8] == b"\x89PNG\r\n\x1a\n"
    if is_jpeg_or_png and len(data) <= REKOGNITION_MAX_BYTES and max(h, w) <= REKOGNITION_MAX_SIDE:
        return data, image, digest
    # Too big or another format (a large provider result): one downscaled JPEG is
    # what both Rekognition and MiVOLO see, so their boxes and pixels agree.
    scale = min(1.0, RESIZE_LONG_SIDE / max(h, w))
    if scale < 1.0:
        image = cv2.resize(image, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA)
    ok, encoded = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not ok:
        raise BadImage("unencodable")
    return encoded.tobytes(), image, digest


def _faces(image: bytes) -> list:
    out = _rekognition.detect_faces(Image={"Bytes": image}, Attributes=["AGE_RANGE"])
    return [{"Confidence": f.get("Confidence"), "AgeRange": f.get("AgeRange"), "BoundingBox": f.get("BoundingBox")}
            for f in out.get("FaceDetails", [])]


def _labels(image: bytes) -> list:
    out = _rekognition.detect_labels(Image={"Bytes": image}, MaxLabels=50, MinConfidence=60)
    return [{
        "Name": label.get("Name"),
        "Confidence": label.get("Confidence"),
        "Instances": [{"Confidence": i.get("Confidence"), "BoundingBox": i.get("BoundingBox")}
                      for i in label.get("Instances", [])],
    } for label in out.get("Labels", [])]


def _moderation(image: bytes) -> list:
    out = _rekognition.detect_moderation_labels(Image={"Bytes": image}, MinConfidence=30)
    return [{"Name": m.get("Name"), "ParentName": m.get("ParentName"), "Confidence": m.get("Confidence")}
            for m in out.get("ModerationLabels", [])]


def _celebrities(image: bytes) -> list:
    out = _rekognition.recognize_celebrities(Image={"Bytes": image})
    return [{"Id": c.get("Id"), "MatchConfidence": c.get("MatchConfidence")} for c in out.get("CelebrityFaces", [])]


CHECKS = {"faces": _faces, "labels": _labels, "moderation": _moderation, "celebrities": _celebrities}
ROUTE_CHECKS = {
    "person": ("faces", "labels", "moderation", "celebrities"),
    "garment": ("moderation", "labels"),
    "output": ("faces", "moderation", "labels"),
}


def _person_box(labels: list) -> dict | None:
    people = next((label["Instances"] for label in labels if label["Name"] == "Person"), [])
    people = [p for p in people if p.get("BoundingBox")]
    return max(people, key=lambda p: p.get("Confidence") or 0)["BoundingBox"] if people else None


def observe(route: str, data: bytes) -> dict:
    started = time.perf_counter()
    deadline = started + DEADLINE_S
    rek_bytes, image, digest = prepare(data)
    timings = {"prepare": round((time.perf_counter() - started) * 1000)}

    futures = {name: _pool.submit(CHECKS[name], rek_bytes) for name in ROUTE_CHECKS[route]}
    result: dict = {}

    def collect(names):
        pending = [futures[n] for n in names]
        done, not_done = wait(pending, timeout=max(0.0, deadline - time.perf_counter()))
        if not_done:
            raise Unavailable("timeout:" + ",".join(n for n in names if futures[n] in not_done))
        for name in names:
            try:
                result[name] = futures[name].result()
            except Exception as exc:  # noqa: BLE001 - any Rekognition failure fails closed
                raise Unavailable(f"error:{name}") from exc

    # MiVOLO needs the face and person boxes; the other checks keep running meanwhile.
    box_checks = [n for n in ("faces", "labels") if n in futures]
    collect(box_checks)
    timings["boxes"] = round((time.perf_counter() - started) * 1000)
    result["age"] = None
    faces = result.get("faces")
    if faces is not None and len(faces) == 1 and (faces[0].get("Confidence") or 0) >= 90 and faces[0].get("BoundingBox"):
        if deadline - time.perf_counter() > 0.3:
            try:
                estimate = age.estimate(image, faces[0]["BoundingBox"], _person_box(result.get("labels") or []))
                result["age"] = {"age": estimate["age"], "faceSize": estimate["faceSize"],
                                 "personUsed": estimate["personUsed"], "model": estimate["model"]}
            except Exception:  # noqa: BLE001 - no second estimate: the backend applies the strict rule
                result["age"] = None
        timings["age"] = round((time.perf_counter() - started) * 1000)
    collect([n for n in futures if n not in box_checks])
    timings["total"] = round((time.perf_counter() - started) * 1000)
    result.update({"sha256": digest, "width": int(image.shape[1]), "height": int(image.shape[0]), "timingsMs": timings})
    return result
