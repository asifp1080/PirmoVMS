-- Add PII audit logging table
CREATE TABLE IF NOT EXISTS "PIIAuditLog" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "pii_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "purpose" TEXT,
    "legal_basis" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PIIAuditLog_pkey" PRIMARY KEY ("id")
);

-- Add GDPR requests table
CREATE TABLE IF NOT EXISTS "GDPRRequest" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "subject_email" TEXT NOT NULL,
    "subject_phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "requested_by" TEXT NOT NULL,
    "verification_token" TEXT NOT NULL,
    "export_data" JSONB,
    "deletion_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GDPRRequest_pkey" PRIMARY KEY ("id")
);

-- Add data retention policies table
CREATE TABLE IF NOT EXISTS "DataRetentionPolicy" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "retention_period_days" INTEGER NOT NULL,
    "auto_delete_enabled" BOOLEAN NOT NULL DEFAULT false,
    "legal_hold_exemption" BOOLEAN NOT NULL DEFAULT false,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- Add visitor tombstones table for GDPR compliance
CREATE TABLE IF NOT EXISTS "VisitorTombstone" (
    "id" TEXT NOT NULL,
    "original_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletion_reason" TEXT NOT NULL,
    "hashed_identifiers" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorTombstone_pkey" PRIMARY KEY ("id")
);

-- Update Visitor table to add encrypted fields
ALTER TABLE "Visitor" ADD COLUMN IF NOT EXISTS "encrypted_email" JSONB;
ALTER TABLE "Visitor" ADD COLUMN IF NOT EXISTS "encrypted_phone" JSONB;
ALTER TABLE "Visitor" ADD COLUMN IF NOT EXISTS "email_hash" TEXT;
ALTER TABLE "Visitor" ADD COLUMN IF NOT EXISTS "phone_hash" TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "PIIAuditLog_org_id_timestamp_idx" ON "PIIAuditLog"("org_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "PIIAuditLog_user_id_timestamp_idx" ON "PIIAuditLog"("user_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "PIIAuditLog_resource_type_resource_id_idx" ON "PIIAuditLog"("resource_type", "resource_id");

CREATE INDEX IF NOT EXISTS "GDPRRequest_org_id_status_idx" ON "GDPRRequest"("org_id", "status");
CREATE INDEX IF NOT EXISTS "GDPRRequest_subject_email_idx" ON "GDPRRequest"("subject_email");
CREATE INDEX IF NOT EXISTS "GDPRRequest_verification_token_idx" ON "GDPRRequest"("verification_token");

CREATE UNIQUE INDEX IF NOT EXISTS "DataRetentionPolicy_org_id_resource_type_key" ON "DataRetentionPolicy"("org_id", "resource_type");

CREATE INDEX IF NOT EXISTS "VisitorTombstone_org_id_deleted_at_idx" ON "VisitorTombstone"("org_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "VisitorTombstone_original_id_idx" ON "VisitorTombstone"("original_id");

CREATE INDEX IF NOT EXISTS "Visitor_email_hash_idx" ON "Visitor"("email_hash");
CREATE INDEX IF NOT EXISTS "Visitor_phone_hash_idx" ON "Visitor"("phone_hash");

-- Add foreign key constraints
ALTER TABLE "PIIAuditLog" ADD CONSTRAINT "PIIAuditLog_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PIIAuditLog" ADD CONSTRAINT "PIIAuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GDPRRequest" ADD CONSTRAINT "GDPRRequest_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GDPRRequest" ADD CONSTRAINT "GDPRRequest_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DataRetentionPolicy" ADD CONSTRAINT "DataRetentionPolicy_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataRetentionPolicy" ADD CONSTRAINT "DataRetentionPolicy_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VisitorTombstone" ADD CONSTRAINT "VisitorTombstone_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;