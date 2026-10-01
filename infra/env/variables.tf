variable "env" {
  type        = string
  description = "staging or prod"
  validation {
    condition     = contains(["staging", "prod"], var.env)
    error_message = "env must be staging or prod."
  }
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_cidr" { type = string }

variable "nat_per_az" {
  type        = bool
  description = "One NAT gateway per availability zone (prod) or a single shared one (staging)."
}

variable "image_tag" {
  type        = string
  description = "Image tag deployed by Terraform when a service is created; CI deploys later images."
}

variable "apps" {
  description = "Sizing per app: cpu units, memory MiB, desired/min/max tasks, Fargate Spot."
  type = map(object({
    cpu     = number
    memory  = number
    desired = number
    min     = number
    max     = number
    spot    = bool
  }))
}

variable "public_urls" {
  description = "Public base URLs per app once custom domains exist (empty: the CloudFront domain is used)."
  type        = map(string)
  default     = {}
}

variable "domain_aliases" {
  description = "Custom hostnames per app for CloudFront (requires cloudfront_certificate_arn)."
  type        = map(list(string))
  default     = {}
}

variable "cloudfront_certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate in us-east-1 covering domain_aliases."
}

variable "alb_certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate for the load balancer's origin hostname; empty = CloudFront reaches it over HTTP."
}

variable "aurora_min_acu" { type = number }
variable "aurora_max_acu" { type = number }
variable "aurora_instances" { type = number }
variable "aurora_auto_pause_seconds" {
  type        = number
  default     = 0
  description = "Pause after this much idle time when aurora_min_acu is 0 (staging)."
}
variable "aurora_engine_version" {
  type    = string
  default = "17.11"
}
variable "db_backup_retention_days" { type = number }
variable "deletion_protection" { type = bool }

variable "create_looks_bucket" {
  type        = bool
  description = "Create the shared-looks bucket (staging) or use an existing one (prod: clothsy-looks)."
}
variable "looks_bucket_name" { type = string }

variable "safety_proxy_base" {
  type    = string
  default = "https://zyfl4u1zef.execute-api.us-east-1.amazonaws.com"
}

variable "ga_measurement_id" {
  type        = string
  default     = ""
  description = "Google Analytics ID baked into www.fabricvton.com at build."
}
