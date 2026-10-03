# clothsy-ai

The official TypeScript SDK for the **Clothsy AI** virtual try-on API.

- Zero runtime dependencies, ESM, fully typed
- Works on Node 18+, Deno, Bun, Vercel Edge and Cloudflare Workers
- Automatic retries with idempotency keys, so a try-on is never charged twice
- `clothsy-ai/next`: drop-in App Router route that keeps your key on the server
- `clothsy-ai/react`: an accessible "Try it on" button, plus a headless `useTryOn` hook

## Install

```sh
npm install clothsy-ai
```

Create an API key in your Clothsy AI dashboard and set it as an environment variable **on your server**:

```sh
CLOTHSY_API_KEY=clothsy_live_...
```

## Quick start (server-side)

```ts
import { Clothsy } from "clothsy-ai";

const clothsy = new Clothsy(); // reads process.env.CLOTHSY_API_KEY

const result = await clothsy.tryons.run({
  person: { url: "https://example.com/shopper.jpg" },
  garment: { url: "https://example.com/shirt.jpg" },
  title: "Blue oxford shirt",
  consent: true, // the person in the photo agreed to it being processed
});

console.log(result.resultUrl); // public image URL, valid for 24 hours
```

Have the photo as bytes instead of a URL? Upload it first (free, the id lasts 24 hours):

```ts
const photo = await clothsy.images.upload(fileOrBytes); // JPEG or PNG, max 4 MB
const tryOn = await clothsy.tryons.create({
  person: { imageId: photo.id },
  garment: { url: "https://example.com/shirt.jpg" },
  consent: true,
});
const done = await clothsy.tryons.waitFor(tryOn.id);
```

## Next.js in 3 steps

**1. Add your key** to `.env.local` (and your hosting provider): `CLOTHSY_API_KEY=clothsy_live_...`

**2. Add a route** at `app/api/tryon/route.ts`:

```ts
import { createTryOnRoute } from "clothsy-ai/next";
import { getProduct } from "@/lib/products";

export const maxDuration = 60; // optional, on Vercel

export const { POST, GET } = createTryOnRoute({
  // Runs on your server. Never accept garment image URLs from the browser.
  resolveProduct: async (productId) => {
    const product = await getProduct(productId);
    return product ? { imageUrl: product.imageUrl, title: product.name } : null;
  },
});
```

**3. Add the button** to your product page:

```tsx
import { TryOnButton } from "clothsy-ai/react";

<TryOnButton productId={product.id} />
```

The button opens a dialog where shoppers choose a photo and give consent. The photo is resized in the browser (max 1600 px, JPEG, location data removed), sent to your route, and the result is shown when ready.

The route only uses the standard Web `Request`/`Response`, so it also works in Remix, Hono, SvelteKit, Deno and Workers.

### Styling

Set CSS custom properties on any parent, or target the class names:

```css
.clothsy-tryon {
  --clothsy-accent: #7c3aed;
  --clothsy-accent-contrast: #fff;
  --clothsy-radius: 999px;
  --clothsy-bg: #fff;
  --clothsy-text: #111;
  --clothsy-muted: #666;
  --clothsy-error: #b42318;
}
```

Class hooks: `clothsy-tryon`, `clothsy-tryon__button`, `clothsy-tryon__dialog`, `clothsy-tryon__form`, `clothsy-tryon__status`, `clothsy-tryon__error`, `clothsy-tryon__image`, `clothsy-tryon__retry`.

### Custom UI

```tsx
"use client";
import { useTryOn } from "clothsy-ai/react";

const { state, start, reset, resultUrl, error } = useTryOn({ endpoint: "/api/tryon" });
// state: "idle" | "preparing" | "uploading" | "processing" | "success" | "error"
// Only call start(file, productId) after the shopper has ticked your consent checkbox.
```

## API reference

```ts
new Clothsy({
  apiKey?: string,          // default: CLOTHSY_API_KEY env var
  baseUrl?: string,         // default: https://api.clothsyai.fabricvton.com/api/v1
  timeoutMs?: number,       // default 60_000 per request
  maxRetries?: number,      // default 2
  fetch?: typeof fetch,
  dangerouslyAllowBrowser?: boolean,
});
```

| Method | Description |
| --- | --- |
| `images.upload(data, { filename?, contentType? })` | Upload a JPEG/PNG (≤ 4 MB). Returns `{ id, expiresAt }`. Free. |
| `tryons.create(params)` | Start a try-on. Returns `{ id, status: "pending", pollUrl }`. |
| `tryons.retrieve(id)` | Returns `{ id, status, resultUrl, message? }`. |
| `tryons.waitFor(id, { timeoutMs?, intervalMs?, signal?, onStatus? })` | Polls until done (default 3 min, every 2.5 s). |
| `tryons.run(params, waitOptions?)` | Create and wait in one call. |
| `account.credits()` | Remaining credits. |

`params` = `{ person: { url } | { imageId }, garment: { url } | { imageId }, title?, consent: true, idempotencyKey? }`.

**Billing:** 1 credit per successful try-on; failed try-ons are refunded. Retries reuse the same `Idempotency-Key`, so a retried request never starts or charges twice. Pass your own `idempotencyKey` (e.g. an order or request id) to make retries safe across processes too.

**Limits:** 12 try-on starts, 30 uploads and 60 status checks per minute per account. The SDK retries `429` responses after the `Retry-After` delay.

## Errors

Every error extends `ClothsyError` with a `code` and (for API errors) an HTTP `status`.

| Class | When | Common codes |
| --- | --- | --- |
| `AuthenticationError` | 401 | `INVALID_API_KEY` |
| `InsufficientCreditsError` | 402 | `INSUFFICIENT_CREDITS` |
| `ValidationError` | 400/403/404/405/413/422, or bad input caught before sending (`INVALID_REQUEST`) | `PERSON_PHOTO_REJECTED`, `GARMENT_REJECTED`, `IMAGE_REJECTED`, `IMAGE_TOO_LARGE`, `UNSUPPORTED_IMAGE`, `CONSENT_REQUIRED`, `NOT_FOUND` |
| `RateLimitError` | 429 (`retryAfter` in seconds) | `RATE_LIMITED` |
| `ServerError` | 5xx | `INTERNAL_ERROR`, `START_FAILED`, `UNAVAILABLE` |
| `ConnectionError` | network failure or timeout | `CONNECTION_ERROR` |
| `TryOnFailedError` | the try-on finished as `failed` | `TRYON_FAILED` |
| `TryOnTimeoutError` | `waitFor`/`run` gave up waiting | `TRYON_TIMEOUT` |

Network errors, timeouts and `429`/`500`/`502`/`503` are retried automatically (1 s, 2 s, 4 s backoff). Other `4xx` errors are never retried.

Show shoppers `friendlyMessage(error)` instead of raw error text:

```ts
import { friendlyMessage, ValidationError } from "clothsy-ai";

try {
  await clothsy.tryons.run(params);
} catch (error) {
  if (error instanceof ValidationError && error.code === "PERSON_PHOTO_REJECTED") {
    // ask for another photo
  }
  showToast(friendlyMessage(error));
}
```

## Security

- **Keep your API key on the server.** Anyone who can see the key can spend your credits. The client refuses to start in a browser unless you pass `dangerouslyAllowBrowser: true`, which you shouldn't. Use `clothsy-ai/next` (or your own server route) with the React component instead.
- **Resolve garment images on the server.** `createTryOnRoute` only accepts a `productId` from the browser and looks up the image with your `resolveProduct`.
- **Consent is required.** Only send photos of people who agreed to it being processed; the React component collects this with a required checkbox.
- The Next.js route rejects cross-site `POST` requests (the `Origin` host must match `Host`).
- Result images are public URLs that expire after 24 hours.

## License

MIT © Clothsy AI
