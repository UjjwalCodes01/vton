# Perfect Corp AI Clothes integration

Use these routes from your clothing site's backend. Keep `CLOTHES_PROXY_TOKEN` in the backend's secret store. The proxy selects a Perfect Corp key internally and does not return that key.

```text
CLOTHES_PROXY_BASE=https://eqadsa6xp8.execute-api.us-east-1.amazonaws.com
CLOTHES_PROXY_CLIENT_ID=clothing-site
CLOTHES_PROXY_TOKEN=<copy from client-clothing-site.key, not into source code>
```

The current AWS endpoint is in `us-east-1`. Replace the base URL if you configure a custom domain. Send `x-client-id` and `x-client-token` on every proxy request.

The deployed gateway starts at 0.7 requests per second with a burst of 2 across all routes, including task polling. This leaves headroom under Perfect Corp's documented 250 requests per five minutes per IP. Queue or slow down requests if you receive a gateway `429`. Ask Perfect Corp for capacity guidance before increasing the limit.

From Windows PowerShell in the repository root, `./scripts/test-perfectcorp-file-flow.ps1` runs a complete File API upload and try-on using Perfect Corp's sample images. It reads the local client token without printing it and saves the resulting image to `build/tryon-result.jpg`. Each run creates a real provider task and can consume units.

## Public image URLs

The person photo and clothing image must be reachable by Perfect Corp. Use short-lived signed HTTPS image URLs from your own storage if the images are private.

```js
const base = process.env.CLOTHES_PROXY_BASE;
const headers = {
  "content-type": "application/json",
  "x-client-id": process.env.CLOTHES_PROXY_CLIENT_ID,
  "x-client-token": process.env.CLOTHES_PROXY_TOKEN
};

const created = await fetch(`${base}/v1/request`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    src_file_url: personImageUrl,
    ref_file_url: garmentImageUrl,
    garment_category: "full_body"
  })
});
const createBody = await created.json();
if (!created.ok) throw new Error(`Try-on request failed (${created.status}): ${createBody.error ?? "unknown"}`);
const taskId = createBody.data.task_id;

let result;
for (let poll = 0; poll < 30; poll++) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const response = await fetch(`${base}/v1/request/${encodeURIComponent(taskId)}`, { headers });
  const body = await response.json();
  if (!response.ok) throw new Error(`Try-on poll failed (${response.status}): ${body.error ?? "unknown"}`);
  if (body.data?.task_status === "success") { result = body.data.results.url; break; }
  if (body.data?.task_status === "error") throw new Error(`Try-on failed: ${body.data.error ?? "unknown"}`);
}
if (!result) throw new Error("Try-on did not finish before polling stopped");
```

Choose `garment_category` to match the reference outfit; `full_body` is just the example. Do not expose the proxy token or the signed result URL in logs.

## Uploading images with the File API

If the site holds image bytes rather than HTTPS image URLs:

1. `POST /v1/file` with Perfect Corp's `files` JSON to register the image. Read `x-key-session` from the response and keep it with the workflow.
2. Upload the bytes directly to the returned `data.files[].requests[].url` using the exact PUT method and headers supplied by Perfect Corp. This signed URL is temporary and must be treated as sensitive.
3. Register and upload the clothing image the same way if needed, sending `x-key-session` on the second `/v1/file` call.
4. `POST /v1/request` with `src_file_id` and `ref_file_id` (or `ref_file_url`), and send the same `x-key-session`. The proxy keeps that workflow on one provider key.
5. Poll `GET /v1/request/{taskId}` as above. The proxy remembers which key created the task.

If a pinned workflow returns `409 workflow_key_exhausted_restart_upload`, start a new File API workflow. A file ID registered under one provider key cannot safely be reused under another.

The proxy uses a stable client API credential; provider key changes occur only inside AWS. A normal `400` from invalid input does not rotate keys. Perfect Corp's documented `400` `CreditInsufficiency` response quarantines the affected provider key and retries with another eligible key. An authentication failure also quarantines that key; temporary `429` rate limiting causes a cooldown. Quarantine prevents the proxy from selecting a key; it does not revoke the key at Perfect Corp. Perfect Corp also has a per-IP rate limit, so rotating keys does not remove that limit.

Provider reference: [AI Clothes usage guide](https://docs.perfectcorp.com/reference/ai_clothes/section/overview), [rate limits](https://docs.perfectcorp.com/develop/rate_limit).

## FabricVTON adapter

The FabricVTON server integration is documented in `../../fabricvton/PROXY_INTEGRATION.md`.
The adapter uses `x-key-session` from file registration so a file ID and its task
use the same provider key. On `workflow_key_exhausted_restart_upload`, it starts
a new file registration and upload within the same shopper request.

The current RPAPIR provider client accepts ready-to-use bearer tokens. Keys that
require the provider's client ID and RSA secret exchange need an auth adapter in
`src/provider.ts` before this integration can be deployed.
