# Limits and credits

| What | Limit |
| --- | --- |
| Starting try-ons | 12 a minute per account, shared by `POST /tryons` and `POST /tryons/sync` |
| Polling `GET /tryons/{id}` | 30 a minute per try-on, 600 a minute per account; poll every 2-3 seconds |
| Uploading `POST /images` | 30 a minute per account |
| Image size and type | JPEG or PNG, up to 4 MB |
| Uploaded image id | Usable for 24 hours, by the uploading account only |
| Image URL fetch | HTTPS, default port, HTTP 200 without redirects, within 12 seconds |
| `/tryons/sync` wait | About 45 seconds, then `202` and you poll; client timeout at least 70 s |
| `resultUrl` lifetime | 24 hours |
| Title | Up to 120 characters |
| `Idempotency-Key` | 8-128 characters of `A-Za-z0-9_-` |
| API keys | One active key per account |
| Typical time to result | Under 30 seconds |

Over a rate limit you get `429 RATE_LIMITED` with a `Retry-After` header (seconds). If you need more than 12 try-ons a minute at peak, email contact@fabricvton.com to raise the limit.

## Credits

- 1 credit per finished try-on. Failed try-ons are refunded automatically; `START_FAILED` never uses a credit.
- The same `Idempotency-Key` is never charged twice.
- Your first API key adds 20 free credits, once.
- Check the balance with `GET /account` (or `clothsy.account.credits()`).
- API credits are separate from any Shopify or WooCommerce store plan on the same account.
- When credits run out, requests fail with `402 INSUFFICIENT_CREDITS`: hide the try-on button and top up.
