# Shared, once-per-account pieces for the Clothsy apps on AWS: container
# repositories and the GitHub Actions deploy roles (OIDC, no stored keys).
#
#   cd infra/bootstrap && terraform init && terraform apply

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    bucket       = "clothsy-safety-tfstate-251929332238"
    key          = "infra/bootstrap.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" { region = "us-east-1" }

variable "github_repository" {
  type    = string
  default = "UjjwalCodes01/vton"
}

locals {
  apps = ["api", "portal", "admin", "newsite", "www"]
}

data "aws_caller_identity" "current" {}

resource "aws_ecr_repository" "app" {
  for_each             = toset(local.apps)
  name                 = "clothsy/${each.key}"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}

resource "aws_ecr_lifecycle_policy" "app" {
  for_each   = aws_ecr_repository.app
  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the 30 newest images"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 30 }
      action       = { type = "expire" }
    }]
  })
}

# The OIDC provider already exists in this account (created for EdgeVault).
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  # Staging deploys from main; production only from the GitHub "production"
  # environment, which needs a reviewer's approval.
  deploy_subjects = {
    staging = ["repo:${var.github_repository}:ref:refs/heads/main"]
    prod    = ["repo:${var.github_repository}:environment:production"]
  }
}

resource "aws_iam_role" "deploy" {
  for_each = local.deploy_subjects
  name     = "clothsy-${each.key}-github-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = data.aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        StringLike   = { "token.actions.githubusercontent.com:sub" = each.value }
      }
    }]
  })
}

resource "aws_iam_role_policy" "deploy" {
  for_each = aws_iam_role.deploy
  role     = each.value.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*" },
      {
        Effect = "Allow"
        Action = ["ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:BatchGetImage", "ecr:DescribeImages"]
        Resource = [for r in aws_ecr_repository.app : r.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition", "ecs:DescribeServices", "ecs:DescribeTasks", "ecs:ListTasks"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:UpdateService", "ecs:RunTask"]
        Resource = "*"
        Condition = {
          ArnLike = { "ecs:cluster" = "arn:aws:ecs:us-east-1:${data.aws_caller_identity.current.account_id}:cluster/clothsy-${each.key}" }
        }
      },
      {
        Effect    = "Allow"
        Action    = ["iam:PassRole"]
        Resource  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/clothsy-${each.key}-*"
        Condition = { StringEquals = { "iam:PassedToService" = "ecs-tasks.amazonaws.com" } }
      },
      { Effect = "Allow", Action = ["logs:GetLogEvents", "logs:FilterLogEvents"], Resource = "arn:aws:logs:us-east-1:${data.aws_caller_identity.current.account_id}:log-group:/ecs/clothsy-${each.key}-*" },
      { Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:clothsy/${each.key}/build-*" },
    ]
  })
}

output "ecr_repositories" { value = { for k, r in aws_ecr_repository.app : k => r.repository_url } }
output "deploy_role_arns" { value = { for k, r in aws_iam_role.deploy : k => r.arn } }
