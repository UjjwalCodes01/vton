# clothsy-guard: every safety observation for one image in one call (guardrail
# plan, Phase 1). Routes POST /v1/guard/{person,garment,output} on the existing
# clothsy-safety API, same client credential. Additive: /v1/screen and /v1/age
# keep working until the backend has switched and they are retired.
#
# Two steps, like age.tf:
#   1. terraform apply                                   (ECR repository, role, log group)
#   2. ../guard/build_and_push.sh                        (prints the image URI)
#      terraform apply -var guard_image_uri=<that URI>   (Lambda, alias, routes, warm-up)
# After AWS raises the account's Lambda concurrency limit above 10:
#      -var guard_provisioned_concurrency=2              (no cold starts on the alias)

variable "guard_image_uri" {
  type        = string
  default     = ""
  description = "clothsy-guard image as <repo>@sha256:<digest>, from ../guard/build_and_push.sh. Empty: no guard Lambda or routes."
}

variable "guard_provisioned_concurrency" {
  type        = number
  default     = 0
  description = "Pre-initialised guard environments on the live alias. Needs an account Lambda concurrency limit above 10."
}

variable "guard_deadline_seconds" {
  type        = number
  default     = 4
  description = "Budget for one image's checks inside the guard; past it the guard answers 503 and the backend fails closed."
}

locals {
  guard_enabled  = var.guard_image_uri != ""
  guard_function = "clothsy-guard"
  guard_routes   = ["person", "garment", "output"]
}

resource "aws_ecr_repository" "guard" {
  name                 = local.guard_function
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}

resource "aws_ecr_lifecycle_policy" "guard" {
  repository = aws_ecr_repository.guard.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the five newest images"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 5 }
      action       = { type = "expire" }
    }]
  })
}

resource "aws_ecr_repository_policy" "guard" {
  repository = aws_ecr_repository.guard.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "LambdaPull"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]
      Condition = {
        StringLike = { "aws:sourceArn" = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.guard_function}*" }
      }
    }]
  })
}

resource "aws_iam_role" "guard" {
  name = "clothsy-guard-lambda-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "guard" {
  role = aws_iam_role.guard.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.guard.arn}:*" },
      { Effect = "Allow", Action = ["dynamodb:GetItem"], Resource = data.aws_dynamodb_table.clients.arn },
      { Effect = "Allow", Action = ["rekognition:DetectFaces", "rekognition:DetectLabels", "rekognition:DetectModerationLabels", "rekognition:RecognizeCelebrities"], Resource = "*" },
    ]
  })
}

resource "aws_cloudwatch_log_group" "guard" {
  name              = "/aws/lambda/${local.guard_function}"
  retention_in_days = 7
}

resource "aws_lambda_function" "guard" {
  count         = local.guard_enabled ? 1 : 0
  function_name = local.guard_function
  package_type  = "Image"
  image_uri     = var.guard_image_uri
  architectures = ["x86_64"]
  role          = aws_iam_role.guard.arn
  # 3008 MB (about 1.7 vCPUs) is this account's Lambda maximum for now.
  memory_size = 3008
  # A cold container loads MiVOLO on its first request, and the output route
  # downloads the result first; API Gateway allows 29 s.
  timeout = 28
  publish = true
  environment {
    variables = {
      CLIENT_TABLE_NAME = data.aws_dynamodb_table.clients.name
      GUARD_DEADLINE_S  = tostring(var.guard_deadline_seconds)
    }
  }
  depends_on = [aws_iam_role_policy.guard, aws_cloudwatch_log_group.guard, aws_ecr_repository_policy.guard]
}

resource "aws_lambda_alias" "guard_live" {
  count            = local.guard_enabled ? 1 : 0
  name             = "live"
  function_name    = aws_lambda_function.guard[0].function_name
  function_version = aws_lambda_function.guard[0].version
}

resource "aws_lambda_provisioned_concurrency_config" "guard" {
  count                             = local.guard_enabled && var.guard_provisioned_concurrency > 0 ? 1 : 0
  function_name                     = aws_lambda_function.guard[0].function_name
  qualifier                         = aws_lambda_alias.guard_live[0].name
  provisioned_concurrent_executions = var.guard_provisioned_concurrency
}

resource "aws_apigatewayv2_integration" "guard" {
  count                  = local.guard_enabled ? 1 : 0
  api_id                 = aws_apigatewayv2_api.safety.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_alias.guard_live[0].invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 29000
}

resource "aws_apigatewayv2_route" "guard" {
  for_each  = local.guard_enabled ? toset(local.guard_routes) : toset([])
  api_id    = aws_apigatewayv2_api.safety.id
  route_key = "POST /v1/guard/${each.key}"
  target    = "integrations/${aws_apigatewayv2_integration.guard[0].id}"
}

resource "aws_lambda_permission" "guard_api" {
  count         = local.guard_enabled ? 1 : 0
  statement_id  = "AllowApiGatewayInvokeGuard"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.guard[0].function_name
  qualifier     = aws_lambda_alias.guard_live[0].name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.safety.execution_arn}/*/POST/v1/guard/*"
}

# Until provisioned concurrency is possible, keep one environment warm. The event
# is {"warmup": true}, which only a direct invoke can send, not the public API.
resource "aws_cloudwatch_event_rule" "guard_warmup" {
  count               = local.guard_enabled ? 1 : 0
  name                = "clothsy-guard-warmup"
  description         = "Keep one clothsy-guard environment warm"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "guard_warmup" {
  count = local.guard_enabled ? 1 : 0
  rule  = aws_cloudwatch_event_rule.guard_warmup[0].name
  arn   = aws_lambda_alias.guard_live[0].arn
  input = jsonencode({ warmup = true })
}

resource "aws_lambda_permission" "guard_warmup" {
  count         = local.guard_enabled ? 1 : 0
  statement_id  = "AllowEventBridgeWarmupGuard"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.guard[0].function_name
  qualifier     = aws_lambda_alias.guard_live[0].name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.guard_warmup[0].arn
}

output "guard_repository_url" { value = aws_ecr_repository.guard.repository_url }
