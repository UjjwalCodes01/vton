output "public_urls" { value = local.public_url }
output "express_urls" {
  description = "The HTTPS address each Express Mode service actually received."
  value = {
    api     = module.api.url
    portal  = module.portal.url
    admin   = module.admin.url
    newsite = module.newsite.url
    www     = module.www.url
  }
}
output "cluster_name" { value = aws_ecs_cluster.main.name }
output "service_arns" {
  value = {
    api     = module.api.service_arn
    portal  = module.portal.service_arn
    admin   = module.admin.service_arn
    newsite = module.newsite.service_arn
    www     = module.www.service_arn
  }
}
output "db_endpoint" { value = aws_rds_cluster.main.endpoint }
output "secrets" {
  value = {
    api   = aws_secretsmanager_secret.app["api"].name
    admin = aws_secretsmanager_secret.app["admin"].name
    build = aws_secretsmanager_secret.build.name
    db    = aws_secretsmanager_secret.db.name
  }
}
output "looks_bucket" { value = var.looks_bucket_name }
output "certificate_dns_records" {
  description = "CNAME records to add at the registrar so ACM can issue the custom-domain certificate."
  value = length(aws_acm_certificate.custom) == 0 ? [] : [
    for o in aws_acm_certificate.custom[0].domain_validation_options :
    { domain = o.domain_name, type = o.resource_record_type, name = o.resource_record_name, value = o.resource_record_value }
  ]
}
output "certificate_status" {
  value = length(aws_acm_certificate.custom) == 0 ? null : aws_acm_certificate.custom[0].status
}
