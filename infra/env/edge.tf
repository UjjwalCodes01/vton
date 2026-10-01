# CloudFront in front of every app (TLS at the edge, close to shoppers in
# India), and AWS WAF on the API, portal and admin.
#
# Each distribution adds x-clothsy-app (which app) and x-origin-verify (shared
# secret) on the way to the load balancer, which routes on both and accepts
# connections only from CloudFront's address ranges. All viewer headers go to
# the app, Host and CloudFront-Viewer-Address included, so the app sees its
# public hostname and the real client IP.

data "aws_cloudfront_cache_policy" "disabled" { name = "Managed-CachingDisabled" }
data "aws_cloudfront_cache_policy" "optimized" { name = "Managed-CachingOptimized" }
data "aws_cloudfront_origin_request_policy" "all_viewer" { name = "Managed-AllViewerAndCloudFrontHeaders-2022-06" }

locals {
  # Fingerprinted build assets: React Router's client bundle and Next's static chunks.
  static_paths = {
    api     = "/assets/*"
    portal  = "/_next/static/*"
    admin   = "/_next/static/*"
    newsite = "/_next/static/*"
    www     = "/_next/static/*"
  }
  waf_apps = ["api", "portal", "admin"]
}

resource "aws_cloudfront_distribution" "app" {
  for_each        = toset(local.apps)
  enabled         = true
  comment         = "${local.name}-${each.key}"
  is_ipv6_enabled = true
  http_version    = "http2and3"
  price_class     = "PriceClass_All"
  aliases         = lookup(var.domain_aliases, each.key, [])
  web_acl_id      = contains(local.waf_apps, each.key) ? aws_wafv2_web_acl.main.arn : null

  origin {
    origin_id   = "alb"
    domain_name = aws_lb.main.dns_name
    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = local.origin_https ? "https-only" : "http-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 60 # the sync try-on endpoint waits up to 55 s
      origin_keepalive_timeout = 60
    }
    custom_header {
      name  = "x-clothsy-app"
      value = each.key
    }
    custom_header {
      name  = "x-origin-verify"
      value = random_password.origin_verify.result
    }
  }

  default_cache_behavior {
    target_origin_id         = "alb"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
    compress                 = true
  }

  ordered_cache_behavior {
    path_pattern             = local.static_paths[each.key]
    target_origin_id         = "alb"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.optimized.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
    compress                 = true
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.cloudfront_certificate_arn == ""
    acm_certificate_arn            = var.cloudfront_certificate_arn == "" ? null : var.cloudfront_certificate_arn
    ssl_support_method             = var.cloudfront_certificate_arn == "" ? null : "sni-only"
    minimum_protocol_version       = var.cloudfront_certificate_arn == "" ? "TLSv1" : "TLSv1.2_2021"
  }
}

resource "aws_wafv2_web_acl" "main" {
  name  = local.name
  scope = "CLOUDFRONT"
  default_action {
    allow {}
  }

  rule {
    name     = "aws-ip-reputation"
    priority = 1
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesAmazonIpReputationList"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-ip-reputation"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "aws-known-bad-inputs"
    priority = 2
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-known-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # Per-IP rate limit. Shopify's app proxy and webhooks are excluded: every
  # storefront's shoppers arrive from a few Shopify addresses, and the app's own
  # limits are keyed on the signed shop there.
  rule {
    name     = "rate-per-ip"
    priority = 3
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = 3000
        aggregate_key_type = "IP"
        scope_down_statement {
          not_statement {
            statement {
              or_statement {
                statement {
                  byte_match_statement {
                    search_string         = "/proxy/"
                    positional_constraint = "STARTS_WITH"
                    field_to_match {
                      uri_path {}
                    }
                    text_transformation {
                      priority = 0
                      type     = "NONE"
                    }
                  }
                }
                statement {
                  byte_match_statement {
                    search_string         = "/webhooks/"
                    positional_constraint = "STARTS_WITH"
                    field_to_match {
                      uri_path {}
                    }
                    text_transformation {
                      priority = 0
                      type     = "NONE"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-rate-per-ip"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = local.name
    sampled_requests_enabled   = true
  }
}
