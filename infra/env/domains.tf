# Custom domains (production). One certificate for all of them, issued once
# the validation records from the certificate_dns_records output exist at the
# registrar. Attaching it to the load balancer and adding each domain to its
# service's listener rule comes after the certificate is issued.

locals {
  custom_domain_names = sort(values(var.custom_domains))
}

resource "aws_acm_certificate" "custom" {
  count                     = length(local.custom_domain_names) > 0 ? 1 : 0
  domain_name               = local.custom_domain_names[0]
  subject_alternative_names = slice(local.custom_domain_names, 1, length(local.custom_domain_names))
  validation_method         = "DNS"
  tags                      = { Name = "${local.name}-custom-domains" }

  lifecycle {
    create_before_destroy = true
  }
}
