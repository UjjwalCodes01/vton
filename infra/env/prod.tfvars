env      = "prod"
vpc_cidr = "10.40.0.0/16"

# At least two tasks across two availability zones for everything shoppers touch.
apps = {
  api     = { cpu = 1024, memory = 2048, min = 2, max = 10 }
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

# After the first apply: the express_urls output; at cutover, the custom domains
# (api = "https://api.clothsyai.fabricvton.com", ...).
# public_urls = { api = "...", portal = "...", admin = "...", newsite = "...", www = "..." }
