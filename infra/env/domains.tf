# Custom domains (production). One certificate for all of them, issued once
# the validation records from the certificate_dns_records output exist at the
# registrar. Each domain is then added to its service's listener rule by
# scripts/attach-domains.sh (those rules belong to Express Mode, so Terraform
# only adds the certificate next to them).

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

# Waits until ACM has issued the certificate (its validation records are at the registrar).
resource "aws_acm_certificate_validation" "custom" {
  count           = length(aws_acm_certificate.custom)
  certificate_arn = aws_acm_certificate.custom[0].arn
}

# The certificate goes on the shared load balancer's HTTPS listener next to the
# ones Express Mode manages; the load balancer picks it by SNI for these names.
data "aws_lb_listener" "https" {
  count             = length(aws_acm_certificate.custom) > 0 && length(data.aws_lbs.express.arns) > 0 ? 1 : 0
  load_balancer_arn = one(data.aws_lbs.express.arns)
  port              = 443
}

resource "aws_lb_listener_certificate" "custom" {
  count           = length(data.aws_lb_listener.https)
  listener_arn    = data.aws_lb_listener.https[0].arn
  certificate_arn = aws_acm_certificate_validation.custom[0].certificate_arn
}
