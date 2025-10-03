# Production environment configuration
environment = "production"
aws_region  = "us-east-1"

# Domain configuration
api_domain_name = "api.vms.example.com"
web_domain_name = "app.vms.example.com"
ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/production-cert-id"

# Database configuration
db_instance_class = "db.r6g.large"
db_allocated_storage = 100
db_max_allocated_storage = 1000
db_backup_retention_period = 30

# Redis configuration
redis_node_type = "cache.r6g.large"
redis_num_nodes = 2

# ECS configuration
api_cpu = 1024
api_memory = 2048
api_desired_count = 4

web_cpu = 512
web_memory = 1024
web_desired_count = 3

# Container configuration
container_registry = "ghcr.io/your-org"
image_tag = "latest"

# Monitoring
log_retention_days = 90