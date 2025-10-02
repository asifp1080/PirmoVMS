# VPC
module "vpc" {
  source = "./modules/vpc"

  name_prefix = local.name_prefix
  vpc_cidr    = var.vpc_cidr
  azs         = local.azs
  
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

  name_prefix                = local.name_prefix
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  database_security_group_id = module.security_groups.database_security_group_id
  
  instance_class         = var.database_instance_class
  allocated_storage      = var.database_allocated_storage
  deletion_protection    = var.enable_deletion_protection
  backup_retention_period = var.backup_retention_period
  
  tags = local.common_tags
}

# ElastiCache Redis
module "redis" {
  source = "./modules/elasticache"

  name_prefix               = local.name_prefix
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  redis_security_group_id   = module.security_groups.redis_security_group_id
  
  node_type = var.redis_node_type
  
  tags = local.common_tags
}

# S3 and CloudFront
module "storage" {
  source = "./modules/s3-cloudfront"

  name_prefix   = local.name_prefix
  domain_name   = var.domain_name
  certificate_arn = var.certificate_arn
  
  tags = local.common_tags
}

# ECS Cluster and Services
module "ecs" {
  source = "./modules/ecs"

  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids
  
  alb_security_group_id = module.security_groups.alb_security_group_id
  ecs_security_group_id = module.security_groups.ecs_security_group_id
  
  database_endpoint = module.database.endpoint
  redis_endpoint    = module.redis.endpoint
  
  api_cpu    = var.ecs_api_cpu
  api_memory = var.ecs_api_memory
  web_cpu    = var.ecs_web_cpu
  web_memory = var.ecs_web_memory
  
  domain_name     = var.domain_name
  certificate_arn = var.certificate_arn
  
  tags = local.common_tags
}

# Secrets Manager
module "secrets" {
  source = "./modules/secrets"

  name_prefix = local.name_prefix
  
  database_password = module.database.password
  jwt_secret       = random_password.jwt_secret.result
  
  tags = local.common_tags
}

# CloudWatch and Monitoring
module "monitoring" {
  source = "./modules/monitoring"

  name_prefix         = local.name_prefix
  log_retention_days  = var.log_retention_days
  monitoring_enabled  = var.monitoring_enabled
  
  ecs_cluster_name = module.ecs.cluster_name
  rds_instance_id  = module.database.instance_id
  redis_cluster_id = module.redis.cluster_id
  
  tags = local.common_tags
}

# Random password for JWT secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}