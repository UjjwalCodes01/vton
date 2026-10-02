# Clothsy on AWS (staging + production)

Everything that runs on Render and Vercel today, on AWS in `us-east-1`, next to Rekognition, Bedrock, the safety/guard Lambdas and RPAPIR. Terraform in this folder; the guard and safety Lambdas stay in `../safety-aws`, RPAPIR in its own repo.

| Piece | AWS |
|---|---|
| Backend `fabricvton`, portal `custom-store`, `admin-dashboard`, `fabricvton-newsite` (clothsyai), `fabricvton-nextjs` (www) | One **ECS Express Mode** service each (Fargate, one Dockerfile per app, Node 24): HTTPS address with an AWS-managed certificate, a load balancer shared by the environment's services, CPU autoscaling, canary deploys that roll back by themselves |
| Protection | AWS WAF on the shared load balancer: IP reputation, known bad inputs, per-IP rate limit (Shopify proxy and webhooks exempt) |
| Client address | The load balancer appends the caller to `X-Forwarded-For`; the apps take the right-most entry (`CLIENT_IP_HEADER=x-forwarded-for-last`), never a header a caller can set |
| Database | Aurora PostgreSQL 17 Serverless v2 (staging scales to zero after 10 idle minutes; prod 0.5–8 ACU, writer + reader in 2 AZs, 14-day backups, deletion protection), reachable only from the apps' security group |
| Storage | S3: `clothsy-looks` (prod), `clothsy-looks-staging-…` (staging); the backend signs with its task role, no stored keys |
| Config | Secrets Manager: `clothsy/<env>/api`, `/admin` (app config, whole JSON injected and expanded by `aws-start.mjs`), `/db` (DATABASE_URL), `/build` (build-time values) |
| Network | VPC per env: public subnets for the load balancer and tasks (public addresses, no NAT), isolated database subnets, free S3/DynamoDB endpoints |
| Deploys | `scripts/deploy.sh <env>` (build → ECR → migrations as a one-off task → new image to each Express service, waits for the canary), run by `.github/workflows/deploy-{staging,prod}.yml` through GitHub OIDC roles |

Express Mode replaced a CloudFront + load balancer design because this account cannot create CloudFront resources until AWS verifies it. CloudFront (edge caching for the static sites, WAF at the edge) can be put in front later without changing the services.

## Layout

- `bootstrap/`: ECR repositories `clothsy/{api,portal,admin,newsite,www}` and the deploy roles `clothsy-{staging,prod}-github-deploy` (staging trusts `main`, prod only the GitHub `production` environment).
- `env/`: one root module for both environments. `terraform init -backend-config=<env>.backend.hcl`, `terraform apply -var-file=<env>.tfvars`. State in `clothsy-safety-tfstate-251929332238` under `infra/`.
  - Express Mode picks each service's address (`https://cl-<id>.ecs.us-east-1.on.aws`) when it creates the service. The apps point at each other through `public_urls`, so a new environment takes two applies: the first creates the services, then copy the `express_urls` output into `<env>.tfvars` and apply again (and deploy, since the portal and newsite bake the API address in at build time).
- `modules/app-service/`: one Express Mode service and its log group. Terraform owns everything but the running image, which deploys change.
- `scripts/put-app-secret.sh <env> <api|admin> <file.env>`: loads an env file (e.g. the Render export) into the app's secret; values are never printed.
- `scripts/deploy.sh <env> [apps]`; `scripts/deploy.sh <env> migrate` runs only the backend's migrations (new environment, database cutover).

## Status (2 October 2026)

- Staging is up: Aurora, secrets, cluster and the five services; addresses in `env/staging.tfvars`. The app secrets hold generated placeholders, so Shopify, Google sign-in and try-ons need the real values (`put-app-secret.sh`) before they work end to end.
- To deploy from GitHub: apply `bootstrap/` (the deploy roles gained `RegisterTaskDefinition` and the service-deployment reads that `deploy.sh` uses), then set the repository variable `STAGING_DEPLOY_ENABLED=true`.
- Pending quota cases: Lambda concurrency 10 → 1000, Fargate vCPU 8 → 32 (prod plus a rolling deploy needs more than 8).
- Production (step 4 of the plan): `terraform apply -var-file=prod.tfvars` twice as above, cleaned data copy from Render, custom domains on the services, DNS cutover, Render kept as a pass-through proxy for the old `fabricvton-api.onrender.com` host. At cutover, copy `WOO_SECRET_ENCRYPTION_KEY`, `PORTAL_SIGNING_SECRET` and `SHARE_SIGNING_SECRET` exactly from Render: the copied data is encrypted and signed with them.
