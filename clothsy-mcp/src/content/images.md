# Images

## Person photo

- JPEG or PNG, up to 4 MB. Resize in the browser to about 1600 px on the long side and re-encode as JPEG (quality ~0.88): this keeps it under the limit and strips EXIF data such as GPS location.
- **Exactly one adult**, clearly visible, ideally facing the camera, full body or at least the area the garment covers, good light.
- Faces printed on clothing, posters or screens in the background count as extra faces and can get the photo rejected (`PERSON_PHOTO_REJECTED`).
- The person in the photo must be an adult who consented (see `consent-privacy`).

## Garment image

- The product's own image, from **your** catalogue, looked up on the server. Never accept a garment URL from the browser, or anyone can spend your credits on arbitrary images.
- A clear photo of the single item, on a plain background or a model, works best. Send a `title` like "Cropped denim jacket" so the engine knows what it is placing.
- Items that can't be tried on return `422 GARMENT_REJECTED`; hide the button for that product.

## Sending images: URL or upload

Each side of a try-on takes **either** a URL **or** an uploaded image id.

**URL** (`personImageUrl` / `garmentImageUrl`) must:

- be HTTPS on the default port (no `:8443`), pointing at a public address;
- answer HTTP 200 with the image bytes directly (no redirects, no login page, no HTML);
- respond within 12 seconds;
- be JPEG or PNG, up to 4 MB.

Signed URLs work if they haven't expired. Otherwise you'll get `INVALID_IMAGE_URL` or `IMAGE_DOWNLOAD_FAILED`.

**Upload** (`POST /images`, multipart field `file`) returns `{ id: "img_...", expiresAt }`. Free, 30 a minute, id valid for 24 hours for your account only (`INVALID_IMAGE_ID` after that). Use this for shopper photos: there is no bucket to set up and nothing to clean up. Uploaded files are deleted automatically within 35 days.

## Result image

`resultUrl` is a public image on the API domain, valid for 24 hours. Show it directly, or download and store the bytes unchanged if you need it longer. It carries AI-provenance metadata (see `ai-label`).
