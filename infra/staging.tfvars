# Staging environment configuration
environment = "staging"
aws_region  = "us-east-1"

# Domain configuration
api_domain_name = "staging-api.vms.example.com"
web_domain_name = "staging.vms.example.com"
ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/staging-cert-id"

# Database configuration
db_instance_class = "db.t3.small"
db_allocated_storage = 20
db_max_allocated_storage = 100
db_backup_retention_period = 7

# Redis configuration
redis_node_type = "cache.t3.micro"
redis_num_nodes = 1

# ECS configuration
api_cpu = 512
api_memory = 1024
api_desired_count = 2

web_cpu = 256
web_memory = 512
web_desired_count = 2

# Container configuration
container_registry = "ghcr.io/your-org"
image_tag = "staging"

# Monitoring
log_retention_days = 14