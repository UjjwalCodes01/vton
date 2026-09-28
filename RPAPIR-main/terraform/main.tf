data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

resource "aws_kms_key" "secrets" {
  description             = "KMS key for ${var.project_name} provider secrets"
  enable_key_rotation     = true
  deletion_window_in_days = 30

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnableAccountAdministration"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.project_name}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

resource "aws_dynamodb_table" "keys" {
  name         = "${var.project_name}-keys"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "keyId"

  attribute {
    name = "keyId"
    type = "S"
  }

  attribute {
    name = "provider"
    type = "S"
  }

  attribute {
    name = "eligibleAt"
    type = "N"
  }

  global_secondary_index {
    name            = "provider-eligible-index"
    hash_key        = "provider"
    range_key       = "eligibleAt"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "clients" {
  name         = "${var.project_name}-clients"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "clientId"

  attribute {
    name = "clientId"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda" {
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "*"
      },
      {
        Sid    = "DynamoDb"
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:UpdateItem"]
        Resource = [
          aws_dynamodb_table.keys.arn,
          "${aws_dynamodb_table.keys.arn}/index/*",
          aws_dynamodb_table.clients.arn
        ]
      },
      {
        Sid      = "SecretsManagerRead"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.secret_prefix}/*"
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

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "api_access" {
  name              = "/aws/apigateway/${var.project_name}"
  retention_in_days = 30
}

# `npm run build` writes the bundled handlers to build/lambda; Terraform zips them at plan time,
# so the first apply has code to deploy and later applies redeploy when the bundle changes.
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../build/lambda"
  output_path = "${path.module}/../lambda.zip"
}

resource "aws_lambda_function" "api" {
  function_name                  = var.project_name
  role                           = aws_iam_role.lambda.arn
  handler                        = "handler.handler"
  runtime                        = "nodejs24.x"
  filename                       = data.archive_file.lambda.output_path
  source_code_hash               = data.archive_file.lambda.output_base64sha256
  timeout                        = 30
  memory_size                    = 512
  reserved_concurrent_executions = var.lambda_reserved_concurrency

  environment {
    variables = {
      DDB_TABLE_NAME               = aws_dynamodb_table.keys.name
      CLIENT_TABLE_NAME            = aws_dynamodb_table.clients.name
      KEY_SECRET_PREFIX            = var.secret_prefix
      UPSTREAM_BASE_URL            = var.upstream_base_url
      UPSTREAM_PATH                = var.upstream_path
      PROVIDER_NAME                = var.provider_name
      UPSTREAM_TIMEOUT_MS          = "12000"
      MAX_UPSTREAM_ATTEMPTS        = "4"
      MAX_REQUEST_BODY_BYTES       = "262144"
      MAX_UPSTREAM_RESPONSE_BYTES  = "1048576"
      KEY_CANDIDATE_LIMIT          = "50"
      LEASE_SECONDS                = "30"
      TEMP_DISABLE_SECONDS         = "60"
      PERMANENT_DISABLE_AFTER_AUTH = "true"
      REQUIRE_CLIENT_TOKEN         = "true"
      SECRETS_KMS_KEY_ARN          = aws_kms_key.secrets.arn
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda, aws_iam_role_policy.lambda]
}

resource "aws_apigatewayv2_api" "http" {
  name                         = var.project_name
  protocol_type                = "HTTP"
  disable_execute_api_endpoint = var.disable_execute_api_endpoint
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = var.api_rate_limit_rps
    throttling_burst_limit = var.api_burst_limit
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_access.arn
    format = jsonencode({
      requestId = "$context.requestId"
      route     = "$context.routeKey"
      status    = "$context.status"
      latency   = "$context.responseLatency"
      sourceIp  = "$context.identity.sourceIp"
    })
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 29000
}

resource "aws_apigatewayv2_route" "request" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /v1/request"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "request_result" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /v1/request/{taskId}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "file" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /v1/file"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_lambda_permission" "api" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_apigatewayv2_domain_name" "custom" {
  count       = var.custom_domain_name != "" ? 1 : 0
  domain_name = var.custom_domain_name

  domain_name_configuration {
    certificate_arn = var.acm_certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  dynamic "mutual_tls_authentication" {
    for_each = var.mtls_truststore_uri != "" ? [1] : []
    content {
      truststore_uri     = var.mtls_truststore_uri
      truststore_version = var.mtls_truststore_version != "" ? var.mtls_truststore_version : null
    }
  }
}

resource "aws_apigatewayv2_api_mapping" "custom" {
  count       = var.custom_domain_name != "" ? 1 : 0
  api_id      = aws_apigatewayv2_api.http.id
  domain_name = aws_apigatewayv2_domain_name.custom[0].id
  stage       = aws_apigatewayv2_stage.default.id
}

resource "aws_route53_record" "custom" {
  count   = var.custom_domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.custom_domain_name
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.custom[0].domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.custom[0].domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_s3_bucket" "mtls" {
  # Keep the bucket after the truststore URI is configured on the second apply.
  count  = var.custom_domain_name != "" ? 1 : 0
  bucket = "${var.project_name}-mtls-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "mtls" {
  count                   = length(aws_s3_bucket.mtls) > 0 ? 1 : 0
  bucket                  = aws_s3_bucket.mtls[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "mtls" {
  count  = length(aws_s3_bucket.mtls) > 0 ? 1 : 0
  bucket = aws_s3_bucket.mtls[0].id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "mtls" {
  count  = length(aws_s3_bucket.mtls) > 0 ? 1 : 0
  bucket = aws_s3_bucket.mtls[0].id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
