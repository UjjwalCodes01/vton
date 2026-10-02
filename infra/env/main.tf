# One Clothsy environment on AWS (staging or prod): network, ECS Express Mode
# services for the five apps (each with its own HTTPS address on a shared load
# balancer), Aurora PostgreSQL Serverless v2, WAF, S3 for shared looks, and
# Secrets Manager for configuration.
#
#   cd infra/env
#   terraform init -backend-config=staging.backend.hcl
#   terraform apply -var-file=staging.tfvars
#
# Same code for both environments; only the .tfvars and backend file differ.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.67" }
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
}
