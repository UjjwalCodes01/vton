# Customer API rollout

The account API uses the existing Render try-on backend, safety screening, RPAPIR proxy, and account credit balance. Customer keys are separate from the RPAPIR client credential and Perfect Corp keys. Only a SHA-256 digest and a short prefix of each customer key are stored; the full key appears once when created.

## Deploy order

1. Deploy `fabricvton` to Render. Its existing start command runs `prisma generate && prisma migrate deploy`, applying `20260930110000_account_api` before the server starts. Check the Render log for a successful migration before opening the new portal screens.
2. Deploy `custom-store` (the app.clothsyai.fabricvton.com portal) and `admin-dashboard` from this code. They already use `CLOTHSY_API_BASE` and existing account/admin credentials; no new secrets are needed.
3. Deploy the Shopify app version from `fabricvton` so the **Connect platform account** navigation item appears in merchant admin.
4. Release WooCommerce plugin **0.2.8** from `clothsy-ai-woocommerce/clothsy-ai` to its SVN trunk and a new `tags/0.2.8`. The plugin must be updated at the merchant site before the one-time code form appears.

Do not release the portal before the backend migration. No customer keys or credits are migrated from Perfect Corp provider keys; these are distinct credentials and balances.

## Customer flow

1. Sign in to the platform and open **Developer API**. Create a key and copy it immediately to a server-side secret store. Revoke lost keys and create replacements; the old plaintext value cannot be recovered.
2. Call `POST https://fabricvton-api.onrender.com/api/v1/tryons` with `Authorization: Bearer <key>`, `Idempotency-Key: <unique 8-128 character value>`, and JSON with `personImageUrl`, `garmentImageUrl`, `title`, and `consent: true`. Image URLs must be HTTPS and public or short-lived signed URLs, and the files must be JPEG or PNG under 4 MB.
3. Poll the returned `pollUrl` with the same bearer key. `status: success` returns a short-lived `resultUrl`; `failed` attempts refund the reserved account credit. Retrying the same idempotency key returns the existing request.
4. The key draws from the account balance shared with Playground, not from a connected store's monthly plan.

## Paid credits

In the admin dashboard, open **API customers**, find the account email, and use **Grant paid credits** after verifying payment. Record a unique payment reference (at least 8 characters). A repeated reference is rejected, so the same payment cannot be credited twice. The admin API never returns raw customer keys.

## Store connection

From **Stores & settings**, enter a Shopify `.myshopify.com` URL or the WooCommerce HTTPS site URL. The platform generates a 15-minute one-time code and opens the store admin. A merchant logged into that store pastes the code into the Clothsy AI app/plugin. The Shopify route checks Shopify admin authentication; the WooCommerce plugin signs the request with its existing store secret. Only then does the store become linked to the signed-in platform account. A URL alone cannot prove store ownership or grant access.

## Smoke test after deployment

1. Create a new key; verify it is displayed once and the admin dashboard shows only its prefix.
2. Grant one credit with a test payment reference, then run one approved test image pair. Poll until success; verify the balance decreases by one and the result appears under **Generations**.
3. Retry the POST with the same idempotency key; verify no second credit is spent. Revoke the key and verify it receives `401`.
4. Start a store connection and verify the code fails on a different store, then succeeds from the intended store admin.

Each real try-on may consume provider units. Use consented adult test images and an approved garment.
