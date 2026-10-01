env        = "staging"
vpc_cidr   = "10.30.0.0/16"
nat_per_az = false

# Small and cheap: one task each, Spot for the marketing sites.
apps = {
  api     = { cpu = 512, memory = 1024, desired = 1, min = 1, max = 3, spot = false }
  portal  = { cpu = 256, memory = 512, desired = 1, min = 1, max = 2, spot = false }
  admin   = { cpu = 256, memory = 512, desired = 1, min = 1, max = 1, spot = true }
  newsite = { cpu = 256, memory = 512, desired = 1, min = 1, max = 2, spot = true }
  www     = { cpu = 256, memory = 512, desired = 1, min = 1, max = 2, spot = true }
}

# Scales to zero after 10 idle minutes (the first query then waits ~15 s).
aurora_min_acu            = 0
aurora_max_acu            = 2
aurora_instances          = 1
aurora_auto_pause_seconds = 600
db_backup_retention_days  = 3
deletion_protection       = false

create_looks_bucket = true
looks_bucket_name   = "clothsy-looks-staging-251929332238"

image_tag = "staging-initial"
