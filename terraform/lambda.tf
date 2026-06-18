locals {
  lambda_package_dir = "${path.module}/../.aws/lambda"
  auth_clients = [
    {
      client_id     = "backoffice"
      client_secret = "backoffice-secret"
      scopes        = ["leads:read", "leads:write", "reports:read", "api:read", "admin:access"]
    },
    {
      client_id     = "gateway"
      client_secret = "gateway-secret"
      scopes        = ["leads:read", "leads:write", "api:read"]
    }
  ]
}

resource "aws_iam_role" "lambda_execution_role" {
  name = "crmLambdaExecutionRole-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "crm-lambda-execution-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "lambda_app_policy" {
  name = "crmLambdaAppPolicy-${var.environment}"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "auth_lambda" {
  name              = "/aws/lambda/crm-auth-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name        = "crm-auth-logs-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "whatsapp_lambda" {
  name              = "/aws/lambda/crm-whatsapp-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name        = "crm-whatsapp-logs-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "auth" {
  function_name = "crm-auth-${var.environment}"
  role          = aws_iam_role.lambda_execution_role.arn
  runtime       = "nodejs20.x"
  handler       = "dist/lambda.handler"
  filename      = "${local.lambda_package_dir}/auth.zip"
  timeout       = 15
  memory_size   = 256
  publish       = true

  source_code_hash = try(filebase64sha256("${local.lambda_package_dir}/auth.zip"), null)

  environment {
    variables = {
      NODE_ENV           = var.environment
      AUTH_JWT_SECRET    = var.auth_jwt_secret
      AUTH_CLIENTS       = jsonencode(local.auth_clients)
      INTERNAL_API_TOKEN = var.internal_api_token
      DEFAULT_TENANT_ID  = "00000000-0000-0000-0000-000000000001"
      DATABASE_URL       = "postgres://${aws_db_instance.postgres.username}:${aws_db_instance.postgres.password}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}"
    }
  }

  vpc_config {
    security_group_ids = [aws_security_group.internal_services.id]
    subnet_ids         = aws_subnet.private[*].id
  }

  depends_on = [
    aws_cloudwatch_log_group.auth_lambda,
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_vpc_execution
  ]

  tags = {
    Name        = "crm-auth-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_lambda_function_url" "auth" {
  function_name      = aws_lambda_function.auth.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = false
    allow_headers     = ["authorization", "content-type"]
    allow_methods     = ["*"]
    allow_origins     = ["*"]
    max_age           = 300
  }
}

resource "aws_lambda_function" "email" {
  function_name = "crm-email-${var.environment}"
  role          = aws_iam_role.lambda_execution_role.arn
  runtime       = "nodejs20.x"
  handler       = "dist/lambda.handler"
  filename      = "${local.lambda_package_dir}/email.zip"
  timeout       = 60
  memory_size   = 512
  publish       = true

  source_code_hash = try(filebase64sha256("${local.lambda_package_dir}/email.zip"), null)

  environment {
    variables = {
      NODE_ENV           = var.environment
      MONGODB_URL        = "mongodb://${aws_docdb_cluster.main.master_username}:${aws_docdb_cluster.main.master_password}@${aws_docdb_cluster.main.endpoint}:27017"
      MONGODB_DB         = "crm_email"
      SQS_QUEUE_URL      = aws_sqs_queue.email_queue.url
      INTERNAL_API_TOKEN = var.internal_api_token
    }
  }

  vpc_config {
    security_group_ids = [aws_security_group.external_api_services.id]
    subnet_ids         = aws_subnet.private[*].id
  }

  depends_on = [
    aws_cloudwatch_log_group.email,
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_vpc_execution,
    aws_iam_role_policy.lambda_app_policy,
    aws_lambda_function.auth
  ]

  tags = {
    Name        = "crm-email-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_lambda_function_url" "email" {
  function_name      = aws_lambda_function.email.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = false
    allow_headers     = ["authorization", "content-type"]
    allow_methods     = ["*"]
    allow_origins     = ["*"]
    max_age           = 300
  }
}

resource "aws_lambda_event_source_mapping" "email_queue" {
  event_source_arn        = aws_sqs_queue.email_queue.arn
  function_name           = aws_lambda_function.email.arn
  batch_size              = 1
  function_response_types = ["ReportBatchItemFailures"]
}

resource "aws_lambda_function" "whatsapp" {
  function_name = "crm-whatsapp-${var.environment}"
  role          = aws_iam_role.lambda_execution_role.arn
  runtime       = "nodejs20.x"
  handler       = "dist/lambda.handler"
  filename      = "${local.lambda_package_dir}/whatsapp.zip"
  timeout       = 30
  memory_size   = 512
  publish       = true

  source_code_hash = try(filebase64sha256("${local.lambda_package_dir}/whatsapp.zip"), null)

  environment {
    variables = {
      NODE_ENV                 = var.environment
      WHATSAPP_USE_MOCK        = "false"
      WHATSAPP_VERIFY_TOKEN    = var.whatsapp_verify_token
      WHATSAPP_ACCESS_TOKEN    = var.whatsapp_access_token
      WHATSAPP_PHONE_NUMBER_ID = var.whatsapp_phone_number_id
      LEADS_SERVICE_URL        = "http://crm-leads-${var.environment}.crm.local:3020"
      INTERNAL_API_TOKEN       = var.internal_api_token
    }
  }

  vpc_config {
    security_group_ids = [aws_security_group.external_api_services.id]
    subnet_ids         = aws_subnet.private[*].id
  }

  depends_on = [
    aws_cloudwatch_log_group.whatsapp_lambda,
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_vpc_execution,
    aws_iam_role_policy.lambda_app_policy,
    aws_lambda_function.email
  ]

  tags = {
    Name        = "crm-whatsapp-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_lambda_function_url" "whatsapp" {
  function_name      = aws_lambda_function.whatsapp.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = false
    allow_headers     = ["authorization", "content-type"]
    allow_methods     = ["*"]
    allow_origins     = ["*"]
    max_age           = 300
  }
}
