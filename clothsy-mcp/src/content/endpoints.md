# HTTP API endpoints

Base URL: `https://fabricvton-api.onrender.com/api/v1`

Every request: `Authorization: Bearer <your key>`. Errors are JSON `{ "error": "...", "code": "..." }`; branch on `code`, not on the wording of `error`.

## POST /images: upload a photo

Multipart form with one field, `file` (JPEG or PNG, up to 4 MB). Free. 30 uploads a minute.

```
curl -X POST https://fabricvton-api.onrender.com/api/v1/images \
  -H "Authorization: Bearer $CLOTHSY_API_KEY" \
  -F "file=@shopper.jpg;type=image/jpeg"
```

`201 Created`

```json
{ "id": "img_...", "expiresAt": "2026-01-01T12:00:00.000Z" }
```

The id can be used for 24 hours, by the same account only.

## POST /tryons: start a try-on

Headers: `Idempotency-Key` (required, 8-128 characters of `A-Za-z0-9_-`, one per shopper action) and `Content-Type: application/json`.

Body:

| Field | Type | Notes |
| --- | --- | --- |
| `personImageUrl` or `personImageId` | string | Exactly one of the two. |
| `garmentImageUrl` or `garmentImageId` | string | Exactly one of the two. |
| `title` | string, optional | Up to 120 characters, e.g. "Cropped denim jacket". Improves results. |
| `consent` | `true` | Required. Send only after the person in the photo agreed. |

```
curl -X POST https://fabricvton-api.onrender.com/api/v1/tryons \
  -H "Authorization: Bearer $CLOTHSY_API_KEY" \
  -H "Idempotency-Key: 3f9c2a7e-order-42" \
  -H "Content-Type: application/json" \
  -d '{"personImageId":"img_...","garmentImageUrl":"https://cdn.example.com/jacket.jpg","title":"Cropped denim jacket","consent":true}'
```

`202 Accepted`

```json
{ "id": "...", "status": "pending", "pollUrl": "https://fabricvton-api.onrender.com/api/v1/tryons/..." }
```

- 12 starts a minute per account, shared with `/tryons/sync`.
- 1 credit per **finished** try-on. Failed try-ons are refunded. Repeating a request with the same `Idempotency-Key` never charges twice; it returns the same try-on.

## POST /tryons/sync: start and wait

Same headers and body as `POST /tryons`. The API waits up to about 55 seconds.

- `200 OK` when finished: `{ "id", "status": "success" | "failed", "resultUrl", "message"? }`
- `202 Accepted` if still running: poll `GET /tryons/{id}`.

Set your HTTP client timeout to at least 70 seconds. Good for scripts and back-office tools; in a storefront prefer `POST /tryons` + polling.

## GET /tryons/{id}: check a try-on

`200 OK`

```json
{ "id": "...", "status": "pending" | "success" | "failed", "resultUrl": "https://..." | null, "message": "..." }
```

Poll every 2-3 seconds; 60 requests a minute per account. `message` explains a failure. `resultUrl` is a public image on the API domain, valid for 24 hours; download it if you need it longer.

## GET /account: credits

`200 OK`

```json
{ "credits": 42 }
```
