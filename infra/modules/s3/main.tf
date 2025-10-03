variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "create_visitor_assets_bucket" {
  description = "Whether to create visitor assets bucket"
  type        = bool
  default     = true
}

variable "visitor_assets_bucket_name" {
  description = "Name of the visitor assets bucket"
  type        = string
}

variable "create_app_assets_bucket" {
  description = "Whether to create app assets bucket"
  type        = bool
  default     = true
}

variable "app_assets_bucket_name" {
  description = "Name of the app assets bucket"
  type        = string
}

variable "create_backup_bucket" {
  description = "Whether to create backup bucket"
  type        = bool
  default     = true
}

variable "backup_bucket_name" {
  description = "Name of the backup bucket"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Visitor Assets Bucket (photos, signatures)
resource "aws_s3_bucket" "visitor_assets" {
  count  = var.create_visitor_assets_bucket ? 1 : 0
  bucket = var.visitor_assets_bucket_name

  tags = merge(var.tags, {
    Name = var.visitor_assets_bucket_name
    Type = "visitor-assets"
  })
}

resource "aws_s3_bucket_versioning" "visitor_assets" {
  count  = var.create_visitor_assets_bucket ? 1 : 0
  bucket = aws_s3_bucket.visitor_assets[0].id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "visitor_assets" {
  count  = var.create_visitor_assets_bucket ? 1 : 0
  bucket = aws_s3_bucket.visitor_assets[0].id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "visitor_assets" {
  count  = var.create_visitor_assets_bucket ? 1 : 0
  bucket = aws_s3_bucket.visitor_assets[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "visitor_assets" {
  count  = var.create_visitor_assets_bucket ? 1 : 0
  bucket = aws_s3_bucket.visitor_assets[0].id

  rule {
    id     = "visitor_assets_lifecycle"
    status = "Enabled"

    # Move to IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Delete after 7 years (GDPR compliance)
    expiration {
      days = 2555
    }
  }
}

# App Assets Bucket (exports, reports)
resource "aws_s3_bucket" "app_assets" {
  count  = var.create_app_assets_bucket ? 1 : 0
  bucket = var.app_assets_bucket_name

  tags = merge(var.tags, {
    Name = var.app_assets_bucket_name
    Type = "app-assets"
  })
}

resource "aws_s3_bucket_versioning" "app_assets" {
  count  = var.create_app_assets_bucket ? 1 : 0
  bucket = aws_s3_bucket.app_assets[0].id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "app_assets" {
  count  = var.create_app_assets_bucket ? 1 : 0
  bucket = aws_s3_bucket.app_assets[0].id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "app_assets" {
  count  = var.create_app_assets_bucket ? 1 : 0
  bucket = aws_s3_bucket.app_assets[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "app_assets" {
  count  = var.create_app_assets_bucket ? 1 : 0
  bucket = aws_s3_bucket.app_assets[0].id

  rule {
    id     = "app_assets_lifecycle"
    status = "Enabled"

    # Delete temporary exports after 7 days
    expiration {
      days = 7
    }
  }
}

# Backup Bucket
resource "aws_s3_bucket" "backup" {
  count  = var.create_backup_bucket ? 1 : 0
  bucket = var.backup_bucket_name

  tags = merge(var.tags, {
    Name = var.backup_bucket_name
    Type = "backup"
  })
}

resource "aws_s3_bucket_versioning" "backup" {
  count  = var.create_backup_bucket ? 1 : 0
  bucket = aws_s3_bucket.backup[0].id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "backup" {
  count  = var.create_backup_bucket ? 1 : 0
  bucket = aws_s3_bucket.backup[0].id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backup" {
  count  = var.create_backup_bucket ? 1 : 0
  bucket = aws_s3_bucket.backup[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  count  = var.create_backup_bucket ? 1 : 0
  bucket = aws_s3_bucket.backup[0].id

  rule {
    id     = "backup_lifecycle"
    status = "Enabled"

    # Move to IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Move to Deep Archive after 1 year
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
  }
}

# Outputs
output "visitor_assets_bucket_name" {
  description = "Name of the visitor assets bucket"
  value       = var.create_visitor_assets_bucket ? aws_s3_bucket.visitor_assets[0].bucket : null
}

output "visitor_assets_bucket_arn" {
  description = "ARN of the visitor assets bucket"
  value       = var.create_visitor_assets_bucket ? aws_s3_bucket.visitor_assets[0].arn : null
}

output "app_assets_bucket_name" {
  description = "Name of the app assets bucket"
  value       = var.create_app_assets_bucket ? aws_s3_bucket.app_assets[0].bucket : null
}

output "app_assets_bucket_arn" {
  description = "ARN of the app assets bucket"
  value       = var.create_app_assets_bucket ? aws_s3_bucket.app_assets[0].arn : null
}

output "backup_bucket_name" {
  description = "Name of the backup bucket"
  value       = var.create_backup_bucket ? aws_s3_bucket.backup[0].bucket : null
}

output "backup_bucket_arn" {
  description = "ARN of the backup bucket"
  value       = var.create_backup_bucket ? aws_s3_bucket.backup[0].arn : null
}