"""clothsy-guard tests. Run inside the built image (real MiVOLO, fake AWS clients):

    docker run --rm -e AWS_DEFAULT_REGION=us-east-1 -e CLIENT_TABLE_NAME=clients \
      -e GUARD_TEST_PHOTO=/data/photo.jpg -v <dir with tests and photo>:/data \
      --entrypoint python clothsy-guard:local -m unittest discover -s /data/tests -v

GUARD_TEST_PHOTO is a photo of one adult (the public demo photos used for the
MiVOLO measurements). Never use photos of minors or sexual images in tests.
"""

import base64
import hashlib
import json
import os
import sys
import unittest

sys.path.insert(0, "/var/task")

import cv2  # noqa: E402
import numpy as np  # noqa: E402

import auth  # noqa: E402
import handler  # noqa: E402
import observe  # noqa: E402

TOKEN = "test-token"
PHOTO = os.environ.get("GUARD_TEST_PHOTO", "/data/photo.jpg")
FACE = {"Confidence": 99.9, "AgeRange": {"Low": 22, "High": 28},
        "BoundingBox": {"Left": 0.38, "Top": 0.08, "Width": 0.2, "Height": 0.15}}
PERSON_LABEL = {"Name": "Person", "Confidence": 99.0,
                "Instances": [{"Confidence": 99.0, "BoundingBox": {"Left": 0.1, "Top": 0.02, "Width": 0.8, "Height": 0.97}}]}


class FakeDynamo:
    def __init__(self, revoked=False):
        self.revoked, self.calls = revoked, 0

    def get_item(self, **kwargs):
        self.calls += 1
        item = {"tokenHash": {"S": hashlib.sha256(TOKEN.encode()).hexdigest()}}
        if self.revoked:
            item["revokedAt"] = {"S": "2026-10-01"}
        return {"Item": item}


def api_event(path, body: bytes, content_type="image/jpeg", token=TOKEN, base64_body=True):
    return {
        "requestContext": {"http": {"method": "POST"}},
        "rawPath": path,
        "headers": {"x-client-id": "clothing-site", "x-client-token": token, "content-type": content_type},
        "isBase64Encoded": base64_body,
        "body": base64.b64encode(body).decode() if base64_body else body.decode(),
    }


def photo_bytes() -> bytes:
    with open(PHOTO, "rb") as f:
        return f.read()


class GuardTest(unittest.TestCase):
    def setUp(self):
        auth._ddb = FakeDynamo()
        self.calls = []
        self.faces = [FACE]
        self.fail = None

        def fake(name, value):
            def check(image_bytes):
                self.calls.append((name, len(image_bytes)))
                if self.fail == name:
                    raise RuntimeError("rekognition down")
                return value() if callable(value) else value
            return check

        observe.CHECKS.update({
            "faces": fake("faces", lambda: self.faces),
            "labels": fake("labels", [PERSON_LABEL]),
            "moderation": fake("moderation", []),
            "celebrities": fake("celebrities", []),
        })

    def call(self, event):
        response = handler.handler(event, None)
        return response["statusCode"], json.loads(response["body"])

    def test_person_returns_all_observations_and_the_age(self):
        status, body = self.call(api_event("/v1/guard/person", photo_bytes()))
        self.assertEqual(status, 200)
        self.assertEqual(sorted(n for n, _ in self.calls), ["celebrities", "faces", "labels", "moderation"])
        self.assertEqual(body["faces"], [FACE])
        self.assertIsNotNone(body["age"])
        self.assertTrue(10 < body["age"]["age"] < 80)
        self.assertEqual(body["sha256"], hashlib.sha256(photo_bytes()).hexdigest())
        self.assertIn("total", body["timingsMs"])

    def test_no_age_unless_exactly_one_clear_face(self):
        self.faces = [FACE, FACE]
        self.assertIsNone(self.call(api_event("/v1/guard/person", photo_bytes()))[1]["age"])
        self.faces = [dict(FACE, Confidence=80.0)]
        self.assertIsNone(self.call(api_event("/v1/guard/person", photo_bytes()))[1]["age"])

    def test_garment_runs_only_moderation_and_labels(self):
        status, body = self.call(api_event("/v1/guard/garment", photo_bytes()))
        self.assertEqual(status, 200)
        self.assertEqual(sorted(n for n, _ in self.calls), ["labels", "moderation"])
        self.assertNotIn("faces", body)

    def test_a_failed_check_fails_closed(self):
        self.fail = "moderation"
        self.assertEqual(self.call(api_event("/v1/guard/person", photo_bytes())), (503, {"error": "guard_unavailable"}))

    def test_credentials(self):
        self.assertEqual(self.call(api_event("/v1/guard/person", photo_bytes(), token="wrong"))[0], 401)
        auth._ddb = FakeDynamo(revoked=True)
        self.assertEqual(self.call(api_event("/v1/guard/person", photo_bytes()))[0], 401)
        self.assertEqual(self.calls, [])

    def test_output_url_must_be_public_https(self):
        for url in ["https://127.0.0.1/x.jpg", "http://example.com/x.jpg", "https://user:pw@example.com/x.jpg",
                    "https://example.com:8443/x.jpg", "https://10.0.0.5/x.jpg", "https://169.254.169.254/latest/"]:
            event = api_event("/v1/guard/output", json.dumps({"url": url}).encode(), "application/json", base64_body=False)
            status, body = self.call(event)
            self.assertEqual(status, 422, url)
            self.assertEqual(body["error"], "result_unavailable")
        self.assertEqual(self.calls, [])

    def test_output_raw_bytes(self):
        status, body = self.call(api_event("/v1/guard/output", photo_bytes()))
        self.assertEqual(status, 200)
        self.assertEqual(sorted(n for n, _ in self.calls), ["faces", "labels", "moderation"])
        self.assertIsNotNone(body["age"])

    def test_large_images_are_resized_for_rekognition(self):
        big = cv2.resize(cv2.imdecode(np.frombuffer(photo_bytes(), np.uint8), cv2.IMREAD_COLOR), (4800, 6400))
        png = cv2.imencode(".png", big)[1].tobytes()
        rek_bytes, image, _ = observe.prepare(png)
        self.assertLessEqual(len(rek_bytes), observe.REKOGNITION_MAX_BYTES)
        self.assertEqual(max(image.shape[:2]), observe.RESIZE_LONG_SIDE)

    def test_bad_requests(self):
        self.assertEqual(self.call(api_event("/v1/guard/person", b"not an image"))[0], 400)
        self.assertEqual(self.call(api_event("/v1/guard/person", photo_bytes(), content_type="text/plain"))[0], 400)
        self.assertEqual(self.call(api_event("/v1/guard/nope", photo_bytes()))[0], 404)

    def test_warmup_only_from_a_direct_invoke(self):
        self.assertEqual(handler.handler({"warmup": True}, None), {"warm": True})
        event = api_event("/v1/guard/person", b"x", token="wrong")
        event["warmup"] = True
        self.assertEqual(handler.handler(event, None)["statusCode"], 401)


if __name__ == "__main__":
    unittest.main()
