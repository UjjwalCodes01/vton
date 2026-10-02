# AWS WAF in front of every app: the environment's Express Mode services share
# one load balancer, which ECS creates with the first service and tags with the
# services' tags. The lookup is read at plan time and may come back empty (a new
# environment's first apply, before ECS has made the load balancer); the next
# apply attaches the WAF then.

data "aws_lbs" "express" {
  tags = {
    AmazonECSManaged = "true"
    project          = "clothsy"
    env              = var.env
  }
}

resource "aws_wafv2_web_acl" "main" {
  name  = local.name
  scope = "REGIONAL"
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

  # Per-IP rate limit (requests per 5 minutes). Shopify's app proxy and webhooks
  # are excluded: every storefront's shoppers arrive from a few Shopify
  # addresses, and the app's own limits are keyed on the signed shop there.
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

resource "aws_wafv2_web_acl_association" "express" {
  for_each     = data.aws_lbs.express.arns
  resource_arn = each.value
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
