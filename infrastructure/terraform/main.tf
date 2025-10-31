# Eagle OVault Infrastructure - Main Terraform Configuration
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }

  # Backend for state management
  backend "s3" {
    bucket         = "eagle-ovault-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "eagle-ovault-terraform-locks"
  }
}

# Providers
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Eagle OVault"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# VPC for monitoring infrastructure
resource "aws_vpc" "monitoring" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "eagle-ovault-monitoring-vpc"
  }
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.monitoring.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "eagle-ovault-public-subnet-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.monitoring.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "eagle-ovault-private-subnet-${count.index + 1}"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.monitoring.id

  tags = {
    Name = "eagle-ovault-igw"
  }
}

# Route tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.monitoring.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "eagle-ovault-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Groups
resource "aws_security_group" "monitoring" {
  name        = "eagle-ovault-monitoring-sg"
  description = "Security group for monitoring infrastructure"
  vpc_id      = aws_vpc.monitoring.id

  ingress {
    description = "Prometheus"
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    description = "Grafana"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Alertmanager"
    from_port   = 9093
    to_port     = 9093
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_ips
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "eagle-ovault-monitoring-sg"
  }
}

# EC2 instances for monitoring
resource "aws_instance" "monitoring" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.public[0].id

  vpc_security_group_ids = [aws_security_group.monitoring.id]
  key_name              = aws_key_pair.monitoring.key_name

  user_data = templatefile("${path.module}/scripts/monitoring-setup.sh", {
    environment = var.environment
  })

  root_block_device {
    volume_size = 100
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name = "eagle-ovault-monitoring"
    Role = "monitoring"
  }
}

resource "aws_key_pair" "monitoring" {
  key_name   = "eagle-ovault-monitoring-key"
  public_key = var.ssh_public_key
}

# Elastic IP for monitoring instance
resource "aws_eip" "monitoring" {
  instance = aws_instance.monitoring.id
  domain   = "vpc"

  tags = {
    Name = "eagle-ovault-monitoring-eip"
  }
}

# S3 bucket for backups
resource "aws_s3_bucket" "backups" {
  bucket = "eagle-ovault-backups-${var.environment}"

  tags = {
    Name = "eagle-ovault-backups"
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "delete-old-backups"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    expiration {
      days = 90
    }
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "deployment_logs" {
  name              = "/eagle-ovault/deployments"
  retention_in_days = 30

  tags = {
    Name = "eagle-ovault-deployment-logs"
  }
}

resource "aws_cloudwatch_log_group" "application_logs" {
  name              = "/eagle-ovault/application"
  retention_in_days = 14

  tags = {
    Name = "eagle-ovault-application-logs"
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "monitoring_instance_health" {
  alarm_name          = "eagle-ovault-monitoring-instance-health"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = "60"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "This metric monitors monitoring instance health"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.monitoring.id
  }
}

# SNS Topics for alerts
resource "aws_sns_topic" "alerts" {
  name = "eagle-ovault-alerts-${var.environment}"

  tags = {
    Name = "eagle-ovault-alerts"
  }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Secrets Manager for sensitive data
resource "aws_secretsmanager_secret" "deployer_private_key" {
  name = "eagle-ovault/deployer-private-key-${var.environment}"

  tags = {
    Name = "eagle-ovault-deployer-key"
  }
}

resource "aws_secretsmanager_secret" "rpc_urls" {
  name = "eagle-ovault/rpc-urls-${var.environment}"

  tags = {
    Name = "eagle-ovault-rpc-urls"
  }
}

resource "aws_secretsmanager_secret" "api_keys" {
  name = "eagle-ovault/api-keys-${var.environment}"

  tags = {
    Name = "eagle-ovault-api-keys"
  }
}

# IAM Role for deployment automation
resource "aws_iam_role" "deployment_automation" {
  name = "eagle-ovault-deployment-automation"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "deployment_automation" {
  name = "eagle-ovault-deployment-policy"
  role = aws_iam_role.deployment_automation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.deployer_private_key.arn,
          aws_secretsmanager_secret.rpc_urls.arn,
          aws_secretsmanager_secret.api_keys.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.backups.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# Outputs
output "monitoring_instance_ip" {
  description = "Public IP of monitoring instance"
  value       = aws_eip.monitoring.public_ip
}

output "grafana_url" {
  description = "Grafana dashboard URL"
  value       = "http://${aws_eip.monitoring.public_ip}:3000"
}

output "prometheus_url" {
  description = "Prometheus URL"
  value       = "http://${aws_eip.monitoring.public_ip}:9090"
}

output "backup_bucket" {
  description = "S3 backup bucket name"
  value       = aws_s3_bucket.backups.id
}

output "secrets_arns" {
  description = "ARNs of secrets"
  value = {
    deployer_key = aws_secretsmanager_secret.deployer_private_key.arn
    rpc_urls     = aws_secretsmanager_secret.rpc_urls.arn
    api_keys     = aws_secretsmanager_secret.api_keys.arn
  }
}

