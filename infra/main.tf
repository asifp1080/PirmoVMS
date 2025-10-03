terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "vms-terraform-state"
    key    = "vms/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"
  
  name_prefix        = local.name_prefix
  cidr_block        = var.vpc_cidr
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 2)
  
  tags = local.common_tags
}

# Security Groups
module "security_groups" {
  source = "./modules/security"
  
  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  
  tags = local.common_tags
}

# RDS Database
module "database" {
  source = "./modules/rds"
  
  name_prefix           = local.name_prefix
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  security_group_ids   = [module.security_groups.rds_security_group_id]
  
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  
  database_name = var.database_name
  username      = var.database_username
  
  backup_retention_period = var.db_backup_retention_period
  backup_window          = var.db_backup_window
  maintenance_window     = var.db_maintenance_window
  
  tags = local.common_tags
}

# ElastiCache Redis
module "redis" {
  source = "./modules/redis"
  
  name_prefix        = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.security_groups.redis_security_group_id]
  
  node_type         = var.redis_node_type
  num_cache_nodes   = var.redis_num_nodes
  parameter_group   = var.redis_parameter_group
  
  tags = local.common_tags
}

# S3 Buckets
module "storage" {
  source = "./modules/s3"
  
  name_prefix = local.name_prefix
  
  # Visitor photos and signatures
  create_visitor_assets_bucket = true
  visitor_assets_bucket_name   = "${local.name_prefix}-visitor-assets"
  
  # Application assets and exports
  create_app_assets_bucket = true
  app_assets_bucket_name   = "${local.name_prefix}-app-assets"
  
  # Backup storage
  create_backup_bucket = true
  backup_bucket_name   = "${local.name_prefix}-backups"
  
  tags = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  
  name_prefix        = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  security_group_ids = [module.security_groups.alb_security_group_id]
  
  certificate_arn = var.ssl_certificate_arn
  
  tags = local.common_tags
}

# ECS Cluster
module "ecs" {
  source = "./modules/ecs"
  
  name_prefix = local.name_prefix
  
  # Cluster configuration
  cluster_name = "${local.name_prefix}-cluster"
  
  tags = local.common_tags
}

# API Service
module "api_service" {
  source = "./modules/ecs-service"
  
  name_prefix = local.name_prefix
  service_name = "api"
  
  cluster_id         = module.ecs.cluster_id
  vpc_id            = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.security_groups.ecs_security_group_id]
  
  # Container configuration
  container_image = "${var.container_registry}/${var.project_name}-api:${var.image_tag}"
  container_port  = 3001
  cpu            = var.api_cpu
  memory         = var.api_memory
  desired_count  = var.api_desired_count
  
  # Load balancer
  target_group_arn = module.alb.api_target_group_arn
  
  # Environment variables
  environment_variables = {
    NODE_ENV     = var.environment
    PORT         = "3001"
    DATABASE_URL = module.database.connection_string
    REDIS_URL    = module.redis.connection_string
    JWT_SECRET   = var.jwt_secret
    
    # AWS services
    AWS_REGION = var.aws_region
    S3_VISITOR_ASSETS_BUCKET = module.storage.visitor_assets_bucket_name
    S3_APP_ASSETS_BUCKET     = module.storage.app_assets_bucket_name
    
    # External services
    TWILIO_ACCOUNT_SID = var.twilio_account_sid
    TWILIO_AUTH_TOKEN  = var.twilio_auth_token
    SENDGRID_API_KEY   = var.sendgrid_api_key
  }
  
  # Secrets
  secrets = {
    DATABASE_PASSWORD = module.database.password_secret_arn
    JWT_SECRET        = aws_secretsmanager_secret.jwt_secret.arn
  }
  
  tags = local.common_tags
}

# Web Service
module "web_service" {
  source = "./modules/ecs-service"
  
  name_prefix = local.name_prefix
  service_name = "web"
  
  cluster_id         = module.ecs.cluster_id
  vpc_id            = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.security_groups.ecs_security_group_id]
  
  # Container configuration
  container_image = "${var.container_registry}/${var.project_name}-web:${var.image_tag}"
  container_port  = 3000
  cpu            = var.web_cpu
  memory         = var.web_memory
  desired_count  = var.web_desired_count
  
  # Load balancer
  target_group_arn = module.alb.web_target_group_arn
  
  # Environment variables
  environment_variables = {
    NODE_ENV = var.environment
    PORT     = "3000"
    NEXT_PUBLIC_API_URL = "https://${var.api_domain_name}"
  }
  
  tags = local.common_tags
}

# Secrets Manager
resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${local.name_prefix}-jwt-secret"
  description = "JWT secret for VMS API"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name_prefix}-api"
  retention_in_days = var.log_retention_days
  
  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/${local.name_prefix}-web"
  retention_in_days = var.log_retention_days
  
  tags = local.common_tags
}

# IAM Roles for ECS Tasks
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${local.name_prefix}-ecs-task-execution-role"

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

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${local.name_prefix}-ecs-task-role"

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

  tags = local.common_tags
}

# IAM policy for S3 access
resource "aws_iam_role_policy" "ecs_s3_policy" {
  name = "${local.name_prefix}-ecs-s3-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${module.storage.visitor_assets_bucket_arn}/*",
          "${module.storage.app_assets_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          module.storage.visitor_assets_bucket_arn,
          module.storage.app_assets_bucket_arn
        ]
      }
    ]
  })
}

# IAM policy for Secrets Manager access
resource "aws_iam_role_policy" "ecs_secrets_policy" {
  name = "${local.name_prefix}-ecs-secrets-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.jwt_secret.arn,
          module.database.password_secret_arn
        ]
      }
    ]
  })
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "api_cpu_high" {
  alarm_name          = "${local.name_prefix}-api-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors API CPU utilization"
  
  dimensions = {
    ServiceName = module.api_service.service_name
    ClusterName = module.ecs.cluster_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "api_memory_high" {
  alarm_name          = "${local.name_prefix}-api-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors API memory utilization"
  
  dimensions = {
    ServiceName = module.api_service.service_name
    ClusterName = module.ecs.cluster_name
  }

  tags = local.common_tags
}