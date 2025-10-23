# Email Service Task Definition
resource "aws_ecs_task_definition" "email" {
  family                   = "crm-email-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "email"
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/crm-email:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 3040
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "3040" },
        { name = "MONGODB_URL", value = "mongodb://${aws_docdb_cluster.main.master_username}:${aws_docdb_cluster.main.master_password}@${aws_docdb_cluster.main.endpoint}:27017" },
        { name = "MONGODB_DB", value = "crm_email" },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "SQS_QUEUE_URL", value = aws_sqs_queue.email_queue.url }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "email"
        }
      }
    }
  ])

  tags = {
    Name        = "crm-email-${var.environment}"
    Environment = var.environment
  }
}

# WhatsApp Service Task Definition
resource "aws_ecs_task_definition" "whatsapp" {
  family                   = "crm-whatsapp-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "whatsapp"
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/crm-whatsapp:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 3050
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "WHATSAPP_PORT", value = "3050" },
        { name = "WHATSAPP_USE_MOCK", value = var.environment == "prod" ? "false" : "true" },
        { name = "WHATSAPP_VERIFY_TOKEN", value = "quiz-whatsapp-token" },
        { name = "LEADS_SERVICE_URL", value = "http://crm-leads-${var.environment}.crm.local:3020" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "whatsapp"
        }
      }
    }
  ])

  tags = {
    Name        = "crm-whatsapp-${var.environment}"
    Environment = var.environment
  }
}

# Landing Page Task Definition
resource "aws_ecs_task_definition" "landing" {
  family                   = "crm-landing-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "landing"
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/crm-landing-react:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "landing"
        }
      }
    }
  ])

  tags = {
    Name        = "crm-landing-${var.environment}"
    Environment = var.environment
  }
}

# Backoffice Task Definition
resource "aws_ecs_task_definition" "backoffice" {
  family                   = "crm-backoffice-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "backoffice"
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/crm-backoffice-react:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backoffice"
        }
      }
    }
  ])

  tags = {
    Name        = "crm-backoffice-${var.environment}"
    Environment = var.environment
  }
}

# Migration Task Definition
resource "aws_ecs_task_definition" "migrate" {
  family                   = "crm-migrate-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "migrate"
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/crm-leads:${var.image_tag}"
      
      command = ["npm", "run", "migrate"]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "DATABASE_URL", value = "postgres://${aws_db_instance.postgres.username}:${aws_db_instance.postgres.password}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "migrate"
        }
      }
    }
  ])

  tags = {
    Name        = "crm-migrate-${var.environment}"
    Environment = var.environment
  }
}

# Additional ECS Services
resource "aws_ecs_service" "email" {
  name            = "crm-email-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.email.arn
  desired_count   = var.environment == "prod" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    security_groups = [aws_security_group.external_api_services.id]
    subnets         = aws_subnet.private[*].id
  }

  service_registries {
    registry_arn = aws_service_discovery_service.email.arn
  }

  tags = {
    Name        = "crm-email-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_ecs_service" "whatsapp" {
  name            = "crm-whatsapp-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.whatsapp.arn
  desired_count   = var.environment == "prod" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    security_groups = [aws_security_group.external_api_services.id]
    subnets         = aws_subnet.private[*].id
  }

  service_registries {
    registry_arn = aws_service_discovery_service.whatsapp.arn
  }

  tags = {
    Name        = "crm-whatsapp-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_ecs_service" "landing" {
  name            = "crm-landing-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.landing.arn
  desired_count   = var.environment == "prod" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    security_groups = [aws_security_group.ecs_tasks.id]
    subnets         = aws_subnet.private[*].id
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.landing.arn
    container_name   = "landing"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.main]

  tags = {
    Name        = "crm-landing-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_ecs_service" "backoffice" {
  name            = "crm-backoffice-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backoffice.arn
  desired_count   = var.environment == "prod" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    security_groups = [aws_security_group.ecs_tasks.id]
    subnets         = aws_subnet.private[*].id
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backoffice.arn
    container_name   = "backoffice"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.main]

  tags = {
    Name        = "crm-backoffice-${var.environment}"
    Environment = var.environment
  }
}