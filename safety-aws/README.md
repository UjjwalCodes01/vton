# Clothsy AWS safety service

For the dated, live AWS resource inventory and the boundary between AWS and Render, see [the root AWS infrastructure document](../AWS_INFRASTRUCTURE.md). The rollout notes below describe the original September 2026 deployment; verify application release status separately.

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

Set `SAFETY_PROXY_BASE=https://zyfl4u1zef.execute-api.us-east-1.amazonaws.com` in the Render backend. The backend uses the existing `CLOTHES_PROXY_CLIENT_ID` and `CLOTHES_PROXY_TOKEN` server-side credentials. No AWS IAM access key is needed on Render. The coordinated application rollout is described in `../fabricvton/SAFETY_DEPLOYMENT.md`; this AWS repository does not establish the current Render, Shopify, or WooCommerce release status.

The request body is `{ "action": "DetectFaces|DetectLabels|DetectModerationLabels|RecognizeCelebrities", "image": "<base64 JPEG or PNG>" }`. Other request parameters are ignored; the Lambda fixes the thresholds. The API has a 5 request/second stage limit with a burst of 10. This AWS account currently has only 10 total concurrent Lambda executions, shared with RPAPIR, so no concurrency is reserved for safety. Request a quota increase before scaling traffic. Screened images can be up to 4 MiB each: base64 and API event overhead must fit Lambda's 6 MB synchronous invocation limit. Retries of a failed safety check should occur as a new user action, not automatically on the same photo.

## Second age estimator: `clothsy-age` (1 October 2026)

Policy G1 in `../safety-guardrails.md` uses two age estimators with a challenge age of 25. Until now only Rekognition existed, so the backend blocked every face whose Rekognition midpoint was under 25: adults who look 18 to 24 could not use try-on at all. On six public adult fashion-model photos, Rekognition's midpoints were 20 to 25. Three were refused outright and three sat exactly on the line, passing on some photos and failing on others.

`age/` adds the second estimator: **MiVOLO v2** (Apache-2.0, 29M parameters, model revision `5339352`, code commit `37475e3`). It runs as the Lambda `clothsy-age` behind `POST /v1/age` on this same API, with the same client credential and the same no-logging rule. The backend sends the image plus the face and person boxes Rekognition already found, so no detector runs. MiVOLO is exported to ONNX at build time, and the build fails unless ONNX matches PyTorch to within 0.05 years (measured: 0.003) and the preprocessing matches MiVOLO's own. The Lambda image holds only onnxruntime, numpy and OpenCV, with no PyTorch and no remote code. MiVOLO is installed without its dependency list, because that list includes ultralytics (AGPL-3.0), which the model never imports.

```
POST /v1/age   {"image": "<base64>", "face": <Rekognition BoundingBox>, "person": <BoundingBox or null>}
-> 200         {"age": 22.5, "faceSize": 164, "personUsed": true, "model": "mivolo_v2@5339352"}
```

Measured on the same six adult photos (Rekognition range, then MiVOLO): 22–28 / 24.6, 19–23 / 21.5, 18–22 / 22.5, 18–22 / 22.5, 22–28 / 23.6, 22–28 / 28.4. The two agree within 3.4 years, and all six place in `challenge` or `adult`. One estimate takes about 1 s on CPU.

Deploy in two steps (the Lambda needs an image the repository holds first):

```sh
cd terraform && terraform apply                       # ECR repository, IAM role, log group
cd ../age && ./build_and_push.sh                      # prints <repo>@sha256:<digest>
cd ../terraform && terraform apply -var age_image_uri=<that URI>   # Lambda, route, permission
```

Status, 1 October 2026: both steps applied, with the Lambda at 3008 MB, this account's current maximum (4096 was refused). Until the route exists, the backend falls back to the strict single-estimator rule, so nothing loosens before both estimators are live.

**Cold starts.** The first start after a deploy hit Lambda's 10 s init limit twice: the container fetches the 1.4 GB image's layers on first read, and the model was loaded during init. Three changes fix this. The model now loads on the first request (init measured at 0.8 s on 2 vCPUs). An EventBridge rule invokes the function every 5 minutes with `{"warmup": true}`, which only a direct invoke can send. The timeouts are now 28 s for the Lambda and 27 s in the backend, under API Gateway's 29 s. Provisioned concurrency is not possible while the account's Lambda limit is 10. ONNX Runtime uses one thread per usable CPU (`sched_getaffinity`); counting the host's cores made one estimate five times slower. Warm, one estimate takes about 1 s on 2 vCPUs. `main.tf` now pins the zip's file mode, and `.gitattributes` keeps `handler.mjs` at LF. Otherwise an apply from Windows would redeploy the unchanged safety Lambda.

## `clothsy-guard`: one call per image (guardrail plan, step 1)

Measured on the live logs (1 October 2026), each try-on sent the person photo to AWS 5 times (4 `/v1/screen` actions, then `/v1/age`) and the output 4 times, from Render, nothing overlapping the provider start. A cold age container added 20–27 s, sometimes twice. `guard/` gathers every observation for one image in **one** call: the four Rekognition actions run in parallel inside AWS against one decoded copy, and MiVOLO runs as soon as the face and person boxes are in.

```
POST /v1/guard/person    raw JPEG/PNG body
POST /v1/guard/garment   raw JPEG/PNG body
POST /v1/guard/output    raw body, or {"url": "<provider result>"} (downloaded here: SSRF-safe, up to 15 MB, resized for Rekognition)
-> {"faces","labels","moderation","celebrities","age","sha256","width","height","timingsMs"}   (503 when a check fails or exceeds the 4 s budget)
```

Parameters and field names match `/v1/screen`, so the backend's policy code decides unchanged. The backend switch is `SAFETY_GUARD_MODE`: `legacy` (default), `shadow` (legacy decides, guard differences logged as codes), `guard`. Tests: `guard/tests/test_guard.py` (10 tests, run in the image) and `fabricvton/test/safety-guard.test.ts` (guard decisions equal legacy on 13 person scenes, output and garment). Deploy like `age/`: `terraform apply`, `guard/build_and_push.sh`, then `terraform apply -var guard_image_uri=…`. Once AWS raises the Lambda concurrency limit, add `-var guard_provisioned_concurrency=2`. `main.tf` raises this API's throttle from 5/10 to 50/100 for the transition.

## Scope of this release

The current backend checks consent, one visible adult face, public figures, obvious revealing garments, Rekognition moderation, and generated output. It does **not** implement all eleven guardrails in `../safety-guardrails.md`. The second age estimator is now `clothsy-age` (above), but G1's validation on a consented test set of Indian adults aged 18 to 30 and of clothed children has not been done. It still lacks vetted CSAM hash lists and reporting workflow, human parsing or anti-undressing coverage checks, durable abuse enforcement, and embedded C2PA provenance. Those require model licensing, external hash-service access, legal process, and evaluation data. The AWS service alone is not a complete launch approval.

Terraform state is held in the private, versioned, encrypted `clothsy-safety-tfstate-251929332238` S3 bucket in this account, using an S3 lockfile. The state contains no client token. The generated Lambda ZIP stays local. Changes to RPAPIR are not required for this first layer; a future RPAPIR safety-ticket gate would be needed to prevent a compromised backend credential from calling Perfect Corp without screening.
