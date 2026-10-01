# One Clothsy environment on AWS (staging or prod): network, load balancer,
# ECS Fargate services for the five apps, Aurora PostgreSQL Serverless v2,
# CloudFront + WAF in front, S3 for shared looks, Secrets Manager for config.
#
#   cd infra/env
#   terraform init -backend-config=staging.backend.hcl
#   terraform apply -var-file=staging.tfvars
#
# Same code for both environments; only the .tfvars and backend file differ.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
  backend "s3" {}
}

provider "aws" {
  region = var.region
  default_tags {
    tags = { project = "clothsy", env = var.env, managed_by = "terraform" }
  }
}

data "aws_caller_identity" "current" {}

locals {
  name       = "clothsy-${var.env}"
  account_id = data.aws_caller_identity.current.account_id
  azs        = ["${var.region}a", "${var.region}b"]
  apps       = ["api", "portal", "admin", "newsite", "www"]
  ecr        = "${local.account_id}.dkr.ecr.${var.region}.amazonaws.com/clothsy"
  # Without a certificate on the load balancer (staging), CloudFront reaches it
  # over HTTP; with one (prod), over HTTPS only.
  origin_https = var.alb_certificate_arn != ""
}
