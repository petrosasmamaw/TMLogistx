-- ====================================================================
-- TMLogistx PostgreSQL Database Schema
-- Multi-Tenant Centralized Staff Movement & Fleet Management System
-- Compatible with Neon Serverless Postgres
-- ====================================================================

-- 1. Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enumerated Types (or VARCHAR checks for universal compatibility)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'SYSTEM_ADMIN',
        'MASTER_PERSON',
        'LOGISTICS_COORDINATOR',
        'MOVEMENT_OFFICER',
        'STAFF',
        'DRIVER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vehicle_status AS ENUM (
        'AVAILABLE',
        'BUSY',
        'MAINTENANCE',
        'OUT_OF_SERVICE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE driver_status AS ENUM (
        'AVAILABLE',
        'ON_TRIP',
        'OFF_DUTY',
        'INACTIVE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE movement_request_status AS ENUM (
        'PENDING',
        'ASSIGNED',
        'IN_TRANSIT',
        'COMPLETED',
        'REJECTED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trip_assignment_status AS ENUM (
        'ASSIGNED',
        'ACCEPTED',
        'HEADING_TO_PICKUP',
        'ARRIVED',
        'PASSENGER_PICKED_UP',
        'IN_TRANSIT',
        'COMPLETED',
        'CANCELLED',
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE expense_type AS ENUM (
        'FUEL',
        'MAINTENANCE',
        'REPAIR',
        'INSURANCE',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================================================================
-- Table 1: Countries
-- ====================================================================
CREATE TABLE IF NOT EXISTS countries (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    currency VARCHAR(10) DEFAULT 'ETB',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 2: Projects
-- ====================================================================
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    country_id VARCHAR(50) NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    allow_vehicle_sharing BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_country_code UNIQUE (country_id, code)
);

-- ====================================================================
-- Table 3: Users
-- ====================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(50),
    role VARCHAR(50) NOT NULL,
    country_id VARCHAR(50) REFERENCES countries(id) ON DELETE SET NULL,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE SET NULL,
    language_preference VARCHAR(10) DEFAULT 'en', -- 'en' or 'am' (Amharic)
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 4: Master Person Project Assignments (Junction table)
-- Supports 1 Master Person assigned to 1 or more specific projects
-- ====================================================================
CREATE TABLE IF NOT EXISTS master_person_projects (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_master_person_project UNIQUE (user_id, project_id)
);

-- ====================================================================
-- Table 5: Vehicles
-- ====================================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    plate_number VARCHAR(50) NOT NULL UNIQUE,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT,
    capacity INT NOT NULL DEFAULT 4,
    fuel_type VARCHAR(30) DEFAULT 'Diesel', -- Diesel, Petrol, Hybrid, Electric
    operational_status VARCHAR(50) DEFAULT 'AVAILABLE', -- AVAILABLE, BUSY, MAINTENANCE, OUT_OF_SERVICE
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    current_address TEXT,
    last_location_update TIMESTAMP WITH TIME ZONE,
    odometer_km DOUBLE PRECISION DEFAULT 0.0,
    shift_type VARCHAR(50) DEFAULT 'NORMAL_DAY', -- NORMAL_DAY, NIGHT_SHIFT, WEEKEND, ALL_HOURS
    shift_start_time TIME DEFAULT '08:00:00',
    shift_end_time TIME DEFAULT '18:00:00',
    is_weekend_eligible BOOLEAN DEFAULT FALSE,
    insurance_expiry DATE,
    technical_inspection_expiry DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 6: Drivers
-- ====================================================================
CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(50) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    license_number VARCHAR(100) NOT NULL,
    license_category VARCHAR(50) DEFAULT 'Public / 3rd Grade',
    license_expiry DATE,
    assigned_vehicle_id VARCHAR(50) REFERENCES vehicles(id) ON DELETE SET NULL,
    availability_status VARCHAR(50) DEFAULT 'AVAILABLE', -- AVAILABLE, ON_TRIP, OFF_DUTY, INACTIVE
    shift_start_time TIME DEFAULT '08:00:00',
    shift_end_time TIME DEFAULT '18:00:00',
    total_trips_completed INT DEFAULT 0,
    rating DOUBLE PRECISION DEFAULT 5.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 7: Vehicle Schedules & Availability
-- ====================================================================
CREATE TABLE IF NOT EXISTS vehicle_schedules (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE SET NULL,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    schedule_type VARCHAR(50) DEFAULT 'RESERVATION', -- RESERVATION, MAINTENANCE, REGULAR_SHIFT
    status VARCHAR(50) DEFAULT 'CONFIRMED', -- CONFIRMED, COMPLETED, CANCELLED
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_schedule_times CHECK (end_time > start_time)
);

-- ====================================================================
-- Table 8: Movement Requests
-- ====================================================================
CREATE TABLE IF NOT EXISTS movement_requests (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    request_code VARCHAR(50) NOT NULL UNIQUE,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    staff_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    pickup_address TEXT NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    destination_address TEXT NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    requested_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    passenger_count INT DEFAULT 1,
    purpose TEXT NOT NULL,
    special_instructions TEXT,
    trip_category VARCHAR(20) DEFAULT 'OFFICIAL', -- OFFICIAL, PERSONAL
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, ASSIGNED, EXTERNAL_AUTHORIZED, IN_TRANSIT, COMPLETED, REJECTED, CANCELLED
    rejection_reason TEXT,
    external_authorized BOOLEAN DEFAULT FALSE,
    external_provider VARCHAR(50), -- UBER, RIDE, FERES, BOLT, TAXI
    external_status VARCHAR(50), -- AUTHORIZED, IN_TRANSIT, COMPLETED
    coordinator_booked_uber BOOLEAN DEFAULT FALSE,
    external_driver_name TEXT,
    external_driver_phone TEXT,
    external_vehicle_plate TEXT,
    external_vehicle_model TEXT,
    external_booking_ref TEXT,
    external_start_lat DOUBLE PRECISION,
    external_start_lng DOUBLE PRECISION,
    external_start_time TIMESTAMP WITH TIME ZONE,
    external_end_lat DOUBLE PRECISION,
    external_end_lng DOUBLE PRECISION,
    external_end_time TIMESTAMP WITH TIME ZONE,
    external_distance_km DOUBLE PRECISION,
    external_cost DOUBLE PRECISION,
    external_currency VARCHAR(10) DEFAULT 'ETB',
    external_receipt_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 9: Trip Assignments
-- ====================================================================
CREATE TABLE IF NOT EXISTS trip_assignments (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    request_id VARCHAR(50) NOT NULL REFERENCES movement_requests(id) ON DELETE CASCADE,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id VARCHAR(50) NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    assigned_by_user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'ASSIGNED', -- ASSIGNED, ACCEPTED, HEADING_TO_PICKUP, ARRIVED, PASSENGER_PICKED_UP, IN_TRANSIT, COMPLETED, CANCELLED, REJECTED
    rejection_reason TEXT,
    incident_report TEXT,
    estimated_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_distance_km DOUBLE PRECISION,
    estimated_duration_mins INT,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_completion_time TIMESTAMP WITH TIME ZONE,
    actual_distance_km DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 10: External Transports (Workflow E: Uber, Taxi, Alternative)
-- Kept distinct from internal fleet to prevent data skewing
-- ====================================================================
CREATE TABLE IF NOT EXISTS external_transports (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    request_id VARCHAR(50) NOT NULL REFERENCES movement_requests(id) ON DELETE CASCADE,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    arranged_by_user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    staff_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    provider_name VARCHAR(100) NOT NULL, -- Uber, RIDE, Local Taxi, Feres, etc.
    fare_amount DOUBLE PRECISION NOT NULL,
    currency VARCHAR(10) DEFAULT 'ETB',
    ride_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL,
    receipt_url TEXT,
    has_receipt BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 11: Vehicle Expenses (Fuel, Maintenance, Repairs)
-- ====================================================================
CREATE TABLE IF NOT EXISTS vehicle_expenses (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    recorded_by_user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    expense_type VARCHAR(50) NOT NULL, -- FUEL, MAINTENANCE, REPAIR, INSURANCE, OTHER
    amount DOUBLE PRECISION NOT NULL,
    currency VARCHAR(10) DEFAULT 'ETB',
    odometer_reading DOUBLE PRECISION,
    receipt_url TEXT,
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 12: GPS Telemetry Logs
-- ====================================================================
CREATE TABLE IF NOT EXISTS gps_logs (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE SET NULL,
    trip_assignment_id VARCHAR(50) REFERENCES trip_assignments(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION DEFAULT 0.0,
    heading DOUBLE PRECISION DEFAULT 0.0,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 13: Audit Logs
-- ====================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(50),
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE SET NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 14: Vehicle Accidents & Safety Incident Logs
-- ====================================================================
CREATE TABLE IF NOT EXISTS vehicle_accidents (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE SET NULL,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    reported_by_user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    accident_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    location_address TEXT NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    severity VARCHAR(30) DEFAULT 'MINOR', -- MINOR, MODERATE, SEVERE, CRITICAL
    description TEXT NOT NULL,
    damage_details TEXT,
    third_party_info TEXT,
    police_report_number VARCHAR(100),
    status VARCHAR(30) DEFAULT 'REPORTED', -- REPORTED, UNDER_INVESTIGATION, IN_REPAIR, RESOLVED
    resolved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 15: Driver Fuel Consumption Logs (Per-movement or Bulk past days)
-- ====================================================================
CREATE TABLE IF NOT EXISTS fuel_logs (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE SET NULL,
    trip_assignment_id VARCHAR(50) REFERENCES trip_assignments(id) ON DELETE SET NULL,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    recorded_by_user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    liters DOUBLE PRECISION NOT NULL,
    cost DOUBLE PRECISION NOT NULL,
    currency VARCHAR(10) DEFAULT 'ETB',
    odometer_reading DOUBLE PRECISION,
    fuel_station VARCHAR(150),
    fuel_date DATE NOT NULL DEFAULT CURRENT_DATE,
    days_covered INT DEFAULT 1, -- 1 for daily/per movement, >1 for bulk historical days
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 16: Personal Trip Fuel Recoveries (Staff repayment to company)
-- ====================================================================
CREATE TABLE IF NOT EXISTS personal_fuel_recoveries (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    request_id VARCHAR(50) NOT NULL REFERENCES movement_requests(id) ON DELETE CASCADE,
    staff_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    vehicle_id VARCHAR(50) REFERENCES vehicles(id) ON DELETE SET NULL,
    distance_km DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    estimated_fuel_liters DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    fuel_rate_per_liter DOUBLE PRECISION NOT NULL DEFAULT 78.50,
    total_amount_due DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    currency VARCHAR(10) DEFAULT 'ETB',
    status VARCHAR(30) DEFAULT 'PENDING_PAYMENT', -- PENDING_PAYMENT, PAID
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_reference TEXT,
    verified_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 17: Fleet Policies & Codes of Conduct
-- ====================================================================
CREATE TABLE IF NOT EXISTS policies (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role_target VARCHAR(50) NOT NULL, -- DRIVER, STAFF, LOGISTICS_COORDINATOR, MOVEMENT_OFFICER, ALL
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    updated_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Table 18: User Policy Acceptances
-- ====================================================================
CREATE TABLE IF NOT EXISTS policy_acceptances (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    policy_id VARCHAR(50) NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    policy_version INT NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_policy UNIQUE (user_id, policy_id)
);

-- ====================================================================
-- Performance & Isolation Indexes
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_users_project_role ON users(project_id, role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_vehicles_project_status ON vehicles(project_id, operational_status);
CREATE INDEX IF NOT EXISTS idx_drivers_project_status ON drivers(project_id, availability_status);
CREATE INDEX IF NOT EXISTS idx_requests_project_status ON movement_requests(project_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_staff ON movement_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_assignments_request ON trip_assignments(request_id);
CREATE INDEX IF NOT EXISTS idx_assignments_driver ON trip_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_vehicle ON trip_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_assignments_project_status ON trip_assignments(project_id, status);
CREATE INDEX IF NOT EXISTS idx_schedules_vehicle_time ON vehicle_schedules(vehicle_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_external_transports_project ON external_transports(project_id, ride_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_vehicle ON vehicle_expenses(vehicle_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_gps_vehicle_time ON gps_logs(vehicle_id, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_time ON audit_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accidents_vehicle ON vehicle_accidents(vehicle_id, accident_date DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON fuel_logs(vehicle_id, fuel_date DESC);
CREATE INDEX IF NOT EXISTS idx_personal_fuel_staff ON personal_fuel_recoveries(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_policies_role ON policies(role_target, is_active);

