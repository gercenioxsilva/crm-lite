locals {
  static_sites = {
    landing = {
      bucket_suffix = "landing"
      comment       = "CRM Landing ${var.environment}"
    }
    backoffice = {
      bucket_suffix = "backoffice"
      comment       = "CRM Backoffice ${var.environment}"
    }
  }
}

resource "aws_s3_bucket" "static_site" {
  for_each = local.static_sites

  bucket = "crm-lite-${each.value.bucket_suffix}-${var.environment}-${data.aws_caller_identity.current.account_id}-${var.aws_region}"

  tags = {
    Name        = "crm-lite-${each.value.bucket_suffix}-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "static_site" {
  for_each = aws_s3_bucket.static_site

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "static_site" {
  for_each = aws_s3_bucket.static_site

  bucket = each.value.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static_site" {
  for_each = aws_s3_bucket.static_site

  bucket = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_cloudfront_origin_access_control" "static_site" {
  for_each = local.static_sites

  name                              = "crm-${each.key}-oac-${var.environment}"
  description                       = "OAC for CRM ${each.key} static site"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_iam_policy_document" "static_site" {
  for_each = aws_s3_bucket.static_site

  statement {
    sid     = "AllowCloudFrontReadOnly"
    effect  = "Allow"
    actions = ["s3:GetObject"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    resources = ["${each.value.arn}/*"]

    condition {
      test     = "StringLike"
      variable = "AWS:SourceArn"
      values   = ["arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/*"]
    }
  }
}

resource "aws_s3_bucket_policy" "static_site" {
  for_each = aws_s3_bucket.static_site

  bucket = each.value.id
  policy = data.aws_iam_policy_document.static_site[each.key].json

  depends_on = [aws_s3_bucket_public_access_block.static_site]
}

resource "aws_cloudfront_distribution" "static_site" {
  for_each = local.static_sites

  enabled             = true
  is_ipv6_enabled     = true
  comment             = each.value.comment
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  aliases = each.key == "backoffice" ? [var.domain_name, var.www_domain_name] : []

  origin {
    origin_id                = "s3-${each.key}"
    domain_name              = aws_s3_bucket.static_site[each.key].bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.static_site[each.key].id
  }

  origin {
    origin_id   = "api-alb"
    domain_name = aws_lb.main.dns_name

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3-${each.key}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "api-alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Origin", "Accept"]

      cookies {
        forward = "all"
      }
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/health"
    target_origin_id       = "api-alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  depends_on = [aws_s3_bucket_policy.static_site, aws_acm_certificate_validation.main]

  tags = {
    Name        = "crm-${each.key}-${var.environment}"
    Environment = var.environment
  }
}
