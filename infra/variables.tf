variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "vms"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Database variables
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS max allocated storage in GB"
  type        = number
  default     = 100
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "vms"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "vms_user"
}

variable "db_backup_retention_period" {
  description = "Database backup retention period in days"
  type        = number
  default     = 7
}

variable "db_backup_window" {
  description = "Database backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  description = "Database maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

# Redis variables
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

variable "redis_parameter_group" {
  description = "Redis parameter group"
  type        = string
  default     = "default.redis7"
}

# ECS variables
variable "api_cpu" {
  description = "CPU units for API service"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory for API service"
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired count of API tasks"
  type        = number
  default     = 2
}

variable "web_cpu" {
  description = "CPU units for web service"
  type        = number
  default     = 256
}

variable "web_memory" {
  description = "Memory for web service"
  type        = number
  default     = 512
}

variable "web_desired_count" {
  description = "Desired count of web tasks"
  type        = number
  default     = 2
}

# Container variables
variable "container_registry" {
  description = "Container registry URL"
  type        = string
  default     = "ghcr.io"
}

variable "image_tag" {
  description = "Container image tag"
  type        = string
  default     = "latest"
}

# Domain variables
variable "api_domain_name" {
  description = "Domain name for API"
  type        = string
}

variable "web_domain_name" {
  description = "Domain name for web app"
  type        = string
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate"
  type        = string
}

# Application secrets
variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

variable "twilio_account_sid" {
  description = "Twilio Account SID"
  type        = string
  sensitive   = true
}

variable "twilio_auth_token" {
  description = "Twilio Auth Token"
  type        = string
  sensitive   = true
}

variable "sendgrid_api_key" {
  description = "SendGrid API Key"
  type        = string
  sensitive   = true
}

# Monitoring
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}