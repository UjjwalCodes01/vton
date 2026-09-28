# Secure API Key Pool — Hardened B2B Proxy

This service keeps upstream provider credentials server-side and exposes only your own API to the authorized client.

## Security boundary

```text
Friend / client
      |
      | HTTPS + mTLS (recommended) + app token
      v
API Gateway HTTP API
      |
      v
Lambda
  |      \
  |       \__ DynamoDB: client/key state only
  |
  \------ AWS Secrets Manager: actual upstream credential
             |
             v
        Upstream provider
```

The upstream API key is never returned to the client, never placed in Terraform variables, and is not written to application logs.

There is no legitimate way to make a network service completely "untraceable". The secure target is: credentials are not exposed, only authorized clients can invoke the proxy, sensitive values are not logged, and administrative/audit records remain available to you and AWS. The upstream provider sees requests from your AWS-side proxy rather than the friend's original HTTP connection because the proxy does not forward client authorization headers or source-IP headers.

## Important use constraint

Use this only with provider accounts and credentials that you are authorized to operate and in a way permitted by the provider's terms. The failover logic is for resilience/credential health management; it is not intended to bypass provider quotas or account restrictions.

## What the key pool does

The provider does not need to expose remaining-credit APIs.

A key is selected only when `eligibleAt <= now` and it has no active lease.

States:

- `ACTIVE`: eligible immediately
- `TEMP_DISABLED`: retried after a short cooldown, e.g. a documented rate-limit or transient error
- `QUOTA_EXHAUSTED`: quarantined until you explicitly re-enable it or until your provider documents that the quota reset makes it safe to re-enable
- `AUTH_FAILED`: quarantined after invalid/revoked credential responses
- `DISABLED`: switched off by you, via `keys:disable` or the Google Sheet (`operator_status = disabled`)

A 30-second lease prevents multiple concurrent Lambdas from unnecessarily selecting the same key. The lease is tied to a random lease ID, so a late response cannot reactivate a newer key state.

DynamoDB's conditional updates are the concurrency guard. The eligibility index is eventually consistent, so a stale candidate can still appear briefly; the conditional claim is what makes the final decision. DynamoDB GSIs do not support strong consistency.

## Why Secrets Manager

AWS recommends Secrets Manager for credentials, least-privilege access, monitoring, rotation where supported, and secret caching. Secrets Manager uses KMS for encryption at rest.

This project creates a customer-managed KMS key and grants Lambda only `kms:Decrypt` through the Secrets Manager service. The raw key values are absent from Terraform state because the Terraform code creates infrastructure but does not contain the secret values.

## Prerequisites

- AWS CLI authenticated (`aws sts get-caller-identity` must work)
- Node.js 22+; the Lambda runtime is Node.js 24, which is currently supported by AWS.
- npm
- Terraform 1.9+
- A provider API account/credential set you are authorized to use
- Optional for strong B2B mode: a domain name and ACM certificate

## 1. Configure

```bash
cp .env.example .env
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Edit `terraform/terraform.tfvars` and set the real provider base URL/path. Do not place provider API keys in this file.

Verify AWS:

```bash
aws sts get-caller-identity
aws configure get region
```

## 2. Deploy

The deployment script type-checks and bundles the Lambda code into `build/lambda`, then runs Terraform. Terraform zips that folder itself, so the first apply deploys real code and later applies redeploy whenever the code changes.

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Get the API URL:

```bash
terraform -chdir=terraform output -raw api_url
```

The default form is:

```text
https://API_ID.execute-api.REGION.amazonaws.com/v1/request
```

## 3. Import provider keys

Create a local `keys.csv` that is excluded by `.gitignore`:

```csv
key_id,provider,api_key,api_secret
provider-001,provider-x,REDACTED,
provider-002,provider-x,REDACTED,
provider-003,provider-x,REDACTED,
```

Then:

```bash
export SECRETS_KMS_KEY_ARN="$(terraform -chdir=terraform output -raw secrets_kms_key_arn)"
export AWS_REGION="us-east-1"  # use the same region configured in terraform.tfvars
npm run import:keys -- ./keys.csv
```

For a large CSV, use grouped storage to avoid one paid Secrets Manager secret per key. The importer accepts the `API Key` header, derives stable key IDs, stores four encrypted groups, and links one DynamoDB state record per key:

```bash
npm run import:grouped -- ./keys.csv perfectcorp --dry-run
npm run import:grouped -- ./keys.csv perfectcorp
# For an additional batch, choose four unused group numbers, for example:
# npm run import:grouped -- ./more-keys.csv perfectcorp --group-start 8 --dry-run
# npm run import:grouped -- ./more-keys.csv perfectcorp --group-start 8
# npm run verify:grouped -- perfectcorp EXPECTED_TOTAL
```

The importer refuses existing group names by default. Use `--replace-existing` only with the complete CSV for every key in those groups; a partial replacement would remove secrets still referenced by other records. Run `npm run build` and deploy the grouped-secret reader before switching existing key records to grouped storage. An explicit full-group replacement keeps existing key health states. Keep the CSV private and excluded from Git.

The `npm run` scripts also read these variables from `.env` if present. `UPSTREAM_BASE_URL` is not needed for admin scripts.

Re-importing a key (for example to rotate its value) updates the secret but keeps its health state: a key already quarantined as `QUOTA_EXHAUSTED` or `AUTH_FAILED` stays out of the pool until you run `keys:enable`.

If your inventory lives in a Google Sheet, export it with **File → Download → Comma-separated values** and import it. Keep the export private. The optional Sheet sync in section 12 uses a separate metadata-only sheet.

The importer uses the AWS credential chain from your terminal, writes actual provider credentials to Secrets Manager, and writes only metadata/state plus the secret ID to DynamoDB.

Do not paste real keys into chat, source code, Terraform, Git, or logs.

For the deployed Perfect Corp AI Clothes integration, see [docs/perfectcorp-clothes.md](docs/perfectcorp-clothes.md).

## 4. Create the friend's application credential

```bash
npm run create:client -- friend-1
```

You will receive:

```text
CLIENT_ID=friend-1
CLIENT_TOKEN=<one-time displayed value>
```

Store the token in the friend's server-side secret store. The raw token is not stored in DynamoDB.

## 5. Call the API in basic mode

```bash
curl -X POST \
  "$(terraform -chdir=terraform output -raw api_url)/v1/request" \
  -H 'content-type: application/json' \
  -H 'x-client-id: friend-1' \
  -H 'x-client-token: YOUR_CLIENT_TOKEN' \
  -d '{"prompt":"hello"}'
```

The upstream key is never returned.

## 6. Recommended: lock the API behind mTLS

For a server-to-server integration, use a custom API domain and mutual TLS. AWS explicitly recommends disabling the generated `execute-api` endpoint when you want clients to access the API only through the mTLS custom domain. API Gateway HTTP APIs support mTLS on Regional custom domains and enforce TLS 1.2 security policy; client certificates are validated by API Gateway.

### 6a. Get an ACM certificate

Use an ACM certificate for your API domain, for example `api.example.com`. The certificate is server-side TLS; it is not the client certificate.

Set:

```hcl
custom_domain_name           = "api.example.com"
acm_certificate_arn          = "arn:aws:acm:REGION:ACCOUNT:certificate/ID"
# disable_execute_api_endpoint = true  # enable after mTLS works
# route53_zone_id              = "YOUR_HOSTED_ZONE_ID"
```

### 6b. Generate a client certificate on your operator machine

The private key stays on the friend's server and must never be uploaded to AWS or shared in chat.

```bash
openssl req -x509 -newkey rsa:3072 -sha256 -nodes \
  -keyout friend-1.key \
  -out friend-1.crt \
  -days 365 \
  -subj "/CN=friend-1"

chmod 600 friend-1.key
cat friend-1.crt > truststore.pem
```

API Gateway accepts self-signed client certificates in the truststore; it checks syntax, integrity, validity and chaining. AWS notes that API Gateway does not perform certificate revocation checking, so replacing/updating the truststore is part of certificate revocation/rotation.

### 6c. Upload the truststore

If Terraform created the optional mTLS bucket, get its name:

```bash
terraform -chdir=terraform output -raw mtls_bucket_name
```

Upload:

```bash
aws s3 cp truststore.pem "s3://YOUR_BUCKET/truststore.pem"
```

Get the version ID:

```bash
aws s3api list-object-versions \
  --bucket YOUR_BUCKET \
  --prefix truststore.pem \
  --query 'Versions[?IsLatest].VersionId | [0]' \
  --output text
```

Then configure:

```hcl
mtls_truststore_uri     = "s3://YOUR_BUCKET/truststore.pem"
mtls_truststore_version = "YOUR_VERSION_ID"
disable_execute_api_endpoint = true
```

Run:

```bash
terraform -chdir=terraform apply
```

AWS documents that the truststore is an S3 object and recommends S3 versioning when maintaining versions.

### 6d. DNS

If the domain is in Route 53, put its hosted-zone ID in `route53_zone_id` and Terraform will create the alias record.

Otherwise create the DNS record with your DNS provider using:

```bash
terraform -chdir=terraform output -raw custom_domain_target
```

Then point `api.example.com` to that regional API Gateway target.

Custom domains use TLS 1.2+ and give clients a stable, friendly hostname.

### 6e. Test mTLS

On the friend's server:

```bash
curl --cert ./friend-1.crt --key ./friend-1.key \
  -X POST "https://api.example.com/v1/request" \
  -H 'content-type: application/json' \
  -H 'x-client-id: friend-1' \
  -H 'x-client-token: YOUR_CLIENT_TOKEN' \
  -d '{"prompt":"hello"}'
```

Without the client certificate, the TLS handshake is rejected by API Gateway.

## 7. Key management commands

List non-secret key state:

```bash
npm run keys:list
```

Disable one key manually:

```bash
npm run keys:disable -- provider-001
```

Re-enable one key manually:

```bash
npm run keys:enable -- provider-001
```

No command in this project prints the upstream secret value.

## 8. How failover works

Example:

```text
K001 ACTIVE
K002 ACTIVE
K003 ACTIVE
K004 TEMP_DISABLED until 12:01
K005 QUOTA_EXHAUSTED
```

A request claims K001.

If the provider returns a documented quota-exhaustion response:

```text
K001 -> QUOTA_EXHAUSTED
```

That request immediately continues with another eligible key. K001 is not selected by future requests because its `eligibleAt` is moved far into the future.

If a key returns a transient failure such as a timeout, 502, 503 or provider-documented rate limit:

```text
K001 -> TEMP_DISABLED
```

After the cooldown expires, it becomes eligible again. The DynamoDB conditional claim promotes it back to ACTIVE.

## 9. Important error classification rule

Do not blindly classify every `429` as exhausted credits. Providers commonly use 429 for temporary rate limiting. Customize `classify()` in `src/provider.ts` from the provider's documented error schema.

The safe retry rule is:

- quota/auth error with documented semantics -> move key out of pool and try another key
- transient error -> temporary quarantine and try another key
- ordinary client error such as malformed input -> do not rotate through hundreds of credentials; return an error

## 10. Logs and what is deliberately absent

Lambda logs contain only metadata such as request ID, key ID and error class.

They do not print:

- upstream API key
- upstream API secret
- client token
- request body
- upstream authorization header

API Gateway access logs intentionally include request ID, route, status, latency and source IP only. Do not add `$context.identity.clientCert` or arbitrary headers to the access-log template unless you have a specific audit requirement.

CloudTrail should be enabled at the AWS-account level and used to audit sensitive control-plane operations. AWS recommends strong access controls around CloudTrail log storage and monitoring.

## 11. AWS access model

Only the Lambda role needs:

- `dynamodb:GetItem`
- `dynamodb:Query`
- `dynamodb:UpdateItem`
- `secretsmanager:GetSecretValue`
- `kms:Decrypt` for the Secrets Manager KMS key, restricted with `kms:ViaService`

The friend receives none of these permissions.

API Gateway should have an authorizer for every public route in a mature deployment; AWS recommends authorizers as an access-control layer for HTTP APIs. mTLS can be combined with other authorization mechanisms.

## 12. Google Sheets

The sheet is your **inventory and on/off switch**. It never holds credential values; those only live in Secrets Manager (via `import:keys`). The sync refuses to run if the sheet has an `api_key`, `api_secret`, `secret`, `token`, `password` or `key` column.

Sheet layout (tab name `Keys` by default, header row required, column order free):

```text
key_id       | provider   | label        | operator_status
provider-001 | provider-x | team A quota | active
provider-002 | provider-x | spare        | disabled
```

What the sync does on each run:

| Sheet says | DynamoDB has | Result |
|---|---|---|
| new `key_id` whose secret exists | nothing | row created (`ACTIVE`, or `DISABLED` if the sheet says so) |
| new `key_id` with no secret | nothing | reported as *missing secret*; run `import:keys` first |
| `label` changed | key | label updated |
| `disabled` | any status | `DISABLED` (lease dropped, the previous status remembered) |
| `active` / blank | `DISABLED` by the sheet | restored to its previous status: a quota/auth-quarantined key stays quarantined |
| `active` / blank | `DISABLED` by `keys:disable` | left alone; only `keys:enable` lifts a CLI disable |
| row missing | key | left alone and reported as *not in sheet* (the sync never deletes) |

The sync never overrides health state set by live traffic (`QUOTA_EXHAUSTED`, `AUTH_FAILED`, `TEMP_DISABLED`, leases). DynamoDB remains the runtime source of truth.

### 12a. Google side (one time)

1. In Google Cloud Console, create a project, enable the **Google Sheets API**, and create a **service account** with no roles.
2. Create a JSON key for it and download it (for example `service-account.json`; the name is covered by `.gitignore`).
3. Share the sheet with the service account's `client_email` as **Viewer**.
4. Copy the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`.

### 12b. Try it locally first

```bash
export SHEET_ID="<SHEET_ID>"
export GOOGLE_SERVICE_ACCOUNT_FILE="./service-account.json"
npm run sheet:check   # dry run: prints what would change, writes nothing
npm run sheet:sync    # applies the changes
```

### 12c. Run it on a schedule in AWS

In `terraform/terraform.tfvars`:

```hcl
sheet_sync_enabled  = true
sheet_id            = "<SHEET_ID>"
sheet_sync_schedule = "rate(15 minutes)"
```

Run `./scripts/deploy.sh`, then store the service account JSON in the secret Terraform created. Doing it this way keeps it out of Terraform state:

```bash
aws secretsmanager put-secret-value \
  --secret-id "$(terraform -chdir=terraform output -raw google_sa_secret_arn)" \
  --secret-string file://service-account.json
rm service-account.json
```

Check a run:

```bash
aws lambda invoke --function-name "$(terraform -chdir=terraform output -raw sheet_sync_function_name)" /dev/stdout
```

The sync Lambda has its own role: it can query/put/update the key table, call `DescribeSecret` (existence only, never the value) on provider secrets, and read only the Google service account secret.

## 13. Operational checks

Verify identity:

```bash
aws sts get-caller-identity
```

See Lambda configuration without secrets:

```bash
aws lambda get-function-configuration \
  --function-name "$(terraform -chdir=terraform output -raw lambda_function_name)" \
  --query 'Environment.Variables'
```

Tail logs:

```bash
aws logs tail "/aws/lambda/$(terraform -chdir=terraform output -raw lambda_function_name)" --follow
```

List secret metadata (not secret values):

```bash
aws secretsmanager list-secrets \
  --filters Key=name,Values=api-key-pool/providers \
  --query 'SecretList[].{Name:Name,Arn:ARN}'
```

Never run `aws secretsmanager get-secret-value` casually in a shared terminal or paste its output into chat. AWS specifically warns that CLI/shell use can expose secret material through shell history/logging.

## 14. First deployment sequence

```bash
aws sts get-caller-identity
cp .env.example .env
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# edit terraform.tfvars
chmod +x scripts/deploy.sh
./scripts/deploy.sh
terraform -chdir=terraform output
export SECRETS_KMS_KEY_ARN="$(terraform -chdir=terraform output -raw secrets_kms_key_arn)"
npm run import:keys -- ./keys.csv
npm run create:client -- friend-1
# optional: Google Sheet sync, see section 12
```

Then test basic mode. After that, configure the custom domain + mTLS and set `disable_execute_api_endpoint = true`.

## Production checklist

1. Use mTLS for B2B clients.
2. Keep the app token in the friend's server-side secret store.
3. Disable the default `execute-api` endpoint once mTLS custom-domain access is working.
4. Keep upstream URL fixed server-side.
5. Never log request bodies or authorization headers.
6. Use the provider's documented error codes for quota/auth classification.
7. Keep DynamoDB conditional claims and leases enabled.
8. Keep Lambda reserved concurrency below the level that could overwhelm the upstream provider.
9. Enable/verify CloudTrail and alerts for IAM/Secrets Manager control-plane anomalies.
10. Rotate/revoke credentials according to provider rules.
