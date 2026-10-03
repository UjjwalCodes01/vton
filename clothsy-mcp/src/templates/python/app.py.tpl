# app.py — Python 3.9+ · pip install flask requests
import os
import re
import time

import requests
from flask import Flask, jsonify, request

API = "{{API_BASE_URL}}"
KEY = os.environ["CLOTHSY_API_KEY"]  # server-side only; never send it to the browser

app = Flask(__name__, static_folder="public", static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # a 4 MB photo plus form fields

ID_RE = re.compile(r"[A-Za-z0-9_-]{8,128}")
FRIENDLY = {
    "PERSON_PHOTO_REJECTED": "We couldn't use that photo. Please upload a clear, well-lit photo of just you, facing the camera.",
    "IMAGE_REJECTED": "We couldn't use that photo. Please try a different one.",
    "IMAGE_TOO_LARGE": "Please upload a JPEG or PNG photo under 4 MB.",
    "UNSUPPORTED_IMAGE": "Please upload a JPEG or PNG photo under 4 MB.",
    "RATE_LIMITED": "We're busy right now. Please try again in a minute.",
}
DEFAULT_MESSAGE = "Virtual try-on isn't available right now. Please try again later."


def find_product(product_id):
    """Look the product up in YOUR catalogue, on the server.
    {{PRODUCT_LOOKUP_NOTE}}
    Never trust an image URL sent by the browser."""
    # TODO: replace with the store's real product lookup.
    products = {
        "denim-jacket": {"title": "Cropped denim jacket", "imageUrl": "https://cdn.example.com/denim-jacket.jpg"},
    }
    return products.get(product_id)


def clothsy(method, path, *, retries=2, **kwargs):
    """Call the API. Retries 429/5xx/timeouts; callers pass the same Idempotency-Key each time."""
    headers = {"Authorization": f"Bearer {KEY}", **kwargs.pop("headers", {})}
    for attempt in range(retries + 1):
        try:
            res = requests.request(method, API + path, headers=headers, timeout=60, **kwargs)
        except requests.RequestException:
            if attempt == retries:
                return 503, {"code": "CONNECTION_ERROR"}
            continue
        try:
            body = res.json()
        except ValueError:
            body = {}
        if res.status_code in (429, 500, 502, 503, 504) and attempt < retries:
            time.sleep(min(float(res.headers.get("Retry-After", 2 ** attempt)), 10))
            continue
        return res.status_code, body


def fail(status, body):
    code = body.get("code")
    if code in ("INSUFFICIENT_CREDITS", "INVALID_API_KEY"):
        app.logger.error("Clothsy try-on needs attention: %s", code)  # alert your team
    return jsonify(message=FRIENDLY.get(code, DEFAULT_MESSAGE)), status


@app.post("/tryon")
def start_tryon():
    if request.form.get("consent") != "true":
        return jsonify(message="Please confirm you agree to your photo being processed."), 403
    photo = request.files.get("photo")
    request_id = request.form.get("requestId", "")
    if not photo or not ID_RE.fullmatch(request_id):
        return jsonify(message="Missing photo or request id."), 400
    product = find_product(request.form.get("productId", ""))
    if not product:
        return jsonify(message="This product can't be tried on."), 404

    # 1. Upload the photo (free; the id works for 24 hours).
    content_type = "image/png" if photo.mimetype == "image/png" else "image/jpeg"
    status, uploaded = clothsy("POST", "/images", files={"file": ("photo.jpg", photo.read(), content_type)})
    if status >= 400:
        return fail(status, uploaded)

    # 2. Start the try-on. The same Idempotency-Key never charges twice.
    status, body = clothsy(
        "POST",
        "/tryons",
        headers={"Idempotency-Key": request_id},
        json={
            "personImageId": uploaded["id"],
            "garmentImageUrl": product["imageUrl"],
            "title": product["title"][:120],
            "consent": True,
        },
    )
    if status >= 400:
        return fail(status, body)
    return jsonify(id=body["id"]), 202


@app.get("/tryon/<tryon_id>")
def poll_tryon(tryon_id):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", tryon_id):
        return jsonify(message="Bad id."), 400
    status, body = clothsy("GET", f"/tryons/{tryon_id}")
    if status >= 400:
        return fail(status, body)
    message = "We couldn't create your try-on. Please try another photo." if body.get("status") == "failed" else None
    return jsonify(status=body.get("status"), resultUrl=body.get("resultUrl"), message=message)


if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 3000)))
