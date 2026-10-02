env      = "staging"
vpc_cidr = "10.30.0.0/16"

# Small and cheap: one task each.
apps = {
  api     = { cpu = 512, memory = 1024, min = 1, max = 3 }
  portal  = { cpu = 256, memory = 512, min = 1, max = 2 }
  admin   = { cpu = 256, memory = 512, min = 1, max = 1 }
  newsite = { cpu = 256, memory = 512, min = 1, max = 2 }
  www     = { cpu = 256, memory = 512, min = 1, max = 2 }
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

# The addresses Express Mode assigned to the services (terraform output express_urls).
public_urls = {
  api     = "https://cl-234747317fdb40838ce22890d3e32163.ecs.us-east-1.on.aws"
  portal  = "https://cl-31885c7e0f754064be6a66b09bce3741.ecs.us-east-1.on.aws"
  admin   = "https://cl-5ebc7902fa844708abd9d20f4ebb4e27.ecs.us-east-1.on.aws"
  newsite = "https://cl-da5b87a283684620b04eae1a72b55f15.ecs.us-east-1.on.aws"
  www     = "https://cl-53d2317a22d04c048f77f4dfc1bb6bf9.ecs.us-east-1.on.aws"
}
