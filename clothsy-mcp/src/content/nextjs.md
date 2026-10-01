# Next.js (App Router)

Three pieces: an env var, one route file, one button. Requires Next.js 14+ and React 18+.

```
npm install clothsy-ai
```

## 1. Key

`.env.local` (git-ignored; never prefix with `NEXT_PUBLIC_`):

```
CLOTHSY_API_KEY=clothsy_live_...
```

On Vercel, add `CLOTHSY_API_KEY` under Settings -> Environment Variables and redeploy.

## 2. Route: `app/api/tryon/route.ts`

```ts
import { createTryOnRoute } from "clothsy-ai/next";

export const maxDuration = 60; // on Vercel: give the start request enough time

export const { POST, GET } = createTryOnRoute({
  resolveProduct: async (productId, request) => {
    const product = await getProduct(productId); // YOUR catalogue lookup, on the server
    return product ? { imageUrl: product.imageUrl, title: product.title } : null;
  },
});
```

- `POST /api/tryon` takes multipart form data: `photo` (JPEG/PNG), `productId`, `consent` (`"true"`) and `requestId` (8-128 of `A-Za-z0-9_-`, used as the idempotency key). Responds `{ id }`.
- `GET /api/tryon?id=...` responds `{ status, resultUrl, message }`.
- Both handlers refuse cross-origin browser requests (same-origin check).
- The key comes from `CLOTHSY_API_KEY` (or pass `apiKey`). Other options: `baseUrl`, `fetch`, `client`.
- **Never trust garment URLs from the browser.** `resolveProduct` must look the product up on the server and return `null` for unknown products or products that shouldn't offer try-on. `imageUrl` must be a public HTTPS JPEG/PNG URL.

## 3. Button

`TryOnButton` is a client component; you can render it from a server component page.

```tsx
"use client";
import { TryOnButton } from "clothsy-ai/react";

export function ProductTryOn({ productId }: { productId: string }) {
  return <TryOnButton productId={productId} endpoint="/api/tryon" label="Try it on" />;
}
```

Props: `productId` (required), `endpoint` (default `/api/tryon`), `label` (default "Try it on"), `className`, `style`, `capture` (`"user"` | `"environment"`).

The dialog asks for a photo, shows a consent checkbox that must be ticked, resizes the photo in the browser to a 1600 px JPEG (drops EXIF/GPS), posts to your route, polls, and shows the result. Add a visible "AI-generated try-on" caption near it and link your privacy policy.

### Theming

Set CSS custom properties on the button's `className` or any parent:

`--clothsy-accent`, `--clothsy-accent-contrast`, `--clothsy-bg`, `--clothsy-text`, `--clothsy-muted`, `--clothsy-border`, `--clothsy-error`, `--clothsy-backdrop`, `--clothsy-font`, `--clothsy-radius`, `--clothsy-radius-lg`.

```css
.product-tryon { --clothsy-accent: #7c3aed; }
```

### Headless hook

```tsx
"use client";
import { useTryOn } from "clothsy-ai/react";

const { state, start, reset, resultUrl, error } = useTryOn({ endpoint: "/api/tryon" });
// state: "idle" | "preparing" | "uploading" | "processing" | "success" | "error"
// start(file, productId) — only after YOUR consent checkbox is ticked
// error: string | null
```

With the hook you draw your own consent checkbox and your own "AI-generated" caption.

## Pages Router projects

On Next.js 14+ the `app/` and `pages/` directories can coexist, so you can add `app/api/tryon/route.ts` to a Pages Router project and use `TryOnButton` on a page under `pages/`.
