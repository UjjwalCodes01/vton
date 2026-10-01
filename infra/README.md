# Clothsy on AWS (staging + production)

Everything that runs on Render and Vercel today, on AWS in `us-east-1`, next to Rekognition, Bedrock, the safety/guard Lambdas and RPAPIR. Terraform in this folder; the guard and safety Lambdas stay in `../safety-aws`, RPAPIR in its own repo.

| Piece | AWS |
|---|---|
| Backend `fabricvton`, portal `custom-store`, `admin-dashboard`, `fabricvton-newsite` (clothsyai), `fabricvton-nextjs` (www) | ECS Fargate services (one Dockerfile per app, Node 24), ≥ 2 tasks across 2 AZs in prod, CPU autoscaling, circuit-breaker rollback |
| Entry | CloudFront per app (TLS at the edge, static assets cached) → one Application Load Balancer that accepts only CloudFront (prefix list + `x-origin-verify` secret, routed by `x-clothsy-app`) |
| Protection | AWS WAF on API, portal, admin: IP reputation, known bad inputs, per-IP rate limit (Shopify proxy and webhooks exempt) |
| Database | Aurora PostgreSQL 17 Serverless v2 (staging scales to zero; prod 0.5–8 ACU, writer + reader in 2 AZs, 14-day backups, deletion protection) |
| Storage | S3: `clothsy-looks` (prod), `clothsy-looks-staging-…` (staging); the backend signs with its task role, no stored keys |
| Config | Secrets Manager: `clothsy/<env>/api`, `/admin` (app config, whole JSON injected and expanded by `aws-start.mjs`), `/db` (DATABASE_URL), `/build` (build-time values) |
| Network | VPC per env, private app subnets, isolated database subnets, NAT (1 staging, 2 prod), free S3/DynamoDB endpoints |
| Deploys | `scripts/deploy.sh <env>` (build → ECR → migrations as a one-off task → rolling deploy), run by `.github/workflows/deploy-{staging,prod}.yml` through GitHub OIDC roles |

## Layout

- `bootstrap/` (applied): ECR repositories `clothsy/{api,portal,admin,newsite,www}` and the deploy roles `clothsy-{staging,prod}-github-deploy` (staging trusts `main`, prod only the GitHub `production` environment).
- `env/`: one root module for both environments. `terraform init -backend-config=<env>.backend.hcl`, `terraform apply -var-file=<env>.tfvars`. State in `clothsy-safety-tfstate-251929332238` under `infra/`.
- `modules/app-service/`: one ECS service (task definition, target group, listener rule, autoscaling, logs).
- `scripts/put-app-secret.sh <env> <api|admin> <file.env>`: loads an env file (e.g. the Render export) into the app's secret; values are never printed.
- `scripts/deploy.sh <env> [apps]`.

## Status (1 October 2026)

- Bootstrap applied. Staging: network, load balancer, WAF and secrets created; the secrets hold generated placeholders.
- **Blocked: CloudFront.** AWS answered `Your account must be verified before you can add new CloudFront resources`; verification is a support request from the account owner. After it: `terraform apply -var-file=staging.tfvars` (Aurora, ECS, CloudFront), `scripts/deploy.sh staging`, then set the repository variable `STAGING_DEPLOY_ENABLED=true`.
- Pending quota cases: Lambda concurrency 10 → 1000, Fargate vCPU 8 → 32 (prod plus a rolling deploy needs more than 8).
- Production (step 4 of the plan): custom domains and certificates in `prod.tfvars`, Route 53 zone, cleaned data copy from Render, DNS cutover, Render kept as a pass-through proxy for the old `fabricvton-api.onrender.com` host. At cutover, copy `WOO_SECRET_ENCRYPTION_KEY`, `PORTAL_SIGNING_SECRET` and `SHARE_SIGNING_SECRET` exactly from Render: the copied data is encrypted and signed with them.
