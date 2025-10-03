# VPC outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

# Database outputs
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = module.database.endpoint
  sensitive   = true
}

output "database_port" {
  description = "RDS instance port"
  value       = module.database.port
}

# Redis outputs
output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = module.redis.port
}

# S3 outputs
output "visitor_assets_bucket_name" {
  description = "Name of the visitor assets S3 bucket"
  value       = module.storage.visitor_assets_bucket_name
}

output "app_assets_bucket_name" {
  description = "Name of the app assets S3 bucket"
  value       = module.storage.app_assets_bucket_name
}

output "backup_bucket_name" {
  description = "Name of the backup S3 bucket"
  value       = module.storage.backup_bucket_name
}

# Load Balancer outputs
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.alb.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = module.alb.zone_id
}

# ECS outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "api_service_name" {
  description = "Name of the API ECS service"
  value       = module.api_service.service_name
}

output "web_service_name" {
  description = "Name of the web ECS service"
  value       = module.web_service.service_name
}

# Application URLs
output "api_url" {
  description = "API URL"
  value       = "https://${var.api_domain_name}"
}

output "web_url" {
  description = "Web application URL"
  value       = "https://${var.web_domain_name}"
}