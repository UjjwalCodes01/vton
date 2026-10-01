"""MiVOLO v2 input preparation, identical to MiVOLO's own.

The same steps as `mivolo.data.misc.prepare_classification_images` and
`class_letterbox` (MiVOLO commit 37475e3, Apache-2.0): letterbox to 384x384
with black padding, BGR to RGB, ImageNet normalisation, CHW. The export step
checks this file against MiVOLO's function, so the model sees at run time what
it saw in training.

Crops follow MiVOLO's `PersonAndFaceResult.crop_object`: the face crop is the
face box; the body crop is the person box with the face box blacked out, and is
dropped (zeros) when the person box is under 50 px or less than 40 % of it is
left after the cut.
"""

import cv2
import numpy as np

INPUT_SIZE = 384
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float64)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float64)
MIN_PERSON_SIZE = 50
MIN_PERSON_CROP_AFTERCUT_RATIO = 0.4


def letterbox(image: np.ndarray, size: int = INPUT_SIZE) -> np.ndarray:
    h, w = image.shape[:2]
    if h == size and w == size:
        return image
    r = min(size / h, size / w)
    new_w, new_h = int(round(w * r)), int(round(h * r))
    dw, dh = (size - new_w) / 2, (size - new_h) / 2
    if (w, h) != (new_w, new_h):
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    return cv2.copyMakeBorder(image, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(0, 0, 0))


def prepare(crop_bgr: np.ndarray | None) -> np.ndarray:
    """One crop (BGR, uint8) or None -> (3, 384, 384) float32."""
    if crop_bgr is None:
        return np.broadcast_to(((0.0 - MEAN) / STD).reshape(3, 1, 1), (3, INPUT_SIZE, INPUT_SIZE)).astype(np.float32)
    image = cv2.cvtColor(letterbox(crop_bgr), cv2.COLOR_BGR2RGB)
    image = (image / 255.0 - MEAN) / STD
    return np.ascontiguousarray(image.astype(np.float32).transpose(2, 0, 1))


def box_pixels(box: dict, width: int, height: int) -> tuple[int, int, int, int]:
    """A Rekognition BoundingBox (ratios of the image) -> x1, y1, x2, y2 in pixels, clamped."""
    left, top = float(box["Left"]), float(box["Top"])
    right, bottom = left + float(box["Width"]), top + float(box["Height"])
    x1, x2 = (int(round(min(max(v, 0.0), 1.0) * width)) for v in (left, right))
    y1, y2 = (int(round(min(max(v, 0.0), 1.0) * height)) for v in (top, bottom))
    return x1, y1, x2, y2


def crops(image_bgr: np.ndarray, face_box: dict, person_box: dict | None) -> tuple[np.ndarray, np.ndarray | None]:
    h, w = image_bgr.shape[:2]
    fx1, fy1, fx2, fy2 = box_pixels(face_box, w, h)
    face = image_bgr[fy1:fy2, fx1:fx2].copy()
    if person_box is None:
        return face, None
    px1, py1, px2, py2 = box_pixels(person_box, w, h)
    body = image_bgr[py1:py2, px1:px2].copy()
    bh, bw = body.shape[:2]
    if bh < MIN_PERSON_SIZE or bw < MIN_PERSON_SIZE:
        return face, None
    # The face is seen by the face branch; MiVOLO's body crops have it cut out.
    ox1, oy1 = max(fx1 - px1, 0), max(fy1 - py1, 0)
    ox2, oy2 = min(fx2 - px1, bw), min(fy2 - py1, bh)
    if ox2 > ox1 and oy2 > oy1:
        body[oy1:oy2, ox1:ox2] = 0
    if np.count_nonzero(body) / body.size < MIN_PERSON_CROP_AFTERCUT_RATIO:
        return face, None
    return face, body
