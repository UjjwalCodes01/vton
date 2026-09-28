output "api_url" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

output "custom_api_url" {
  value = var.custom_domain_name != "" ? "https://${var.custom_domain_name}" : ""
}

output "lambda_function_name" {
  value = aws_lambda_function.api.function_name
}

output "key_table_name" {
  value = aws_dynamodb_table.keys.name
}

output "client_table_name" {
  value = aws_dynamodb_table.clients.name
}

output "secrets_kms_key_arn" {
  value = aws_kms_key.secrets.arn
}

output "mtls_bucket_name" {
  value = length(aws_s3_bucket.mtls) > 0 ? aws_s3_bucket.mtls[0].bucket : ""
}

output "custom_domain_target" {
  value = var.custom_domain_name != "" ? aws_apigatewayv2_domain_name.custom[0].domain_name_configuration[0].target_domain_name : ""
}

output "sheet_sync_function_name" {
  value = var.sheet_sync_enabled ? aws_lambda_function.sheet_sync[0].function_name : ""
}

output "google_sa_secret_arn" {
  value = var.sheet_sync_enabled ? aws_secretsmanager_secret.google_sa[0].arn : ""
}
