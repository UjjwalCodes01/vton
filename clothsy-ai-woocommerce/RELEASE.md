# Releasing Clothsy AI for WooCommerce

## 1. Backend (Render) — before the plugin goes public

Deploy `fabricvton/` (migrations run on deploy; `20260915093953_woo_billing_and_privacy` only adds a column and three tables). Environment variables:

| Variable | Value |
|---|---|
| `WOO_SECRET_ENCRYPTION_KEY` | `openssl rand -base64 32` — set once, never change (it decrypts every store's secret) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay → Account & Settings → API keys (test keys first) |
| `RAZORPAY_WEBHOOK_SECRET` | The secret you type when creating the webhook below |
| `PUBLIC_APP_URL` | Optional. Defaults to `SHOPIFY_APP_URL`; must equal the plugin's `CLOTHSY_AI_API_BASE` (`https://fabricvton-api.onrender.com`) |
| `WOO_BILLING_CURRENCY` | Optional, default `USD` |
| `SHARE_S3_ENDPOINT` | Bucket endpoint, e.g. `https://<account>.r2.cloudflarestorage.com` |
| `SHARE_S3_BUCKET` | Bucket holding shared looks |
| `SHARE_S3_KEY_ID` / `SHARE_S3_SECRET` | Bucket credentials (R2: an API token with object read/write) |
| `SHARE_S3_REGION` | Optional, default `auto` (right for R2; use the real region on S3) |
| `SHARE_PUBLIC_BASE` | Optional, default `https://clothsyai.fabricvton.com` — where `/look/<id>` is served |
| `SHARE_SIGNING_SECRET` | Optional; falls back to `SHOPIFY_API_SECRET`. Signs try-on image links |

Without the four `SHARE_S3_*` variables the try-on still works; Share Look just reports that sharing is unavailable.

Never set `WOO_ALLOW_INSECURE_URLS` or `RAZORPAY_API_BASE` in production (local testing only).

Without the three Razorpay variables the plugin still works; its Plan section says paid plans are coming soon and stores stay on Basic.

## 2. Razorpay

1. Complete KYC and enable **Subscriptions**.
2. Enable **International payments → cards** (plans are in USD; USD subscriptions are card-only). Razorpay requires these pages on the website: Terms, Privacy, **Refund & Cancellation**, Shipping (a "no physical goods" page is fine). The refund page must match how the plugin behaves: cancelling runs to the end of the paid month; upgrades start at once and the unused part of the old plan isn't refunded; downgrades start at the end of the period.
3. Enable **Flash Checkout** (Account & Settings → Checkout features).
4. Webhook: URL `https://fabricvton-api.onrender.com/webhooks/razorpay`, your secret, events: every `subscription.*` event.
5. Test in test mode (card `5104 0155 5555 5558`, any CVV, future expiry), then switch the three variables to live keys and a live webhook.

Plans are created in Razorpay automatically on first checkout, from the prices in `fabricvton/app/billing.server.ts`. Changing a price there creates a new Razorpay plan for new subscribers; existing subscribers keep theirs.

## 3. WordPress.org submission

1. Create a WordPress.org account **with a company-domain email** (plugins for a brand submitted from Gmail get flagged for trademark review). Enable 2FA.
2. Put that username in `readme.txt` → `Contributors:`.
3. Build the zip: `cd clothsy-ai-woocommerce && zip -r -X dist/clothsy-ai-0.1.0.zip clothsy-ai`.
4. Upload at https://wordpress.org/plugins/developers/add/. On the confirmation page, **request the slug `clothsy-ai`** (the default would be `clothsy-ai-virtual-try-on-for-woocommerce`; the slug can never change after approval).
5. Review usually takes 1–2 weeks. Reply to reviewer emails from the same account.

## 4. After approval (SVN)

```sh
svn co https://plugins.svn.wordpress.org/clothsy-ai svn-clothsy-ai
\cp -R clothsy-ai/* svn-clothsy-ai/trunk/   # backslash: skip the cp -i alias
svn cp svn-clothsy-ai/trunk svn-clothsy-ai/tags/0.1.0
cp ../brand/wporg/{icon,banner,screenshot}-*.png svn-clothsy-ai/assets/
cd svn-clothsy-ai && svn add --force . && svn ci -m "Clothsy AI 0.1.0"
```

The plugin page is live as soon as you commit; search results can take one to two weeks to include it.

## 5. Every release

1. Bump the version in three places: `Version:` and `CLOTHSY_AI_VERSION` in `clothsy-ai.php`, and `Stable tag:` in `readme.txt`. Add a changelog entry.
2. Keep `Tested up to` (readme) and `WC tested up to` (plugin header) at the current WordPress / WooCommerce releases — an out-of-date value blocks uploads.
3. Run Plugin Check with no errors.
4. Copy to `trunk` with `\cp -R` (a plain `cp` is aliased to `cp -i` and stops on a prompt), check `svn status` shows the changed files, then commit trunk.
5. Only then `svn cp trunk tags/<version>` and commit. Tagging before the copy lands publishes a tag holding the previous release's code — and wp.org builds a download for that tag, which burns the version number for good.
6. Releases reach sites after a 6-hour hold.

Listing assets are regenerated with `python3 brand/wporg/make_wporg_assets.py`.
