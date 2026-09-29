terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws     = { source = "hashicorp/aws", version = "~> 6.0" }
    archive = { source = "hashicorp/archive", version = "~> 2.0" }
  }
}

provider "aws" { region = var.aws_region }
data "aws_caller_identity" "current" {}
data "aws_dynamodb_table" "clients" { name = var.client_table_name }

data "archive_file" "lambda" {
  type        = "zip"
  source_file = "${path.module}/../handler.mjs"
  output_path = "${path.module}/../handler.zip"
}

resource "aws_iam_role" "lambda" {
  name = "clothsy-safety-lambda-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "lambda" {
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.lambda.arn}:*" },
      { Effect = "Allow", Action = ["dynamodb:GetItem"], Resource = data.aws_dynamodb_table.clients.arn },
      { Effect = "Allow", Action = ["rekognition:DetectFaces", "rekognition:DetectLabels", "rekognition:DetectModerationLabels", "rekognition:RecognizeCelebrities"], Resource = "*" },
    ]
  })
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/clothsy-safety"
  retention_in_days = 7
}
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/clothsy-safety"
  retention_in_days = 7
}

resource "aws_lambda_function" "safety" {
  function_name    = "clothsy-safety"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  handler          = "handler.handler"
  runtime          = "nodejs24.x"
  role             = aws_iam_role.lambda.arn
  memory_size      = 512
  timeout          = 25
  environment {
    variables = { CLIENT_TABLE_NAME = data.aws_dynamodb_table.clients.name }
  }
  depends_on = [aws_iam_role_policy.lambda, aws_cloudwatch_log_group.lambda]
}

resource "aws_apigatewayv2_api" "safety" {
  name          = "clothsy-safety"
  protocol_type = "HTTP"
}
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.safety.id
  name        = "$default"
  auto_deploy = true
  default_route_settings {
    throttling_rate_limit  = 5
    throttling_burst_limit = 10
  }
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format          = jsonencode({ requestId = "$context.requestId", route = "$context.routeKey", status = "$context.status", latency = "$context.responseLatency" })
  }
}
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.safety.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.safety.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 29000
}
resource "aws_apigatewayv2_route" "screen" {
  api_id    = aws_apigatewayv2_api.safety.id
  route_key = "POST /v1/screen"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
resource "aws_lambda_permission" "api" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.safety.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.safety.execution_arn}/*/*"
}

output "safety_api_base" { value = aws_apigatewayv2_api.safety.api_endpoint }
