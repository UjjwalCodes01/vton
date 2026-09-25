# Clothsy AI — merchant billing portal

Where a merchant pays for credits: `app.clothsy.fabricvton.com`.

Credits are sold as one-off invoices rather than through Shopify's or
WooCommerce's billing. You agree a price, raise the invoice in the admin
dashboard, and it appears here for the merchant to pay by card or UPI. Paying
adds the credits to their store immediately.

## How a merchant gets in

There is no password and no signup. They open **Apps → Clothsy AI → Credits**
in their own Shopify admin and click **Pay in the billing portal**. That mints a
2-minute, single-purpose token, which this portal swaps server-side for a
12-hour session cookie.

Shopify has already checked who they are, so ownership of the store is proven by
Shopify itself — there is no password to leak and no email to intercept.

## The flow

```
Admin dashboard            Merchant portal                 Store
─────────────────────────────────────────────────────────────────────
Sell credits
  10,000 for ₹29,000  ──►  appears as "Invoice to pay"
                            pays with Razorpay
                                   │
                            signature verified ──►  +10,000 credits
                                                    on this cycle
```

Credits bought this way are added to the current cycle's allowance and are
spent **after** the plan's own credits. They do not carry over when the cycle
resets — the portal says so above the invoice.

## Configuration

```
CLOTHSY_API_BASE   https://fabricvton-api.onrender.com   (default)
```

That is all this app needs: it holds no database credentials, no Razorpay
secret and no admin token. It talks only to the portal endpoints, and every one
of them is scoped to the session's store.

The backend needs `PORTAL_PUBLIC_BASE` pointing back here, and Razorpay
configured. See the deployment notes in `clothsy-ai-woocommerce/RELEASE.md`.

## Security notes

- The session cookie is `HttpOnly`, `SameSite=Lax`, and 12 hours long.
- The handoff token is single-purpose: a session token cannot be replayed as a
  handoff, or the other way round.
- The browser is handed a Razorpay order id and nothing else. Amount, credits
  and store all live on the order Razorpay already holds, and the result is
  verified against the key secret server-side before any credit is granted.
- Credits are granted exactly once, whether the browser or the webhook confirms
  first.
- Drafts and internal notes never reach this app.

## Local development

```sh
npm install
npm run dev
```

Sign-in needs a handoff token from the backend, so point `CLOTHSY_API_BASE` at a
backend you can reach and open the portal from a Shopify admin.
