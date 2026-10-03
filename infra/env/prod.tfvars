env      = "prod"
vpc_cidr = "10.40.0.0/16"

# At least two tasks across two availability zones for everything shoppers touch.
apps = {
  # 1024/2048 once the Fargate quota is raised from 8 vCPU (case 179086292300406):
  # at 8, a canary deploy of 1-vCPU tasks next to everything else hits the limit.
  api     = { cpu = 512, memory = 1024, min = 2, max = 6 }
  portal  = { cpu = 512, memory = 1024, min = 2, max = 4 }
  # One task: the sign-in throttle lives in the task's memory, so a second task
  # would double what an attacker can try.
  admin   = { cpu = 256, memory = 512, min = 1, max = 1 }
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

# The public address of each app (the services also answer on their
# cl-<id>.ecs.us-east-1.on.aws addresses, which are in the express_urls output).
public_urls = {
  api     = "https://api.clothsyai.fabricvton.com"
  portal  = "https://app.clothsyai.fabricvton.com"
  admin   = "https://admin.clothsyai.fabricvton.com"
  newsite = "https://clothsyai.fabricvton.com"
  www     = "https://www.fabricvton.com"
}

# The live domains, attached to the services at the cutover (domains.tf).
custom_domains = {
  api     = "api.clothsyai.fabricvton.com"
  portal  = "app.clothsyai.fabricvton.com"
  admin   = "admin.clothsyai.fabricvton.com"
  newsite = "clothsyai.fabricvton.com"
  www     = "www.fabricvton.com"
}
