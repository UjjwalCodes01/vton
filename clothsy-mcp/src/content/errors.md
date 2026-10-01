# Errors

Every error response is JSON:

```json
{ "error": "Please use a clear photo of one adult person.", "code": "PERSON_PHOTO_REJECTED" }
```

Write your logic against `code`; the `error` wording may change.

{{ERROR_TABLE}}

## Failed try-ons are not HTTP errors

Polling can return `200` with `status: "failed"` (for example, the result didn't pass safety checks). `message` says why and the credit has already been refunded. Ask the shopper for another photo.

## Retrying

- Retry `429`, `500`, `502`, `503` and network timeouts with the **same** `Idempotency-Key`. One key is never charged twice.
- Don't retry other `4xx` errors unchanged: fix the request or ask for a different photo.
- Back off 1 s, 2 s, 4 s, then give up. On `429`, wait the `Retry-After` seconds.
- The `clothsy-ai` SDK does all of this for you.

## Showing errors to shoppers

Never show raw codes or messages. With the SDK use `friendlyMessage(err)`. Otherwise map codes yourself, e.g. `PERSON_PHOTO_REJECTED` -> "Please use a clear photo of just you, facing the camera." and everything unknown -> "Virtual try-on isn't available right now. Please try again later." Alert your team (don't tell the shopper) on `INSUFFICIENT_CREDITS` and `INVALID_API_KEY`.
