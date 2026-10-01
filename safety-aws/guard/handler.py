"""clothsy-guard: every safety check for one image in one call.

Routes on the clothsy-safety API, with the same client credential as /v1/screen:

    POST /v1/guard/person   raw JPEG/PNG body (the exact bytes the try-on will use)
    POST /v1/guard/garment  raw JPEG/PNG body
    POST /v1/guard/output   raw JPEG/PNG body, or JSON {"url": "<provider result URL>"}
                            (the guard downloads it: SSRF-safe, up to 15 MB, resized for Rekognition)

Each returns the observations the backend's policy code already reads, in
Rekognition's field names, plus the MiVOLO estimate when there is exactly one
clear face, and the SHA-256 of the image it screened:

    {"faces": [...], "labels": [...], "moderation": [...], "celebrities": [...],
     "age": {"age": 23.4, "faceSize": 180, "personUsed": true, "model": "..."} | null,
     "sha256": "...", "width": 768, "height": 1024, "timingsMs": {...}}

503 {"error": "guard_unavailable"} when a required check failed or ran out of time
(the backend fails closed, as with /v1/screen). Like the other safety routes it
stores nothing and never logs images, URLs, credentials or results.
"""

import base64
import binascii
import json

import age
import auth
import fetch
import observe

MAX_EVENT_BODY = 5_900_000  # base64 of a ~4.4 MB image; the Lambda event limit is 6 MB
MAX_RESULT_DOWNLOAD = 15 * 1024 * 1024
ROUTES = {"/v1/guard/person": "person", "/v1/guard/garment": "garment", "/v1/guard/output": "output"}


def _reply(status: int, value: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json", "cache-control": "no-store"},
        "body": json.dumps(value),
    }


def _image_from_event(event: dict, route: str) -> bytes | None:
    raw = event.get("body") or ""
    if not raw or len(raw) > MAX_EVENT_BODY:
        return None
    content_type = (event.get("headers") or {}).get("content-type", "").split(";")[0].strip().lower()
    if route == "output" and content_type == "application/json":
        text = base64.b64decode(raw).decode() if event.get("isBase64Encoded") else raw
        url = json.loads(text).get("url")
        return fetch.download(url, MAX_RESULT_DOWNLOAD)
    if content_type not in ("image/jpeg", "image/png", "application/octet-stream"):
        return None
    return base64.b64decode(raw, validate=True) if event.get("isBase64Encoded") else None


def handler(event, context):
    try:
        # Warm-up from EventBridge; API Gateway events always carry requestContext.
        if event.get("warmup") is True and "requestContext" not in event:
            age.warm()
            return {"warm": True}
        route = ROUTES.get(event.get("rawPath", ""))
        if event.get("requestContext", {}).get("http", {}).get("method") != "POST" or route is None:
            return _reply(404, {"error": "not_found"})
        if not auth.authenticated(event.get("headers") or {}):
            return _reply(401, {"error": "unauthorized"})
        try:
            data = _image_from_event(event, route)
        except fetch.FetchError as exc:
            return _reply(422, {"error": "result_unavailable", "reason": str(exc)})
        except (ValueError, binascii.Error, UnicodeDecodeError):
            return _reply(400, {"error": "invalid_request"})
        if not data:
            return _reply(400, {"error": "invalid_request"})
        try:
            return _reply(200, observe.observe(route, data))
        except observe.BadImage:
            return _reply(400, {"error": "invalid_image"})
        except observe.Unavailable:
            return _reply(503, {"error": "guard_unavailable"})
    except Exception:
        # Never log image bytes, URLs, headers or results.
        return _reply(503, {"error": "guard_unavailable"})
