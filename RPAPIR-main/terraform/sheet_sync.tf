# Optional scheduled Google Sheet -> DynamoDB inventory sync. Enabled with sheet_sync_enabled = true.
# The Google service account JSON is written to the secret below out-of-band (see README section 12),
# so it never appears in Terraform variables or state.

locals {
  sheet_sync = var.sheet_sync_enabled ? 1 : 0
}

resource "aws_secretsmanager_secret" "google_sa" {
  count       = local.sheet_sync
  name        = "${var.project_name}/google-sheets-service-account"
  description = "Google service account JSON with read-only access to the key inventory sheet"
  kms_key_id  = aws_kms_key.secrets.arn
}

resource "aws_iam_role" "sheet_sync" {
  count = local.sheet_sync
  name  = "${var.project_name}-sheet-sync-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "sheet_sync" {
  count = local.sheet_sync
  role  = aws_iam_role.sheet_sync[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.sheet_sync[0].arn}:*"
      },
      {
        Sid    = "KeyInventory"
        Effect = "Allow"
        Action = ["dynamodb:Query", "dynamodb:PutItem", "dynamodb:UpdateItem"]
        Resource = [
          aws_dynamodb_table.keys.arn,
          "${aws_dynamodb_table.keys.arn}/index/*"
        ]
      },
      {
        # Existence check only; the sync can never read provider credential values.
        Sid      = "ProviderSecretMetadata"
        Effect   = "Allow"
        Action   = ["secretsmanager:DescribeSecret"]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.secret_prefix}/*"
      },
      {
        Sid      = "GoogleServiceAccountRead"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.google_sa[0].arn
      },
      {
        Sid      = "SecretsKmsDecryptOnlyViaSecretsManager"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = aws_kms_key.secrets.arn
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "sheet_sync" {
  count             = local.sheet_sync
  name              = "/aws/lambda/${var.project_name}-sheet-sync"
  retention_in_days = 30
}

resource "aws_lambda_function" "sheet_sync" {
  count                          = local.sheet_sync
  function_name                  = "${var.project_name}-sheet-sync"
  role                           = aws_iam_role.sheet_sync[0].arn
  handler                        = "sheetSyncHandler.handler"
  runtime                        = "nodejs24.x"
  filename                       = data.archive_file.lambda.output_path
  source_code_hash               = data.archive_file.lambda.output_base64sha256
  timeout                        = 300
  memory_size                    = 256
  reserved_concurrent_executions = 1 # never run two reconciliations at once

  environment {
    variables = {
      DDB_TABLE_NAME      = aws_dynamodb_table.keys.name
      KEY_SECRET_PREFIX   = var.secret_prefix
      SHEET_ID            = var.sheet_id
      SHEET_RANGE         = var.sheet_range
      GOOGLE_SA_SECRET_ID = aws_secretsmanager_secret.google_sa[0].arn
    }
  }

  depends_on = [aws_cloudwatch_log_group.sheet_sync, aws_iam_role_policy.sheet_sync]
}

resource "aws_cloudwatch_event_rule" "sheet_sync" {
  count               = local.sheet_sync
  name                = "${var.project_name}-sheet-sync"
  schedule_expression = var.sheet_sync_schedule
}

resource "aws_cloudwatch_event_target" "sheet_sync" {
  count = local.sheet_sync
  rule  = aws_cloudwatch_event_rule.sheet_sync[0].name
  arn   = aws_lambda_function.sheet_sync[0].arn
}

resource "aws_lambda_permission" "sheet_sync" {
  count         = local.sheet_sync
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sheet_sync[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.sheet_sync[0].arn
}
