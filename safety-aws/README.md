# Clothsy AWS safety service

This is the first deployable AWS safety layer for the current Perfect Corp flow. It is separate from RPAPIR, which continues to rotate provider keys. FabricVTON checks inputs and outputs through this service and fails closed if it cannot reach the service. This service accepts image bytes only from a caller with an active client credential in the existing `api-key-pool-clients` DynamoDB table. It stores no images or results. API access logs contain request ID, route, status, and latency only; the Lambda has no content logging. Transport is HTTPS.

## Current account and deployment

The account is in `us-east-1` and hosts `api-key-pool`. On 30 September 2026, an AWS Organization was created with this same account as its management account. `rekognition-opt-out.json` was attached to the root, and `describe-effective-policy` returned `{"services":{"rekognition":{"opt_out_policy":"optOut"}}}` for the account. The safety stack is deployed at `https://zyfl4u1zef.execute-api.us-east-1.amazonaws.com`. An unauthenticated request returned 401; a temporary authenticated client and a synthetic 128×128 PNG returned 200 from `DetectFaces` with no faces, and the temporary client was deleted. No customer image was used for these checks.

The AWS CLI sequence used for the account governance change was:

```sh
aws organizations create-organization --feature-set ALL
aws organizations list-roots
aws organizations enable-policy-type --root-id <root-id> --policy-type AISERVICES_OPT_OUT_POLICY
aws organizations create-policy --type AISERVICES_OPT_OUT_POLICY --name clothsy-rekognition-opt-out --content file://rekognition-opt-out.json
aws organizations attach-policy --policy-id <policy-id> --target-id <root-id>
aws organizations describe-effective-policy --policy-type AISERVICES_OPT_OUT_POLICY --target-id <account-id>
```

The last response must show `rekognition` assigned `optOut`. The Organization ID is `o-hk2i4w6bbz`, root ID `r-tm7o`, and policy ID `p-90mbxf0ck5`.

From this directory:

```sh
cd terraform
terraform init
terraform plan -out=safety.tfplan
terraform apply safety.tfplan
terraform output -raw safety_api_base
```

Set `SAFETY_PROXY_BASE=https://zyfl4u1zef.execute-api.us-east-1.amazonaws.com` in the Render backend. The backend uses the existing `CLOTHES_PROXY_CLIENT_ID` and `CLOTHES_PROXY_TOKEN` server-side credentials. No AWS IAM access key is needed on Render. Deploy the FabricVTON backend, portal, Shopify widget, and WooCommerce plugin together as described in `../fabricvton/SAFETY_DEPLOYMENT.md`. **That application release has not happened yet.**

The request body is `{ "action": "DetectFaces|DetectLabels|DetectModerationLabels|RecognizeCelebrities", "image": "<base64 JPEG or PNG>" }`. Other request parameters are ignored; the Lambda fixes the thresholds. The API has a 5 request/second stage limit with a burst of 10. This AWS account currently has only 10 total concurrent Lambda executions, shared with RPAPIR, so no concurrency is reserved for safety. Request a quota increase before scaling traffic. Screened images can be up to 4 MiB each: base64 and API event overhead must fit Lambda's 6 MB synchronous invocation limit. Retries of a failed safety check should occur as a new user action, not automatically on the same photo.

## Scope of this release

The current backend checks consent, one visible adult face, public figures, obvious revealing garments, Rekognition moderation, and generated output. It does **not** implement all eleven guardrails in `../safety-guardrails.md`. In particular, it lacks a second age estimator, vetted CSAM hash lists and reporting workflow, human parsing or anti-undressing coverage checks, durable abuse enforcement, and embedded C2PA provenance. Those require model licensing, external hash-service access, legal process, and evaluation data. The AWS service alone is not a complete launch approval.

Terraform state is held in the private, versioned, encrypted `clothsy-safety-tfstate-251929332238` S3 bucket in this account, using an S3 lockfile. The state contains no client token. The generated Lambda ZIP stays local. Changes to RPAPIR are not required for this first layer; a future RPAPIR safety-ticket gate would be needed to prevent a compromised backend credential from calling Perfect Corp without screening.
