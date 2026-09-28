# FabricVTON and RPAPIR integration

The storefront calls FabricVTON through the existing Shopify app proxy or WooCommerce endpoint. FabricVTON authenticates the shop, enforces its own limits and credit reservation, then calls RPAPIR from the server. RPAPIR holds the provider credentials in AWS Secrets Manager and chooses a healthy key. The browser only receives FabricVTON event IDs and image URLs on the FabricVTON domain.

## Configure RPAPIR

1. Deploy `../RPAPIR-main` using its Terraform and deployment instructions. Set `upstream_base_url` to the provider's **HTTPS** API origin, `upstream_path` to `/s2s/v2.0/task/cloth-v4`, and `provider_name` to the same value used during key import. Keep the API origin in Terraform; clients cannot choose it.
2. Confirm the 900 credentials are **ready-to-use bearer tokens** for this provider. RPAPIR currently sends each secret's `api_key` as a Bearer token. It does not perform the provider's `api_key` + `api_secret` RSA token exchange. If the credentials require that exchange, extend RPAPIR's `src/provider.ts` before switching traffic.
3. Import the keys with the grouped import command in RPAPIR's README, then run its grouped verification for the expected count. Keep the CSV out of Git. Import all keys before using Google Sheets for inventory; the sheet sync cannot create new grouped-secret entries on its own.
4. The provided deployment uses client ID `clothing-site`. Use its existing client token from `client-clothing-site.key` in the FabricVTON deployment secret store. If that token is missing, create a new client ID with `npm run create:client -- fabricvton` and set `CLOTHES_PROXY_CLIENT_ID=fabricvton` instead. Never copy the token into source code.
5. Test one provider workflow through RPAPIR before enabling FabricVTON proxy mode. Provider calls can consume paid units.

Set these **server-only** variables in the FabricVTON deployment:

```text
CLOTHES_PROXY_BASE=https://eqadsa6xp8.execute-api.us-east-1.amazonaws.com
CLOTHES_PROXY_CLIENT_ID=clothing-site
CLOTHES_PROXY_TOKEN=<existing clothing-site client token, stored only in deployment secrets>
```

`CLOTHES_PROXY_BASE` must be HTTPS. Once it is set, the adapter uses RPAPIR for file registration, task creation, and task polling. Remove the old `ENGINE_API_KEY` and `ENGINE_API_SECRET` from the FabricVTON deployment after a successful cutover. Keep `ENGINE_FEATURE=cloth-v4` if that is the deployed proxy's upstream feature. Configure the proxy's `UPSTREAM_PATH` to match it. Deploy the updated Shopify widget and WooCommerce plugin 0.2.6 as part of cutover; their polling interval is now 12 seconds to fit the shared gateway budget better. The merchant Playground UI also polls every 12 seconds.

## Failover behavior

The file registration response pins its file ID to a provider key. If task creation reports that key exhausted or unavailable, FabricVTON uploads the same photo again under a new key and retries within the same shopper request, for up to four complete upload-and-create attempts. The shopper keeps one FabricVTON event and one credit reservation. A created task always polls through the key that created it. Ordinary invalid input does not rotate keys. RPAPIR limits key attempts during an unpinned call with `MAX_UPSTREAM_ATTEMPTS` (default 4).

A failed request after the retry limit releases the merchant credit reservation. A provider-wide IP rate limit or gateway 429 cannot be solved by changing keys. Tune the gateway throttle to the provider's allowed aggregate rate; do not raise it based on key count alone.

## Privacy and transport

Browser to FabricVTON, FabricVTON to RPAPIR, RPAPIR to the provider, and the signed image upload URL all need HTTPS. TLS encrypts each connection in transit; the services at each endpoint process plaintext in memory. The result image is already served through FabricVTON's `/i/<token>` route. The image upload URL and the provider result URL stay on the servers and are not returned to the shopper. Provider and cloud operators can still see their own traffic. A reverse proxy hides the provider endpoint from the browser, not from those operators.

For stronger server authentication, configure RPAPIR's custom domain and mTLS as described in its README. The current FabricVTON adapter uses normal HTTPS plus its client token; Node's `fetch` call here does not present an mTLS client certificate. Do not disable RPAPIR's default endpoint for mTLS until the FabricVTON server transport is configured to present that certificate.

## Deployment checks for the provided endpoint

1. The provided URL was verified against AWS API Gateway on 2026-09-28. The live API has the file, task creation, and task poll routes. Lambda uses the Perfect Corp API origin, `/s2s/v2.0/task/cloth-v4`, and provider name `perfectcorp`. The `clothing-site` client exists. The gateway is set to 0.7 requests/second with a burst of 2. The client token was not read.
2. Confirm Terraform's `upstream_base_url` is the Perfect Corp API origin and `upstream_path` is `/s2s/v2.0/task/cloth-v4`. Confirm the configured `provider_name` matches the grouped-key import provider. Deploy the updated RPAPIR code before sending FabricVTON traffic to it.
3. The live AWS table currently contains 193 active Perfect Corp records, referencing `group-4` through `group-7`. If the target is 900 unique keys, prepare a CSV with the 707 additional authorized keys and import it into new groups `group-8` through `group-11`:

   ```bash
   cd RPAPIR-main
   export SECRETS_KMS_KEY_ARN="$(terraform -chdir=terraform output -raw secrets_kms_key_arn)"
   npm run import:grouped -- ./new-keys.csv perfectcorp --group-start 8 --dry-run
   npm run import:grouped -- ./new-keys.csv perfectcorp --group-start 8
   npm run verify:grouped -- perfectcorp 900
   ```

   Keep the CSV outside Git. Use `--replace-existing` only with a complete CSV for every key in the groups being replaced. Importing an incomplete CSV over a live group would remove secrets still referenced by its old keys.
4. Run one File API -> signed PUT -> task creation -> task poll through the proxy with a test client credential. Confirm the response has `x-key-session`, and that only the server sees the upload and result URLs.
5. Set the three `CLOTHES_PROXY_*` values above in the FabricVTON server deployment, restart it, and run one try-on from Shopify, WooCommerce, and the merchant Playground. Verify the shopper's network tab shows only the storefront and FabricVTON origins.
6. Monitor API Gateway `429`, Lambda errors, and key status during a small rollout. At the current 0.7 requests/second gateway setting, active widgets poll every 12 seconds (up to five minutes). Six simultaneous tasks consume about 30 polls/minute before new uploads and starts. Additional concurrent traffic across stores can still exceed the shared gateway limit; queue traffic or obtain more provider capacity before raising it.

AWS read-only access was available, but the client token and additional-key CSV were not present in this workspace. No deployment, key import, or live paid try-on was performed.
