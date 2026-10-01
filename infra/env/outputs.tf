output "public_urls" { value = local.public_url }
output "cloudfront_domains" { value = { for app, d in aws_cloudfront_distribution.app : app => d.domain_name } }
output "cluster_name" { value = aws_ecs_cluster.main.name }
output "services" {
  value = {
    api     = { service = module.api.service_name, family = module.api.task_family }
    portal  = { service = module.portal.service_name, family = module.portal.task_family }
    admin   = { service = module.admin.service_name, family = module.admin.task_family }
    newsite = { service = module.newsite.service_name, family = module.newsite.task_family }
    www     = { service = module.www.service_name, family = module.www.task_family }
  }
}
output "app_subnet_ids" { value = aws_subnet.app[*].id }
output "app_security_group_id" { value = aws_security_group.app.id }
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
