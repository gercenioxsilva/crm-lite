# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "crm-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "crm-cluster-${var.environment}"
    Environment = var.environment
  }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "crm-ecs-task-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role with separate policy resource
resource "aws_iam_role" "ecs_task_role" {
  name = "crm-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "ses-sqs-access"
  role = aws_iam_role.ecs_task_role.id

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

# Security Groups
resource "aws_security_group" "ecs_tasks" {
  name        = "crm-ecs-tasks-${var.environment}"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "crm-ecs-tasks-${var.environment}"
    Environment = var.environment
  }
}

# ECR Repositories (created by GitHub Actions workflow)
# Using data sources to reference existing repositories
data "aws_ecr_repository" "services" {
  for_each = toset([
    "crm-api-gateway",
    "crm-auth",
    "crm-leads",
    "crm-email",
    "crm-whatsapp",
    "crm-landing-react",
    "crm-backoffice-react"
  ])

  name = each.key
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/crm-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name        = "crm-ecs-logs-${var.environment}"
    Environment = var.environment
  }
}

# Task Definitions
resource "aws_ecs_task_definition" "api_gateway" {
  family                   = "crm-api-gateway-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "api-gateway"
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/crm-api-gateway:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3000" },
        { name = "AUTH_SERVICE_URL", value = "http://crm-auth-${var.environment}.crm.local:3050" },
        { name = "LEADS_SERVICE_URL", value = "http://crm-leads-${var.environment}.crm.local:3020" },
        { name = "EMAIL_SERVICE_URL", value = "http://crm-email-${var.environment}.crm.local:3040" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api-gateway"
        }
      }
    }
  ])

  tags = {
    Name        = "crm-api-gateway-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_ecs_task_definition" "auth" {
  family                   = "crm-auth-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "auth"
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/crm-auth:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 3050
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3050" },
        { name = "AUTH_JWT_SECRET", value = "your-super-secret-jwt-key-here" },
        { name = "AUTH_CLIENTS", value = "frontend:front-secret:leads:read,leads:write,reports:read;gateway:gateway-secret:leads:read,leads:write,api:read" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "auth"
        }
      }
    }
  ])

  tags = {
    Name        = "crm-auth-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_ecs_task_definition" "leads" {
  family                   = "crm-leads-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "leads"
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/crm-leads:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 3020
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3020" },
        { name = "DATABASE_URL", value = "postgres://${aws_db_instance.postgres.username}:${aws_db_instance.postgres.password}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "leads"
        }
      }
    }
  ])

  tags = {
    Name        = "crm-leads-${var.environment}"
    Environment = var.environment
  }
}

# ECS Services
resource "aws_ecs_service" "api_gateway" {
  name            = "crm-api-gateway-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api_gateway.arn
  desired_count   = var.environment == "prod" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    security_groups = [aws_security_group.ecs_tasks.id]
    subnets         = aws_subnet.private[*].id
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api_gateway.arn
    container_name   = "api-gateway"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.main]

  tags = {
    Name        = "crm-api-gateway-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_ecs_service" "auth" {
  name            = "crm-auth-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.auth.arn
  desired_count   = var.environment == "prod" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    security_groups = [aws_security_group.ecs_tasks.id]
    subnets         = aws_subnet.private[*].id
  }

  service_registries {
    registry_arn = aws_service_discovery_service.auth.arn
  }

  tags = {
    Name        = "crm-auth-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_ecs_service" "leads" {
  name            = "crm-leads-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.leads.arn
  desired_count   = var.environment == "prod" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    security_groups = [aws_security_group.ecs_tasks.id]
    subnets         = aws_subnet.private[*].id
  }

  service_registries {
    registry_arn = aws_service_discovery_service.leads.arn
  }

  tags = {
    Name        = "crm-leads-${var.environment}"
    Environment = var.environment
  }
}