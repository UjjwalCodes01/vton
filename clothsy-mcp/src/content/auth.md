# Authentication and API keys

## Getting a key

1. Sign in at https://app.clothsyai.fabricvton.com.
2. Open **Developer API** and create a key.
3. Copy it straight away and store it as a server secret named `CLOTHSY_API_KEY`.

- Keys look like `clothsy_live_` followed by 43 URL-safe characters (letters, digits, `_`, `-`).
- Each account has **one active key**. Creating a new key replaces the old one, so update every server that uses it.
- The **first** key you create adds **20 free credits** to the account, once.

## Using a key

Send it on every request:

```
Authorization: Bearer clothsy_live_...
```

A missing, malformed or revoked key returns `401 INVALID_API_KEY`.

## Keep it server-side

The key spends your credits. Treat it like a payment secret:

- Read it from an environment variable on the server (`process.env.CLOTHSY_API_KEY`, `os.environ["CLOTHSY_API_KEY"]`).
- **Never** ship it to the browser: no `NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `REACT_APP_` or `EXPO_PUBLIC_` prefixes, no inline `<script>` config, no mobile app bundles.
- Keep it out of git: put it in `.env.local` / `.env` (and make sure those files are git-ignored) or in your host's secret settings (Vercel, Netlify, Render, Fly, Cloudflare, etc.).
- The browser talks to **your** route; your route talks to Clothsy.

If a key leaks, create a new one in the platform (this revokes the old one) and update your servers.
