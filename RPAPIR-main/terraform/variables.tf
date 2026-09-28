variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "api-key-pool"
}

variable "provider_name" {
  type    = string
  default = "provider-x"
}

variable "upstream_base_url" {
  type = string
  validation {
    condition     = can(regex("^https://", var.upstream_base_url))
    error_message = "upstream_base_url must use HTTPS."
  }
}

variable "upstream_path" {
  type    = string
  default = "/v1/request"
}

variable "secret_prefix" {
  type    = string
  default = "api-key-pool/providers"
}

variable "lambda_reserved_concurrency" {
  type    = number
  default = -1
}

variable "api_rate_limit_rps" {
  type    = number
  default = 0.7
}

variable "api_burst_limit" {
  type    = number
  default = 2
}

variable "custom_domain_name" {
  type    = string
  default = ""
}

variable "acm_certificate_arn" {
  type    = string
  default = ""
}

variable "mtls_truststore_uri" {
  type    = string
  default = ""
}

variable "mtls_truststore_version" {
  type    = string
  default = ""
}

variable "disable_execute_api_endpoint" {
  type    = bool
  default = false
  validation {
    condition     = !(var.disable_execute_api_endpoint && (var.custom_domain_name == "" || var.acm_certificate_arn == "" || var.mtls_truststore_uri == ""))
    error_message = "disable_execute_api_endpoint=true requires custom_domain_name, acm_certificate_arn and mtls_truststore_uri."
  }
}

variable "route53_zone_id" {
  type    = string
  default = ""
}

variable "sheet_sync_enabled" {
  type    = bool
  default = false
}

variable "sheet_id" {
  type        = string
  default     = ""
  description = "Google Sheets spreadsheet ID (the long ID in the sheet URL)."
  validation {
    condition     = !var.sheet_sync_enabled || can(regex("^[A-Za-z0-9_-]{20,100}$", var.sheet_id))
    error_message = "sheet_sync_enabled=true requires sheet_id (the long ID from the sheet URL)."
  }
}

variable "sheet_range" {
  type        = string
  default     = "Keys"
  description = "Tab name or A1 range holding key_id | provider | label | operator_status."
}

variable "sheet_sync_schedule" {
  type    = string
  default = "rate(15 minutes)"
}
