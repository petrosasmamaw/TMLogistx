-- Extensions beyond base schema.sql (sites, master scope, staff trip meter, app snapshot)

CREATE TABLE IF NOT EXISTS project_sites (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    country_id VARCHAR(50) REFERENCES countries(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    short_label VARCHAR(50),
    display_order INT DEFAULT 0,
    lead_logistics_coordinator_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    lead_movement_officer_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_sites_project ON project_sites(project_id, is_active);

ALTER TABLE users ADD COLUMN IF NOT EXISTS site_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS master_active_project_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS master_active_site_id VARCHAR(50);

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS site_id VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS city VARCHAR(150);

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS shift_type VARCHAR(50) DEFAULT 'NORMAL_DAY';

ALTER TABLE trip_assignments ADD COLUMN IF NOT EXISTS staff_meter_start_lat DOUBLE PRECISION;
ALTER TABLE trip_assignments ADD COLUMN IF NOT EXISTS staff_meter_start_lng DOUBLE PRECISION;
ALTER TABLE trip_assignments ADD COLUMN IF NOT EXISTS staff_meter_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE trip_assignments ADD COLUMN IF NOT EXISTS staff_meter_end_lat DOUBLE PRECISION;
ALTER TABLE trip_assignments ADD COLUMN IF NOT EXISTS staff_meter_end_lng DOUBLE PRECISION;
ALTER TABLE trip_assignments ADD COLUMN IF NOT EXISTS staff_meter_ended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE trip_assignments ADD COLUMN IF NOT EXISTS distance_source VARCHAR(50);

-- Authoritative application state for API (controllers read/write via getStore cache)
CREATE TABLE IF NOT EXISTS app_store_snapshots (
    id VARCHAR(32) PRIMARY KEY,
    payload JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
