# Domain variables
variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "orquestraerp.com.br"
}

variable "www_domain_name" {
  description = "WWW subdomain name"
  type        = string
  default     = "www.orquestraerp.com.br"
}

# Route53 Hosted Zone
data "aws_route53_zone" "main" {
  name = var.domain_name
}

# ACM Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "main" {
  provider          = aws
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    var.www_domain_name
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "crm-certificate-${var.environment}"
    Environment = var.environment
  }
}

# DNS validation records for ACM
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for certificate validation
resource "aws_acm_certificate_validation" "main" {
  certificate_arn           = aws_acm_certificate.main.arn
  timeouts {
    create = "5m"
  }
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route53 Alias record for backoffice domain
resource "aws_route53_record" "backoffice" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.static_site["backoffice"].domain_name
    zone_id                = aws_cloudfront_distribution.static_site["backoffice"].hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 Alias record for www subdomain
resource "aws_route53_record" "backoffice_www" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.www_domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.static_site["backoffice"].domain_name
    zone_id                = aws_cloudfront_distribution.static_site["backoffice"].hosted_zone_id
    evaluate_target_health = false
  }
}

# Outputs
output "certificate_arn" {
  description = "ACM certificate ARN"
  value       = aws_acm_certificate.main.arn
}

output "hosted_zone_id" {
  description = "Route53 hosted zone ID"
  value       = data.aws_route53_zone.main.zone_id
}

output "domain_name" {
  description = "Primary domain name"
  value       = var.domain_name
}

output "www_domain_name" {
  description = "WWW domain name"
  value       = var.www_domain_name
}
