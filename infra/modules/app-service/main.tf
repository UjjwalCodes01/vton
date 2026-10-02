# One containerised app as an ECS Express Mode service.
#
# Express Mode gives the service an HTTPS address of its own,
# https://<service-name>.ecs.<region>.on.aws, on a load balancer it shares with
# the environment's other services (up to 25 per VPC), with an AWS-managed
# certificate: no domain, DNS record or CDN is needed to serve it securely.
# It also brings canary deployments with automatic rollback alarms, and CPU
# target-tracking autoscaling. Custom domains and WAF attach to the same load
# balancer.

terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.67" }
  }
}

variable "env" { type = string }
variable "name" { type = string }
variable "image" { type = string }
variable "cluster_name" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "execution_role_arn" { type = string }
variable "infrastructure_role_arn" { type = string }
variable "task_role_arn" { type = string }
variable "cpu" { type = number }
variable "memory" { type = number }
variable "min_count" { type = number }
variable "max_count" { type = number }
variable "health_check_path" {
  type    = string
  default = "/"
}
variable "environment" {
  type    = map(string)
  default = {}
}
variable "secrets" {
  description = "Environment variable name => Secrets Manager reference (secret ARN, or <arn>:<json-key>::)."
  type        = map(string)
  default     = {}
}
variable "log_retention_days" {
  type    = number
  default = 30
}

locals {
  service_name = "clothsy-${var.env}-${var.name}"
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${local.service_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_ecs_express_gateway_service" "this" {
  service_name            = local.service_name
  cluster                 = var.cluster_name
  execution_role_arn      = var.execution_role_arn
  infrastructure_role_arn = var.infrastructure_role_arn
  task_role_arn           = var.task_role_arn
  cpu                     = tostring(var.cpu)
  memory                  = tostring(var.memory)
  health_check_path       = var.health_check_path

  network_configuration = [{
    subnets         = var.subnet_ids
    security_groups = var.security_group_ids
  }]

  scaling_target = [{
    auto_scaling_metric       = "AVERAGE_CPU"
    auto_scaling_target_value = 60
    min_task_count            = var.min_count
    max_task_count            = var.max_count
  }]

  primary_container {
    image          = var.image
    container_port = 3000
    aws_logs_configuration = [{
      log_group         = aws_cloudwatch_log_group.this.name
      log_stream_prefix = var.name
    }]
    dynamic "environment" {
      for_each = var.environment
      content {
        name  = environment.key
        value = environment.value
      }
    }
    dynamic "secret" {
      for_each = var.secrets
      content {
        name       = secret.key
        value_from = secret.value
      }
    }
  }

  # CI deploys new images (infra/scripts/deploy.sh); Terraform owns the rest.
  lifecycle {
    ignore_changes = [primary_container[0].image]
  }
}

output "service_name" { value = aws_ecs_express_gateway_service.this.service_name }
output "service_arn" { value = aws_ecs_express_gateway_service.this.service_arn }
output "url" {
  value = try(aws_ecs_express_gateway_service.this.ingress_paths[0].endpoint, "")
}
output "log_group" { value = aws_cloudwatch_log_group.this.name }
