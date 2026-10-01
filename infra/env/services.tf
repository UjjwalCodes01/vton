# The five apps. Public URLs are the CloudFront domains until custom domains
# exist (var.public_urls), so every cross-app link points at the edge.

locals {
  public_url = {
    for app in local.apps : app => lookup(var.public_urls, app, "https://${aws_cloudfront_distribution.app[app].domain_name}")
  }

  api_environment = {
    NODE_ENV           = "production"
    PORT               = "3000"
    CLIENT_IP_HEADER   = "cloudfront-viewer-address"
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
  admin_secrets = { APP_SECRETS_JSON = aws_secretsmanager_secret.app["admin"].arn }

  common = {
    env                  = var.env
    cluster_arn          = aws_ecs_cluster.main.arn
    cluster_name         = aws_ecs_cluster.main.name
    vpc_id               = aws_vpc.main.id
    subnet_ids           = aws_subnet.app[*].id
    security_group_ids   = [aws_security_group.app.id]
    listener_arn         = local.listener_arn
    origin_verify_secret = random_password.origin_verify.result
    execution_role_arn   = aws_iam_role.execution.arn
  }
}

module "api" {
  source               = "../modules/app-service"
  name                 = "api"
  image                = "${local.ecr}/api:${var.image_tag}"
  listener_priority    = 10
  task_role_arn        = aws_iam_role.api_task.arn
  health_check_path    = "/healthz"
  environment          = local.api_environment
  secrets              = local.api_secrets
  cpu                  = var.apps["api"].cpu
  memory               = var.apps["api"].memory
  desired_count        = var.apps["api"].desired
  min_count            = var.apps["api"].min
  max_count            = var.apps["api"].max
  use_spot             = var.apps["api"].spot
  env                  = local.common.env
  cluster_arn          = local.common.cluster_arn
  cluster_name         = local.common.cluster_name
  vpc_id               = local.common.vpc_id
  subnet_ids           = local.common.subnet_ids
  security_group_ids   = local.common.security_group_ids
  listener_arn         = local.common.listener_arn
  origin_verify_secret = local.common.origin_verify_secret
  execution_role_arn   = local.common.execution_role_arn
  depends_on           = [aws_secretsmanager_secret_version.db, aws_rds_cluster_instance.main]
}

module "portal" {
  source               = "../modules/app-service"
  name                 = "portal"
  image                = "${local.ecr}/portal:${var.image_tag}"
  listener_priority    = 20
  task_role_arn        = aws_iam_role.web_task.arn
  environment          = { NODE_ENV = "production", CLOTHSY_API_BASE = local.public_url["api"] }
  cpu                  = var.apps["portal"].cpu
  memory               = var.apps["portal"].memory
  desired_count        = var.apps["portal"].desired
  min_count            = var.apps["portal"].min
  max_count            = var.apps["portal"].max
  use_spot             = var.apps["portal"].spot
  env                  = local.common.env
  cluster_arn          = local.common.cluster_arn
  cluster_name         = local.common.cluster_name
  vpc_id               = local.common.vpc_id
  subnet_ids           = local.common.subnet_ids
  security_group_ids   = local.common.security_group_ids
  listener_arn         = local.common.listener_arn
  origin_verify_secret = local.common.origin_verify_secret
  execution_role_arn   = local.common.execution_role_arn
}

module "admin" {
  source            = "../modules/app-service"
  name              = "admin"
  image             = "${local.ecr}/admin:${var.image_tag}"
  listener_priority = 30
  task_role_arn     = aws_iam_role.web_task.arn
  environment = {
    NODE_ENV         = "production"
    CLOTHSY_API_BASE = local.public_url["api"]
    CLIENT_IP_HEADER = "cloudfront-viewer-address"
  }
  secrets              = local.admin_secrets
  cpu                  = var.apps["admin"].cpu
  memory               = var.apps["admin"].memory
  desired_count        = var.apps["admin"].desired
  min_count            = var.apps["admin"].min
  max_count            = var.apps["admin"].max
  use_spot             = var.apps["admin"].spot
  env                  = local.common.env
  cluster_arn          = local.common.cluster_arn
  cluster_name         = local.common.cluster_name
  vpc_id               = local.common.vpc_id
  subnet_ids           = local.common.subnet_ids
  security_group_ids   = local.common.security_group_ids
  listener_arn         = local.common.listener_arn
  origin_verify_secret = local.common.origin_verify_secret
  execution_role_arn   = local.common.execution_role_arn
}

module "newsite" {
  source               = "../modules/app-service"
  name                 = "newsite"
  image                = "${local.ecr}/newsite:${var.image_tag}"
  listener_priority    = 40
  task_role_arn        = aws_iam_role.web_task.arn
  environment          = { NODE_ENV = "production" }
  cpu                  = var.apps["newsite"].cpu
  memory               = var.apps["newsite"].memory
  desired_count        = var.apps["newsite"].desired
  min_count            = var.apps["newsite"].min
  max_count            = var.apps["newsite"].max
  use_spot             = var.apps["newsite"].spot
  env                  = local.common.env
  cluster_arn          = local.common.cluster_arn
  cluster_name         = local.common.cluster_name
  vpc_id               = local.common.vpc_id
  subnet_ids           = local.common.subnet_ids
  security_group_ids   = local.common.security_group_ids
  listener_arn         = local.common.listener_arn
  origin_verify_secret = local.common.origin_verify_secret
  execution_role_arn   = local.common.execution_role_arn
}

module "www" {
  source               = "../modules/app-service"
  name                 = "www"
  image                = "${local.ecr}/www:${var.image_tag}"
  listener_priority    = 50
  task_role_arn        = aws_iam_role.web_task.arn
  environment          = { NODE_ENV = "production" }
  cpu                  = var.apps["www"].cpu
  memory               = var.apps["www"].memory
  desired_count        = var.apps["www"].desired
  min_count            = var.apps["www"].min
  max_count            = var.apps["www"].max
  use_spot             = var.apps["www"].spot
  env                  = local.common.env
  cluster_arn          = local.common.cluster_arn
  cluster_name         = local.common.cluster_name
  vpc_id               = local.common.vpc_id
  subnet_ids           = local.common.subnet_ids
  security_group_ids   = local.common.security_group_ids
  listener_arn         = local.common.listener_arn
  origin_verify_secret = local.common.origin_verify_secret
  execution_role_arn   = local.common.execution_role_arn
}
