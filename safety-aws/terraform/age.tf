# Second age estimator for policy G1 (safety-guardrails.md, section 5): MiVOLO v2
# on Lambda, served as POST /v1/age on the existing clothsy-safety API with the
# same client credential. Additive: nothing above changes.
#
# Two steps, because the Lambda needs an image that the repository must hold first:
#   1. terraform apply                       (creates the ECR repository, role, log group)
#   2. ../age/build_and_push.sh              (prints the image URI)
#      terraform apply -var age_image_uri=<that URI>

variable "age_image_uri" {
  type        = string
  default     = ""
  description = "clothsy-age image as <repo>@sha256:<digest>, from ../age/build_and_push.sh. Empty: no age Lambda or route."
}

locals {
  age_enabled  = var.age_image_uri != ""
  age_function = "clothsy-age"
}

resource "aws_ecr_repository" "age" {
  name                 = local.age_function
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}

resource "aws_ecr_lifecycle_policy" "age" {
  repository = aws_ecr_repository.age.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the five newest images"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 5 }
      action       = { type = "expire" }
    }]
  })
}

# Lambda pulls the image with its service principal, limited to this function.
resource "aws_ecr_repository_policy" "age" {
  repository = aws_ecr_repository.age.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "LambdaPull"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]
      Condition = {
        StringLike = { "aws:sourceArn" = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.age_function}" }
      }
    }]
  })
}

resource "aws_iam_role" "age" {
  name = "clothsy-age-lambda-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "age" {
  role = aws_iam_role.age.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.age.arn}:*" },
      { Effect = "Allow", Action = ["dynamodb:GetItem"], Resource = data.aws_dynamodb_table.clients.arn },
    ]
  })
}

resource "aws_cloudwatch_log_group" "age" {
  name              = "/aws/lambda/${local.age_function}"
  retention_in_days = 7
}

resource "aws_lambda_function" "age" {
  count         = local.age_enabled ? 1 : 0
  function_name = local.age_function
  package_type  = "Image"
  image_uri     = var.age_image_uri
  architectures = ["x86_64"]
  role          = aws_iam_role.age.arn
  # CPU scales with memory. 3008 MB (about 1.7 vCPUs) is this account's Lambda
  # maximum until AWS raises the quota; one estimate takes about a second.
  memory_size = 3008
  # A cold container loads the model on its first request; API Gateway allows 29 s.
  timeout = 28
  environment {
    variables = { CLIENT_TABLE_NAME = data.aws_dynamodb_table.clients.name }
  }
  depends_on = [aws_iam_role_policy.age, aws_cloudwatch_log_group.age, aws_ecr_repository_policy.age]
}

resource "aws_apigatewayv2_integration" "age" {
  count                  = local.age_enabled ? 1 : 0
  api_id                 = aws_apigatewayv2_api.safety.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.age[0].invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 29000
}

resource "aws_apigatewayv2_route" "age" {
  count     = local.age_enabled ? 1 : 0
  api_id    = aws_apigatewayv2_api.safety.id
  route_key = "POST /v1/age"
  target    = "integrations/${aws_apigatewayv2_integration.age[0].id}"
}

resource "aws_lambda_permission" "age_api" {
  count         = local.age_enabled ? 1 : 0
  statement_id  = "AllowApiGatewayInvokeAge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.age[0].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.safety.execution_arn}/*/POST/v1/age"
}

# Keeps one container warm. A cold start fetches the 1.4 GB image's layers on
# first read (measured: over 20 s for the first start after a deploy), and
# provisioned concurrency is not possible while the account's Lambda limit is
# 10 (AWS keeps at least 10 unreserved). The event is {"warmup": true}, which
# only a direct invoke can send, not the public API.
resource "aws_cloudwatch_event_rule" "age_warmup" {
  count               = local.age_enabled ? 1 : 0
  name                = "clothsy-age-warmup"
  description         = "Keep one clothsy-age container warm"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "age_warmup" {
  count = local.age_enabled ? 1 : 0
  rule  = aws_cloudwatch_event_rule.age_warmup[0].name
  arn   = aws_lambda_function.age[0].arn
  input = jsonencode({ warmup = true })
}

resource "aws_lambda_permission" "age_warmup" {
  count         = local.age_enabled ? 1 : 0
  statement_id  = "AllowEventBridgeWarmup"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.age[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.age_warmup[0].arn
}

output "age_repository_url" { value = aws_ecr_repository.age.repository_url }
