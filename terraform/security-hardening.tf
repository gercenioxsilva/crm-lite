# Security Groups Restritivos por Serviço

# Security Group para serviços internos (Auth, Leads)
resource "aws_security_group" "internal_services" {
  name        = "crm-internal-services-${var.environment}"
  description = "Security group for internal services (no internet access)"
  vpc_id      = aws_vpc.main.id

  # Permite comunicação interna apenas
  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  # Permite comunicação do API Gateway
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
    description     = "Allow API Gateway communication"
  }

  # Egress restrito - apenas VPC e AWS services
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS for AWS services only"
  }

  egress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "Internal VPC communication"
  }

  tags = {
    Name        = "crm-internal-services-${var.environment}"
    Environment = var.environment
  }
}

# Security Group para serviços que precisam de APIs externas específicas
resource "aws_security_group" "external_api_services" {
  name        = "crm-external-api-services-${var.environment}"
  description = "Security group for services needing specific external APIs"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  # Permite comunicação do API Gateway
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
    description     = "Allow API Gateway communication"
  }

  # AWS SES endpoints
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS for AWS SES and Meta WhatsApp API"
  }

  # Internal VPC
  egress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "Internal VPC communication"
  }

  tags = {
    Name        = "crm-external-api-services-${var.environment}"
    Environment = var.environment
  }
}

# VPC Endpoints para AWS Services (elimina necessidade de internet)
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  
  tags = {
    Name = "crm-ecr-dkr-endpoint-${var.environment}"
  }
}

resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  
  tags = {
    Name = "crm-ecr-api-endpoint-${var.environment}"
  }
}

resource "aws_vpc_endpoint" "logs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  
  tags = {
    Name = "crm-logs-endpoint-${var.environment}"
  }
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]
  
  tags = {
    Name = "crm-s3-endpoint-${var.environment}"
  }
}

# Security Group para VPC Endpoints
resource "aws_security_group" "vpc_endpoints" {
  name        = "crm-vpc-endpoints-${var.environment}"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  tags = {
    Name        = "crm-vpc-endpoints-${var.environment}"
    Environment = var.environment
  }
}