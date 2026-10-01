# TypeScript / JavaScript SDK: `clothsy-ai`

```
npm install clothsy-ai
```

- Version 0.1.0, zero dependencies.
- Runs on Node.js 18+, Deno, Bun, Vercel Edge and Cloudflare Workers (anything with a standard `fetch`).
- **Server-only**: it needs your API key. The `clothsy-ai/react` entry is the only browser-safe part, and it talks to your own route, not to the API.

## Client

```js
import { Clothsy } from "clothsy-ai";

const clothsy = new Clothsy();            // reads process.env.CLOTHSY_API_KEY

const custom = new Clothsy({
  apiKey: env.CLOTHSY_API_KEY,            // required where there is no process.env (e.g. Workers)
  baseUrl: undefined,                     // override the API base URL
  timeoutMs: 60_000,                      // per request, default 60000
  maxRetries: 2,                          // default 2
  fetch: undefined,                       // custom fetch, mainly for tests
});
```

## Methods

| Method | Returns | Notes |
| --- | --- | --- |
| `images.upload(data, { filename?, contentType? })` | `{ id: "img_...", expiresAt }` | `data` is a Blob/File, Uint8Array or Buffer. JPEG/PNG up to 4 MB. Free. The id works for 24 h, for your account only. |
| `tryons.create({ person, garment, title?, consent: true, idempotencyKey? })` | `{ id, status: "pending", pollUrl }` | `person` and `garment` are each `{ url }` or `{ imageId }`. An idempotency key is generated if you don't pass one. |
| `tryons.retrieve(id)` | `{ id, status, resultUrl, message? }` | `status` is `"pending"`, `"success"` or `"failed"`. |
| `tryons.waitFor(id, { timeoutMs = 180000, intervalMs = 2500, signal?, onStatus? })` | the finished try-on | Throws `TryOnFailedError` or `TryOnTimeoutError`. |
| `tryons.run(params, waitOpts?)` | the finished try-on | `create` + `waitFor` in one call. |
| `account.credits()` | `number` | Remaining credits. |

```js
const photo = await clothsy.images.upload(file, { filename: "photo.jpg", contentType: "image/jpeg" });
const done = await clothsy.tryons.run({
  person: { imageId: photo.id },
  garment: { url: product.imageUrl },     // from YOUR catalogue, on the server
  title: product.title,
  consent: true,                          // only after the shopper agreed
  idempotencyKey: requestId,              // one per shopper click
});
console.log(done.resultUrl);
```

## Errors

Every error extends `ClothsyError` with `status` (HTTP status, when there was a response) and `code` (e.g. `PERSON_PHOTO_REJECTED`).

| Class | When |
| --- | --- |
| `AuthenticationError` | 401: missing, malformed or revoked key |
| `InsufficientCreditsError` | 402: no credits left |
| `ValidationError` | 400/403/404/405/413/422, or a bad argument caught before sending (`INVALID_REQUEST`) |
| `RateLimitError` | 429; `retryAfter` is in seconds |
| `ServerError` | 5xx |
| `ConnectionError` | no response: network failure or client timeout |
| `TryOnFailedError` | the try-on finished with `status: "failed"` (no credit charged) |
| `TryOnTimeoutError` | `waitFor`/`run` gave up; the try-on may still finish |

`friendlyMessage(err)` turns any error into short wording that is safe to show a shopper (never leaks keys or internal codes).

The SDK retries network errors, 429, 500, 502 and 503 with backoff, honours `Retry-After`, and keeps the same idempotency key across retries.

## Framework helpers

- `clothsy-ai/next`: `createTryOnRoute({ resolveProduct })` gives App Router `POST` and `GET` handlers. See the `nextjs` topic.
- `clothsy-ai/react`: `TryOnButton` (drop-in dialog) and `useTryOn` (headless hook). See the `nextjs` topic.
