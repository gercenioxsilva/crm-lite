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
      name    = "migrate"
      image   = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/crm-leads:${var.image_tag}"
      command = ["npm", "run", "migrate"]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "DATABASE_URL", value = "postgres://${aws_db_instance.postgres.username}:${aws_db_instance.postgres.password}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}" },
        { name = "DB_CONNECT_TIMEOUT_MS", value = "10000" },
        { name = "DB_CONNECT_MAX_RETRIES", value = "120" },
        { name = "DB_CONNECT_RETRY_DELAY_MS", value = "5000" },
        # Set to "true" only when you need a clean-slate migration (drops all tables).
        # Change back to "false" after the first successful deployment that uses this reset.
        { name = "RESET_SCHEMA", value = var.reset_schema }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "migrate"
          "awslogs-create-group"  = "true"
        }
      }
    }
  ])

  tags = {
    Name        = "crm-migrate-${var.environment}"
    Environment = var.environment
  }
}
