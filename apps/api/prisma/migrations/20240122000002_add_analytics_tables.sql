-- Add analytics rollup table for precomputed metrics
CREATE TABLE IF NOT EXISTS "AnalyticsRollup" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "period_type" TEXT NOT NULL, -- 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_visits" INTEGER NOT NULL DEFAULT 0,
    "checked_in_visits" INTEGER NOT NULL DEFAULT 0,
    "checked_out_visits" INTEGER NOT NULL DEFAULT 0,
    "no_show_visits" INTEGER NOT NULL DEFAULT 0,
    "average_wait_time" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "average_visit_duration" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unique_visitors" INTEGER NOT NULL DEFAULT 0,
    "returning_visitors" INTEGER NOT NULL DEFAULT 0,
    "peak_hour" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsRollup_pkey" PRIMARY KEY ("id")
);

-- Add location-specific rollups
CREATE TABLE IF NOT EXISTS "LocationAnalyticsRollup" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "period_type" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_visits" INTEGER NOT NULL DEFAULT 0,
    "average_duration" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "peak_hour" INTEGER,
    "capacity_utilization" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationAnalyticsRollup_pkey" PRIMARY KEY ("id")
);

-- Add host-specific rollups
CREATE TABLE IF NOT EXISTS "HostAnalyticsRollup" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "period_type" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_visits" INTEGER NOT NULL DEFAULT 0,
    "average_wait_time" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "average_duration" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostAnalyticsRollup_pkey" PRIMARY KEY ("id")
);

-- Add purpose-specific rollups
CREATE TABLE IF NOT EXISTS "PurposeAnalyticsRollup" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "period_type" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_visits" INTEGER NOT NULL DEFAULT 0,
    "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "average_duration" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurposeAnalyticsRollup_pkey" PRIMARY KEY ("id")
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "AnalyticsRollup_org_id_period_type_start_idx" ON "AnalyticsRollup"("org_id", "period_type", "period_start" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsRollup_org_period_unique_idx" ON "AnalyticsRollup"("org_id", "period_type", "period_start");

CREATE INDEX IF NOT EXISTS "LocationAnalyticsRollup_org_location_period_idx" ON "LocationAnalyticsRollup"("org_id", "location_id", "period_type", "period_start" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "LocationAnalyticsRollup_unique_idx" ON "LocationAnalyticsRollup"("org_id", "location_id", "period_type", "period_start");

CREATE INDEX IF NOT EXISTS "HostAnalyticsRollup_org_host_period_idx" ON "HostAnalyticsRollup"("org_id", "host_id", "period_type", "period_start" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "HostAnalyticsRollup_unique_idx" ON "HostAnalyticsRollup"("org_id", "host_id", "period_type", "period_start");

CREATE INDEX IF NOT EXISTS "PurposeAnalyticsRollup_org_purpose_period_idx" ON "PurposeAnalyticsRollup"("org_id", "purpose", "period_type", "period_start" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "PurposeAnalyticsRollup_unique_idx" ON "PurposeAnalyticsRollup"("org_id", "purpose", "period_type", "period_start");

-- Add foreign key constraints
ALTER TABLE "AnalyticsRollup" ADD CONSTRAINT "AnalyticsRollup_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LocationAnalyticsRollup" ADD CONSTRAINT "LocationAnalyticsRollup_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationAnalyticsRollup" ADD CONSTRAINT "LocationAnalyticsRollup_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostAnalyticsRollup" ADD CONSTRAINT "HostAnalyticsRollup_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostAnalyticsRollup" ADD CONSTRAINT "HostAnalyticsRollup_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PurposeAnalyticsRollup" ADD CONSTRAINT "PurposeAnalyticsRollup_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add materialized view for real-time analytics (PostgreSQL specific)
CREATE MATERIALIZED VIEW IF NOT EXISTS "RealTimeAnalytics" AS
SELECT 
    v.org_id,
    DATE_TRUNC('hour', v.scheduled_start) as hour_bucket,
    COUNT(*) as total_visits,
    COUNT(CASE WHEN v.status = 'CHECKED_IN' THEN 1 END) as checked_in_visits,
    COUNT(CASE WHEN v.status = 'CHECKED_OUT' THEN 1 END) as checked_out_visits,
    COUNT(CASE WHEN v.status = 'NO_SHOW' THEN 1 END) as no_show_visits,
    AVG(EXTRACT(EPOCH FROM (v.check_in_time - v.scheduled_start))/60) as avg_wait_time,
    AVG(EXTRACT(EPOCH FROM (v.check_out_time - v.check_in_time))/60) as avg_duration,
    COUNT(DISTINCT v.visitor_id) as unique_visitors
FROM "Visit" v
WHERE v.scheduled_start >= NOW() - INTERVAL '7 days'
GROUP BY v.org_id, DATE_TRUNC('hour', v.scheduled_start);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS "RealTimeAnalytics_org_hour_idx" ON "RealTimeAnalytics"("org_id", "hour_bucket" DESC);

-- Add function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_realtime_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY "RealTimeAnalytics";
END;
$$ LANGUAGE plpgsql;