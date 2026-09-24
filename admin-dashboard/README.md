# Clothsy AI — admin dashboard

The operator console for Clothsy AI: every Shopify and WooCommerce store in one
place, with plan changes, custom allowances, suspensions and an audit trail.

Built for `admin.clothsyai.fabricvton.com`.

## How it fits together

```
browser ──(session cookie)──► admin dashboard ──(bearer token)──► Clothsy AI API ──► Postgres
```

The dashboard holds **no database credentials** and never talks to Postgres. It
calls `/api/admin/*` on the main backend with a shared token, so the blast
radius of a compromise here is "can use the admin API", not "has the database".

Every change it makes is written to the product's own audit log, tagged with the
signed-in operator's email — `dashboard:you@example.com` — so actions taken here
and actions taken inside Shopify appear in the same history.

## What you can do

| Page | What it is for |
|---|---|
| Overview | Store counts by platform, 30-day try-ons and failures, busiest stores, recent admin activity, provider health |
| Stores | Search and filter every store; jump to any one |
| Store | Grant or remove a **custom plan**, move to a standard plan, suspend, switch the try-on off, reset the cycle's usage, delete leads and history, see recent try-ons and who changed what |
| Analytics | Try-ons and widget opens per day, and the errors behind failures |
| Failures | Recent failed try-ons with their error, for support |
| Audit log | Every admin action, by anyone, with detail |

**Custom plans grant an allowance; they do not charge anyone.** Payment for a
negotiated deal happens outside the plan picker — a Shopify private plan, an
invoice, a bank transfer — which is what the "what they pay" note is for.

## Setting it up

### 1. Backend (the existing Render service)

Add one variable to **fabricvton-api**:

```
ADMIN_API_TOKEN = <a long random string>       # openssl rand -base64 32
```

Without it the admin API is off — it fails closed, so the dashboard simply
cannot reach anything.

### 2. Dashboard

```
ADMIN_API_TOKEN       same value as above
ADMIN_SESSION_SECRET  openssl rand -base64 32   # signs session cookies
ADMIN_USERS           see below
CLOTHSY_API_BASE      https://fabricvton-api.onrender.com   (default)
```

Make an account:

```sh
npm run hash -- you@example.com 'a long passphrase'
```

It prints `you@example.com:scrypt$…`. Put that in `ADMIN_USERS`; comma-separate
several people. Passwords are never stored anywhere — only the scrypt hash, in
an environment variable. Removing someone from `ADMIN_USERS` signs them out on
their next request.

### 3. Deploy

Any Node 20+ host. On Render: a Web Service, build `npm ci && npm run build`,
start `npm start`, then point `admin.clothsyai.fabricvton.com` at it. On Vercel
it deploys as-is.

## Security notes

- Sessions are HMAC-signed, `HttpOnly`, `SameSite=Strict`, and last 12 hours.
- Failed logins are throttled per IP and email; an unknown address costs the
  same scrypt as a known one, so the form cannot be used to enumerate accounts.
- Destructive actions confirm, and deleting a store's data requires typing the
  store's domain.
- The dashboard is `noindex`, and there is no public sign-up — the only way in
  is an address listed in `ADMIN_USERS`.

## Local development

```sh
npm install
npm run dev
```

Point `CLOTHSY_API_BASE` at production only when you mean it: the actions on the
store page change real stores.
