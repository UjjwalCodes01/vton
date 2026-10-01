env        = "prod"
vpc_cidr   = "10.40.0.0/16"
nat_per_az = true

# Two tasks across two availability zones for everything shoppers touch.
apps = {
  api     = { cpu = 1024, memory = 2048, desired = 2, min = 2, max = 10, spot = false }
  portal  = { cpu = 512, memory = 1024, desired = 2, min = 2, max = 4, spot = false }
  admin   = { cpu = 256, memory = 512, desired = 1, min = 1, max = 2, spot = false }
  newsite = { cpu = 256, memory = 512, desired = 2, min = 2, max = 4, spot = false }
  www     = { cpu = 256, memory = 512, desired = 2, min = 2, max = 4, spot = false }
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

# Filled in at cutover (step 4): custom domains and certificates.
# public_urls                = { api = "https://api.clothsyai.fabricvton.com", ... }
# domain_aliases             = { api = ["api.clothsyai.fabricvton.com"], ... }
# cloudfront_certificate_arn = "arn:aws:acm:us-east-1:...:certificate/..."
# alb_certificate_arn        = "arn:aws:acm:us-east-1:...:certificate/..."
