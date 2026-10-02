# The five apps as ECS Express Mode services. Express Mode gives each one an
# HTTPS address of its own, https://cl-<id>.ecs.<region>.on.aws, assigned when
# the service is created and kept for its lifetime. The apps point at each
# other through var.public_urls: after the first apply, copy the express_urls
# output into the env's tfvars (or set custom domains) and apply again.

locals {
  public_url = { for app in local.apps : app => lookup(var.public_urls, app, "") }
}

check "public_urls" {
  assert {
    condition     = alltrue([for app in local.apps : lookup(var.public_urls, app, "") != ""])
    error_message = "public_urls is missing apps; copy the express_urls output into the tfvars and apply again."
  }
}

locals {

  api_environment = {
    NODE_ENV = "production"
    PORT     = "3000"
    # The load balancer appends the connecting client to X-Forwarded-For.
    CLIENT_IP_HEADER   = "x-forwarded-for-last"
    PUBLIC_APP_URL     = local.public_url["api"]
    SHOPIFY_APP_URL    = local.public_url["api"]
    PORTAL_PUBLIC_BASE = local.public_url["portal"]
    SHARE_PUBLIC_BASE  = local.public_url["newsite"]
    SHARE_S3_ENDPOINT  = "https://${var.looks_bucket_name}.s3.${var.region}.amazonaws.com"
    SHARE_S3_BUCKET    = var.looks_bucket_name
    SHARE_S3_REGION    = var.region
    SAFETY_PROXY_BASE  = var.safety_proxy_base
    SAFETY_GUARD_MODE  = "guard"
  }
  # Each app's secret is injected whole as APP_SECRETS_JSON; the container's
  # aws-start.mjs turns its keys into environment variables, so the secret can
  # hold exactly the keys the app uses (put with infra/scripts/put-app-secret.sh).
  api_secrets = {
    DATABASE_URL     = "${aws_secretsmanager_secret.db.arn}:url::"
    APP_SECRETS_JSON = aws_secretsmanager_secret.app["api"].arn
  }

  common = {
    env                     = var.env
    cluster_name            = aws_ecs_cluster.main.name
    subnet_ids              = aws_subnet.public[*].id
    security_group_ids      = [aws_security_group.app.id]
    execution_role_arn      = aws_iam_role.execution.arn
    infrastructure_role_arn = aws_iam_role.infrastructure.arn
  }
}

module "api" {
  source                  = "../modules/app-service"
  name                    = "api"
  image                   = "${local.ecr}/api:${var.image_tag}"
  task_role_arn           = aws_iam_role.api_task.arn
  health_check_path       = "/healthz"
  environment             = local.api_environment
  secrets                 = local.api_secrets
  cpu                     = var.apps["api"].cpu
  memory                  = var.apps["api"].memory
  min_count               = var.apps["api"].min
  max_count               = var.apps["api"].max
  env                     = local.common.env
  cluster_name            = local.common.cluster_name
  subnet_ids              = local.common.subnet_ids
  security_group_ids      = local.common.security_group_ids
  execution_role_arn      = local.common.execution_role_arn
  infrastructure_role_arn = local.common.infrastructure_role_arn
  depends_on              = [aws_secretsmanager_secret_version.db, aws_rds_cluster_instance.main, aws_ecs_cluster_capacity_providers.main]
}

module "portal" {
  source                  = "../modules/app-service"
  name                    = "portal"
  image                   = "${local.ecr}/portal:${var.image_tag}"
  task_role_arn           = aws_iam_role.web_task.arn
  health_check_path       = "/login"
  environment             = { NODE_ENV = "production", CLOTHSY_API_BASE = local.public_url["api"] }
  cpu                     = var.apps["portal"].cpu
  memory                  = var.apps["portal"].memory
  min_count               = var.apps["portal"].min
  max_count               = var.apps["portal"].max
  env                     = local.common.env
  cluster_name            = local.common.cluster_name
  subnet_ids              = local.common.subnet_ids
  security_group_ids      = local.common.security_group_ids
  execution_role_arn      = local.common.execution_role_arn
  infrastructure_role_arn = local.common.infrastructure_role_arn
  depends_on              = [module.api]
}

module "admin" {
  source            = "../modules/app-service"
  name              = "admin"
  image             = "${local.ecr}/admin:${var.image_tag}"
  task_role_arn     = aws_iam_role.web_task.arn
  health_check_path = "/login"
  environment = {
    NODE_ENV         = "production"
    CLOTHSY_API_BASE = local.public_url["api"]
    CLIENT_IP_HEADER = "x-forwarded-for-last"
  }
  secrets                 = { APP_SECRETS_JSON = aws_secretsmanager_secret.app["admin"].arn }
  cpu                     = var.apps["admin"].cpu
  memory                  = var.apps["admin"].memory
  min_count               = var.apps["admin"].min
  max_count               = var.apps["admin"].max
  env                     = local.common.env
  cluster_name            = local.common.cluster_name
  subnet_ids              = local.common.subnet_ids
  security_group_ids      = local.common.security_group_ids
  execution_role_arn      = local.common.execution_role_arn
  infrastructure_role_arn = local.common.infrastructure_role_arn
  depends_on              = [module.api]
}

module "newsite" {
  source                  = "../modules/app-service"
  name                    = "newsite"
  image                   = "${local.ecr}/newsite:${var.image_tag}"
  task_role_arn           = aws_iam_role.web_task.arn
  environment             = { NODE_ENV = "production" }
  cpu                     = var.apps["newsite"].cpu
  memory                  = var.apps["newsite"].memory
  min_count               = var.apps["newsite"].min
  max_count               = var.apps["newsite"].max
  env                     = local.common.env
  cluster_name            = local.common.cluster_name
  subnet_ids              = local.common.subnet_ids
  security_group_ids      = local.common.security_group_ids
  execution_role_arn      = local.common.execution_role_arn
  infrastructure_role_arn = local.common.infrastructure_role_arn
  depends_on              = [module.api]
}

module "www" {
  source                  = "../modules/app-service"
  name                    = "www"
  image                   = "${local.ecr}/www:${var.image_tag}"
  task_role_arn           = aws_iam_role.web_task.arn
  environment             = { NODE_ENV = "production" }
  cpu                     = var.apps["www"].cpu
  memory                  = var.apps["www"].memory
  min_count               = var.apps["www"].min
  max_count               = var.apps["www"].max
  env                     = local.common.env
  cluster_name            = local.common.cluster_name
  subnet_ids              = local.common.subnet_ids
  security_group_ids      = local.common.security_group_ids
  execution_role_arn      = local.common.execution_role_arn
  infrastructure_role_arn = local.common.infrastructure_role_arn
  depends_on              = [module.api]
}
