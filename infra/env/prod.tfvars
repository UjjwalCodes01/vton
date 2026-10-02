env      = "prod"
vpc_cidr = "10.40.0.0/16"

# At least two tasks across two availability zones for everything shoppers touch.
apps = {
  # 1024/2048 once the Fargate quota is raised from 8 vCPU (case 179086292300406):
  # at 8, a canary deploy of 1-vCPU tasks next to everything else hits the limit.
  api     = { cpu = 512, memory = 1024, min = 2, max = 6 }
  portal  = { cpu = 512, memory = 1024, min = 2, max = 4 }
  admin   = { cpu = 256, memory = 512, min = 1, max = 2 }
  newsite = { cpu = 256, memory = 512, min = 2, max = 4 }
  www     = { cpu = 256, memory = 512, min = 2, max = 4 }
}

# A writer and a reader in two availability zones; scales between 0.5 and 8 ACU.
aurora_min_acu           = 0.5
aurora_max_acu           = 8
aurora_instances         = 2
db_backup_retention_days = 14
deletion_protection      = true

# The existing bucket the app already uses.
create_looks_bucket = false
looks_bucket_name   = "clothsy-looks"

image_tag = "prod-initial"

# The addresses Express Mode assigned to the services (terraform output express_urls);
# at cutover, the custom domains (api = "https://api.clothsyai.fabricvton.com", ...).
public_urls = {
  api     = "https://cl-47e6c76a745d43f8bb595198f5ab9517.ecs.us-east-1.on.aws"
  portal  = "https://cl-e20e6f452ed04fcc85e025adaf14eb1d.ecs.us-east-1.on.aws"
  admin   = "https://cl-a37a560e7ae542e88964956787bc3f7a.ecs.us-east-1.on.aws"
  newsite = "https://cl-ce04b594803e4b5b840b331ecfbfff92.ecs.us-east-1.on.aws"
  www     = "https://cl-6dd5a8428a7d495e885078f7e844642b.ecs.us-east-1.on.aws"
}
