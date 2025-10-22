# SQS Queue for Email Processing
resource "aws_sqs_queue" "email_queue" {
  name                      = "crm-email-queue-${var.environment}"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600
  receive_wait_time_seconds = 10

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "crm-email-queue-${var.environment}"
    Environment = var.environment
  }
}

# Dead Letter Queue
resource "aws_sqs_queue" "email_dlq" {
  name                      = "crm-email-dlq-${var.environment}"
  message_retention_seconds = 1209600

  tags = {
    Name        = "crm-email-dlq-${var.environment}"
    Environment = var.environment
  }
}

# SES Configuration Set
resource "aws_ses_configuration_set" "main" {
  name = "crm-${var.environment}"

  delivery_options {
    tls_policy = "Require"
  }

  reputation_metrics_enabled = true
}

# SES Event Destination
resource "aws_ses_event_destination" "cloudwatch" {
  name                   = "crm-cloudwatch-${var.environment}"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true
  matching_types         = ["send", "reject", "bounce", "complaint", "delivery"]

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "MessageTag"
    value_source   = "messageTag"
  }
}

# CloudWatch Log Group for Email Service
resource "aws_cloudwatch_log_group" "email" {
  name              = "/aws/lambda/crm-email-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name        = "crm-email-logs-${var.environment}"
    Environment = var.environment
  }
}