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

variable "image_tag" {
  type        = string
  description = "Image tag a service starts with when Terraform creates it; CI deploys later images."
}

variable "apps" {
  description = "Sizing per app: cpu units, memory MiB, min/max tasks for autoscaling."
  type = map(object({
    cpu    = number
    memory = number
    min    = number
    max    = number
  }))
}

variable "public_urls" {
  description = "Public base URL per app: the express_urls output after the first apply, or custom domains once attached."
  type        = map(string)
  default     = {}
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

variable "custom_domains" {
  description = "Custom domain per app. One ACM certificate covers them all; DNS validation records go to the registrar (GoDaddy for fabricvton.com)."
  type        = map(string)
  default     = {}
}
