# Aurora PostgreSQL Serverless v2, the shared-looks bucket, and secrets.

resource "random_password" "db" {
  length  = 32
  special = false # used inside DATABASE_URL
}

resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.data[*].id
}

resource "aws_rds_cluster" "main" {
  cluster_identifier              = local.name
  engine                          = "aurora-postgresql"
  engine_mode                     = "provisioned"
  engine_version                  = var.aurora_engine_version
  database_name                   = "clothsy"
  master_username                 = "clothsy"
  master_password                 = random_password.db.result
  db_subnet_group_name            = aws_db_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.db.id]
  storage_encrypted               = true
  backup_retention_period         = var.db_backup_retention_days
  preferred_backup_window         = "20:00-21:00" # 01:30-02:30 IST
  deletion_protection             = var.deletion_protection
  skip_final_snapshot             = !var.deletion_protection
  final_snapshot_identifier       = var.deletion_protection ? "${local.name}-final" : null
  copy_tags_to_snapshot           = true
  enabled_cloudwatch_logs_exports = ["postgresql"]
  serverlessv2_scaling_configuration {
    min_capacity             = var.aurora_min_acu
    max_capacity             = var.aurora_max_acu
    seconds_until_auto_pause = var.aurora_min_acu == 0 ? var.aurora_auto_pause_seconds : null
  }
}

resource "aws_rds_cluster_instance" "main" {
  count                        = var.aurora_instances
  identifier                   = "${local.name}-${count.index}"
  cluster_identifier           = aws_rds_cluster.main.id
  instance_class               = "db.serverless"
  engine                       = aws_rds_cluster.main.engine
  engine_version               = aws_rds_cluster.main.engine_version
  db_subnet_group_name         = aws_db_subnet_group.main.name
  performance_insights_enabled = true
}

# The connection string the backend reads as DATABASE_URL. Prisma keeps a
# small pool per task; Aurora's connection limit scales with its capacity.
resource "aws_secretsmanager_secret" "db" {
  name                    = "clothsy/${var.env}/db"
  recovery_window_in_days = var.env == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = aws_rds_cluster.main.master_username
    password = random_password.db.result
    host     = aws_rds_cluster.main.endpoint
    port     = 5432
    dbname   = "clothsy"
    url      = "postgresql://${aws_rds_cluster.main.master_username}:${random_password.db.result}@${aws_rds_cluster.main.endpoint}:5432/clothsy?connection_limit=10&pool_timeout=20&sslmode=require"
  })
}

# App configuration and credentials (Shopify, Razorpay, Google, signing keys,
# proxy tokens...). Values are put with infra/scripts/put-app-secret.sh from a
# local env file, never through Terraform, so they stay out of its state.
resource "aws_secretsmanager_secret" "app" {
  for_each                = toset(["api", "admin"])
  name                    = "clothsy/${var.env}/${each.key}"
  recovery_window_in_days = var.env == "prod" ? 30 : 0
}

# Build-time values CI reads (the deploy role may read clothsy/<env>/build).
# Next.js bakes the server-action encryption key in at build, and it must stay
# the same across builds so actions keep working across instances and deploys.
resource "random_id" "actions_key" {
  for_each    = toset(["portal", "admin"])
  byte_length = 32
}

resource "aws_secretsmanager_secret" "build" {
  name                    = "clothsy/${var.env}/build"
  recovery_window_in_days = var.env == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "build" {
  secret_id = aws_secretsmanager_secret.build.id
  secret_string = jsonencode({
    PORTAL_ACTIONS_KEY = random_id.actions_key["portal"].b64_std
    ADMIN_ACTIONS_KEY  = random_id.actions_key["admin"].b64_std
    NEXT_PUBLIC_GA_ID  = var.ga_measurement_id
    # Baked into the portal (/i/ rewrite) and clothsyai site (/look/* rewrite).
    API_PUBLIC_URL = local.public_url["api"]
  })
}

# ── Shared looks ─────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "looks" {
  count  = var.create_looks_bucket ? 1 : 0
  bucket = var.looks_bucket_name
}

resource "aws_s3_bucket_public_access_block" "looks" {
  count                   = var.create_looks_bucket ? 1 : 0
  bucket                  = aws_s3_bucket.looks[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "looks" {
  count  = var.create_looks_bucket ? 1 : 0
  bucket = aws_s3_bucket.looks[0].id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

# The app relies on this rule for Playground and API uploads (35 days, like clothsy-looks).
resource "aws_s3_bucket_lifecycle_configuration" "looks" {
  count  = var.create_looks_bucket ? 1 : 0
  bucket = aws_s3_bucket.looks[0].id
  rule {
    id     = "expire-looks"
    status = "Enabled"
    filter { prefix = "looks/" }
    expiration { days = 35 }
  }
}
