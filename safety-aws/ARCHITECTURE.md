# AWS guardrails architecture for the current try-on

## Live request path

`Shopify / WooCommerce / Playground -> FabricVTON backend on Render -> Clothsy safety API in us-east-1 -> Rekognition -> FabricVTON backend -> RPAPIR -> Perfect Corp -> FabricVTON output screening -> customer`.

The browser never receives AWS credentials, RPAPIR provider keys, or the client proxy token. RPAPIR remains responsible for provider key rotation and pinned File API workflows. The first safety API accepts image bytes, reads the same client table for authentication, and stores no images. Render has no AWS IAM access key. Its downloaded garment and output images are fetched through the existing DNS-pinned, no-redirect helper before screening.

The safety API is independent of RPAPIR. This keeps key rotation stable, but it does not make the provider proxy itself enforce a safety decision. If the Render server or its client token is compromised, a caller could invoke RPAPIR directly. Add a short-lived, signed safety verdict tied to hashes of the person image, garment image, workflow ID, and allowed garment category; require that verdict in RPAPIR before `/v1/file` and `/v1/request`. Because RPAPIR does not receive image bytes today, file registration must carry a hash and an upload proof that can be verified, or the upload flow must move through a controlled S3 staging path. Do not claim bypass resistance before this gate exists.

## Guardrail work and AWS resources

| Guardrail | Present first layer | Next component in this account | External dependency |
|---|---|---|---|
| G1 Age | Rekognition face age range, conservative refusal | Second age model on ECS or SageMaker; evaluation set and versioned policy | Licensed model and consented evaluation data |
| G2 Garment | Title/category denylist, Rekognition moderation/labels | Garment classifier service and catalog taxonomy mapping | Model license and labeled catalog |
| G3 Input | Moderation, one face/person check | Stronger garment-validity checks | Evaluation data |
| G4 CSAM | None | Private hash matcher, quarantine workflow, access-controlled evidence bucket | Vetted PhotoDNA/PDQ lists, reporting registration, legal process |
| G5 Output | Rekognition moderation and age range before display/share | Second detector and review workflow | Model license and evaluation data |
| G6 Coverage | None | Human parser on ECS/SageMaker; before/after skin-area comparison | Model weights and validated thresholds |
| G7 Consent | Customer attestation and celebrity screening | Account abuse controls, takedown endpoint and queue | Operational review process |
| G8 Instructions | No free-text prompt in current product | Reject or classify any future text field at API entry | Product policy |
| G9 Provenance | UI label | Embedded visible label, C2PA signing key in KMS, watermark | Certificate/issuer and chosen library |
| G10 Abuse | Existing RPAPIR client auth; API throttles | Durable per-client strikes in DynamoDB, WAF, signed safety verdict gate | Policy for suspension and appeals |
| G11 Privacy | No image storage in first safety Lambda; short CloudWatch retention | Retention jobs, deletion APIs, takedown queue, restricted evidence handling | Counsel-approved periods and notices |

Use DynamoDB for policy versions and event counters, S3 with lifecycle rules for any staged or output images, Step Functions for workflows that require multiple classifiers, and EventBridge for deletion/takedown timers. Store only hashes and minimal verdict metadata in audit records. Every processing component must fail closed for missing verdicts. Keep the evidence workload separate from routine application roles even if it must initially reside in this one AWS account; the plan's separate evidence account cannot be achieved while confined to one account.

## Ordered rollout

1. Resolve Rekognition data-use opt-out for this standalone account. A prepared policy is in `rekognition-opt-out.json`; creating an AWS Organization is an account-level governance action.
2. Deploy and smoke-test the first safety API with a non-customer image. Set `SAFETY_PROXY_BASE` in Render, then deploy the backend and all storefront clients together. RPAPIR stays live and unchanged.
3. Obtain external hash service access and counsel-approved reporting procedure. Implement G4 before claiming the full plan's launch blockers are met.
4. Build and evaluate the second age model, garment classifier, output detector, and coverage parser using permitted data. Only then enable their policy decisions.
5. Add the signed verdict gate in RPAPIR, durable abuse enforcement, provenance, and takedown operations. Validate end-to-end bypass and failure cases before describing the eleven guardrails as complete.
