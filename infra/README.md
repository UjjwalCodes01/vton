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
  - Express Mode picks each service's address (`https://cl-<id>.ecs.us-east-1.on.aws`) when it creates the service. The apps point at each other through `public_urls`, so a new environment takes two applies: the first creates the services, then copy the `express_urls` output into `<env>.tfvars` and apply again (and deploy, since the portal and newsite bake the API address in at build time). The WAF attaches on that second apply too: ECS creates the load balancer moments after the services.
- `modules/app-service/`: one Express Mode service and its log group. Terraform owns everything but the running image, which deploys change. A Terraform change to a service's settings starts a deployment of its own, so do not apply while `deploy.sh` is rolling that environment: two overlapping canaries can leave the load balancer rule split between two target groups, after which Express refuses to deploy ("should have exactly one target group serving traffic") until the rule sends all traffic to the group with healthy targets again.
- `scripts/put-app-secret.sh <env> <api|admin> <file.env>`: loads an env file (e.g. the Render export) into the app's secret; values are never printed.
- `scripts/copy-db.sh <env> <file.env>`: copies the app's data from Neon (the file's `DATABASE_URL`) into the env's Aurora from a one-off task inside the VPC. Aurora keeps the schema its migrations made (run `deploy.sh <env> migrate` first); the script refuses unless Neon has applied exactly the same migrations, copies only the app's tables (another app keeps tables in that Neon database), drops the short-lived rows (rate-limit windows, Woo nonces, used or expired link codes and expired shared looks; never Shopify sessions, whose refresh tokens outlive their `expires`) and prints row counts on both sides. Neon runs PostgreSQL 18 and Aurora 17; a data-only copy into the migrated schema is unaffected by that. It replaces the app's data in the target and asks you to type the env name first.
- `scripts/attach-domains.sh <env> [--check]`: adds each of `custom_domains` (in `<env>.tfvars`) to the listener rule Express Mode made for that service, next to its `cl-<id>` host, so canary deploys cover both names. The certificate for them is in `env/domains.tf`: request it, add the `certificate_dns_records` at the registrar, apply again to attach it, then run this. `--check` only reports.
- `scripts/deploy.sh <env> [apps]`; `scripts/deploy.sh <env> migrate` runs only the backend's migrations (new environment, database cutover).

## Status (3 October 2026)

Production is live on AWS: the cutover happened on 3 October 2026 and the live domains point at the production load balancer. The full record (addresses, DNS, secrets, runbook, what is left, rollback, and the Shopify step) is in [`../AWS_MIGRATION.md`](../AWS_MIGRATION.md).
