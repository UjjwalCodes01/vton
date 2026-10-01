# Clothsy AI virtual try-on: overview

Clothsy AI shows a shopper what a garment looks like on them. The shopper uploads a photo of themselves, the store supplies the product image, and the API returns an AI-generated image of the shopper wearing the item. Most results are ready in under 30 seconds.

## Pick the right integration

| Store | Use | Code needed |
| --- | --- | --- |
| Shopify (Online Store theme) | The Shopify app: https://apps.shopify.com/fabricvton | None |
| WooCommerce (WordPress theme) | The WordPress plugin: https://wordpress.org/plugins/clothsy-ai/ | None |
| Next.js App Router | `clothsy-ai` SDK: `clothsy-ai/next` route helper + `clothsy-ai/react` `TryOnButton` | One route file, one component |
| Node.js server (Express, Fastify, Hono, Remix, SvelteKit, Nuxt, Hydrogen...) | `clothsy-ai` SDK + two routes of your own | Two routes + a small browser script |
| Python, PHP, Ruby, Go, anything else | The HTTP API directly | Two routes + a small browser script |

The API and SDK are for custom storefronts, headless commerce and apps. Shopify and WooCommerce stores should install the app or plugin instead; it adds the button, consent screen and billing for them.

## How every custom integration fits together

1. **Browser**: the product page shows a "Try it on" button. It collects a photo and the shopper's consent, shrinks the photo to about 1600 px JPEG, and sends it to **your own server**, never to the Clothsy API.
2. **Your server** holds the API key. It looks up the product in **your** catalogue (never trust a garment URL sent by the browser), uploads the photo (`POST /images`), starts the try-on (`POST /tryons`) and returns the try-on id.
3. **Browser** polls your server every 2-3 s; your server calls `GET /tryons/{id}` and passes back `status` and `resultUrl`.
4. Show the result with a visible "AI-generated try-on" caption.

## Key facts

- API base: `https://fabricvton-api.onrender.com/api/v1`, auth header `Authorization: Bearer clothsy_live_...`.
- Keys: sign in at https://app.clothsyai.fabricvton.com, open **Developer API**. One active key per account. The first key adds 20 free credits, once.
- Keys are **server-side only**. Never put one in browser code, a mobile app bundle, or a `NEXT_PUBLIC_` variable.
- 1 credit per finished try-on; failed try-ons are refunded; the same `Idempotency-Key` never charges twice.
- Full docs: https://clothsyai.fabricvton.com/docs/api
