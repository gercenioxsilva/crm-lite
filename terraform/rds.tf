# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "crm-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name        = "crm-db-subnet-group-${var.environment}"
    Environment = var.environment
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "crm-rds-${var.environment}"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = {
    Name        = "crm-rds-${var.environment}"
    Environment = var.environment
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier = "crm-postgres-${var.environment}"

  engine         = "postgres"
  engine_version = "16.4"
  instance_class = var.environment == "prod" ? "db.t3.small" : "db.t3.micro"

  allocated_storage     = var.environment == "prod" ? 100 : 20
  max_allocated_storage = var.environment == "prod" ? 1000 : 100
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = "quiz"
  username = "quiz"
  password = "quiz123456"

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = var.environment == "prod" ? 7 : 1
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = var.environment != "prod"
  deletion_protection = var.environment == "prod"

  tags = {
    Name        = "crm-postgres-${var.environment}"
    Environment = var.environment
  }
}

# DocumentDB Subnet Group
resource "aws_docdb_subnet_group" "main" {
  name       = "crm-docdb-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name        = "crm-docdb-subnet-group-${var.environment}"
    Environment = var.environment
  }
}

# DocumentDB Security Group
resource "aws_security_group" "docdb" {
  name        = "crm-docdb-${var.environment}"
  description = "Security group for DocumentDB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = {
    Name        = "crm-docdb-${var.environment}"
    Environment = var.environment
  }
}

# DocumentDB Cluster
resource "aws_docdb_cluster" "main" {
  cluster_identifier      = "crm-docdb-${var.environment}"
  engine                  = "docdb"
  master_username         = "crmadmin"
  master_password         = "crm123456"
  backup_retention_period = var.environment == "prod" ? 7 : 1
  preferred_backup_window = "03:00-04:00"
  skip_final_snapshot     = var.environment != "prod"
  db_subnet_group_name    = aws_docdb_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.docdb.id]

  tags = {
    Name        = "crm-docdb-${var.environment}"
    Environment = var.environment
  }
}

# DocumentDB Instance
resource "aws_docdb_cluster_instance" "main" {
  count              = var.environment == "prod" ? 2 : 1
  identifier         = "crm-docdb-${var.environment}-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.environment == "prod" ? "db.t3.medium" : "db.t3.medium"

  tags = {
    Name        = "crm-docdb-${var.environment}-${count.index}"
    Environment = var.environment
  }
}