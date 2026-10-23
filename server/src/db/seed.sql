-- ====================================================================
-- TMLogistx Database Seed Script
-- Realistic Multi-Country & Multi-Project Demonstration Data
-- Pre-hashed bcrypt password for all demo accounts: "Password@123"
-- Bcrypt Hash: $2a$10$7Zrqh74rM7h0n56tG8tZde6w8wWd7b4205NlD.HnK/FzR67w.hS7m
-- ====================================================================

-- 1. Insert Countries
INSERT INTO countries (id, name, code, currency, is_active)
VALUES
    ('cnt-ethiopia', 'Ethiopia', 'ET', 'ETB', TRUE),
    ('cnt-kenya', 'Kenya', 'KE', 'KES', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Projects under Countries
INSERT INTO projects (id, country_id, name, code, description, allow_vehicle_sharing, is_active)
VALUES
    ('proj-eth-a', 'cnt-ethiopia', 'Project A - Addis Health Outreach', 'ETH-HLTH-A', 'Public health supply and staff transportation in Addis Ababa & surrounding zones.', TRUE, TRUE),
    ('proj-eth-b', 'cnt-ethiopia', 'Project B - Oromia Agri Initiative', 'ETH-AGRI-B', 'Rural agricultural research and field extension officer movement in Oromia region.', FALSE, TRUE),
    ('proj-ken-c', 'cnt-kenya', 'Project C - Nairobi Logistics Hub', 'KEN-LOG-C', 'Regional equipment and personnel transit hub in Nairobi & Rift Valley.', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Users for All 6 Roles (Bcrypt hash corresponds to: Password@123)
-- Password for all seed users: Password@123
INSERT INTO users (id, email, password_hash, full_name, phone_number, role, country_id, project_id, language_preference, is_active)
VALUES
    -- Role 1: System Admin (Platform-wide)
    ('usr-admin-01', 'admin@tmlogistx.com', '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', 'Dawit Haile (System Admin)', '+251 911 234567', 'SYSTEM_ADMIN', NULL, NULL, 'en', TRUE),

    -- Role 2: Master Persons
    ('usr-master-a', 'master.a@tmlogistx.com', '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', 'Dr. Almaz Bekele (Master Person A)', '+251 912 345678', 'MASTER_PERSON', 'cnt-ethiopia', 'proj-eth-a', 'en', TRUE),
    ('usr-master-b', 'master.b@tmlogistx.com', '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', 'Getachew Tadesse (Master Person B)', '+251 913 456789', 'MASTER_PERSON', 'cnt-ethiopia', 'proj-eth-b', 'am', TRUE),
    ('usr-master-c', 'master.c@tmlogistx.com', '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', 'Faith Mwangi (Master Person C)', '+254 722 123456', 'MASTER_PERSON', 'cnt-kenya', 'proj-ken-c', 'en', TRUE),

    -- Role 3: Logistics Coordinator (Project A)
    ('usr-coord-a', 'logistics.a@tmlogistx.com', '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', 'Yonas Mengistu (Logistics Coord)', '+251 914 567890', 'LOGISTICS_COORDINATOR', 'cnt-ethiopia', 'proj-eth-a', 'en', TRUE),

    -- Role 4: Movement Officer (Project A)
    ('usr-move-a', 'movement.a@tmlogistx.com', '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', 'Selamawit Desta (Movement Officer)', '+251 915 678901', 'MOVEMENT_OFFICER', 'cnt-ethiopia', 'proj-eth-a', 'am', TRUE),

    -- Role 5: Staff Members (Mobile App Users)
    ('usr-staff-01', 'staff1@tmlogistx.com', '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', 'Blen Kebede (Public Health Officer)', '+251 916 789012', 'STAFF', 'cnt-ethiopia', 'proj-eth-a', 'en', TRUE),
    ('usr-staff-02', 'staff2@tmlogistx.com', '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', 'Tamirat Girma (Field Researcher)', '+251 917 890123', 'STAFF', 'cnt-ethiopia', 'proj-eth-a', 'am', TRUE),

    -- Role 6: Drivers (Mobile App Users)
    ('usr-driver-01', 'driver1@tmlogistx.com', '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', 'Abebe Bikila (Senior Driver)', '+251 918 901234', 'DRIVER', 'cnt-ethiopia', 'proj-eth-a', 'am', TRUE),
    ('usr-driver-02', 'driver2@tmlogistx.com', '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', 'Chala Dejene (Fleet Driver)', '+251 919 012345', 'DRIVER', 'cnt-ethiopia', 'proj-eth-a', 'en', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Master Person Projects Junction
INSERT INTO master_person_projects (user_id, project_id)
VALUES
    ('usr-master-a', 'proj-eth-a'),
    ('usr-master-b', 'proj-eth-b'),
    ('usr-master-c', 'proj-ken-c')
ON CONFLICT (user_id, project_id) DO NOTHING;

-- 5. Insert Vehicles (Project A Fleet - Addis Ababa)
INSERT INTO vehicles (id, project_id, plate_number, make, model, year, capacity, fuel_type, operational_status, current_lat, current_lng, current_address, last_location_update, odometer_km)
VALUES
    ('veh-01', 'proj-eth-a', 'ET-3-A12345', 'Toyota', 'Land Cruiser Prado', 2023, 7, 'Diesel', 'AVAILABLE', 9.0123, 38.7612, 'Bole Sub-City, Addis Ababa', NOW(), 34500.0),
    ('veh-02', 'proj-eth-a', 'ET-3-B67890', 'Toyota', 'Hilux Double Cabin 4x4', 2022, 5, 'Diesel', 'AVAILABLE', 9.0256, 38.7465, 'Kazanchis, Addis Ababa', NOW() - INTERVAL '3 minutes', 52300.0),
    ('veh-03', 'proj-eth-a', 'ET-3-C44556', 'Toyota', 'HiAce Van 14-Seat', 2021, 14, 'Diesel', 'MAINTENANCE', 9.0045, 38.7890, 'Kality Maintenance Depot', NOW() - INTERVAL '2 days', 98400.0),
    ('veh-04', 'proj-eth-b', 'ET-3-D99887', 'Nissan', 'Patrol 4WD', 2020, 6, 'Petrol', 'AVAILABLE', 8.5400, 39.2700, 'Adama Town Center, Oromia', NOW(), 64200.0)
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Drivers
INSERT INTO drivers (id, user_id, project_id, license_number, license_category, license_expiry, assigned_vehicle_id, availability_status, shift_start_time, shift_end_time, total_trips_completed, rating)
VALUES
    ('drv-01', 'usr-driver-01', 'proj-eth-a', 'ET-LIC-98214', 'Public Transport Grade 3', '2028-12-31', 'veh-01', 'AVAILABLE', '07:30:00', '18:30:00', 142, 4.9),
    ('drv-02', 'usr-driver-02', 'proj-eth-a', 'ET-LIC-45120', 'Public Transport Grade 3', '2027-06-30', 'veh-02', 'AVAILABLE', '08:00:00', '17:00:00', 89, 4.8)
ON CONFLICT (id) DO NOTHING;

-- 7. Insert Vehicle Schedules
INSERT INTO vehicle_schedules (id, vehicle_id, driver_id, project_id, start_time, end_time, schedule_type, status, notes)
VALUES
    ('sched-01', 'veh-03', NULL, 'proj-eth-a', NOW() - INTERVAL '1 day', NOW() + INTERVAL '3 days', 'MAINTENANCE', 'CONFIRMED', 'Scheduled 100,000 km general service and brake replacement at Kality Workshop.')
ON CONFLICT (id) DO NOTHING;

-- 8. Insert Movement Requests
INSERT INTO movement_requests (id, request_code, project_id, staff_id, pickup_address, pickup_lat, pickup_lng, destination_address, destination_lat, destination_lng, requested_datetime, passenger_count, purpose, special_instructions, status)
VALUES
    -- Request 1: Pending movement request ready for dispatch demonstration
    ('req-01', 'REQ-2026-0001', 'proj-eth-a', 'usr-staff-01', 'Bole Atlas Hotel, Addis Ababa', 8.9984, 38.7845, 'Black Lion Hospital, Lideta, Addis Ababa', 9.0182, 38.7494, NOW() + INTERVAL '45 minutes', 2, 'Delivering specialized medical test samples & visiting regional outreach staff.', 'Fragile diagnostic equipment in rear cargo.', 'PENDING'),

    -- Request 2: Completed historical request
    ('req-02', 'REQ-2026-0002', 'proj-eth-a', 'usr-staff-02', 'UNECA Conference Center, Menelik II Ave', 9.0150, 38.7620, 'Addis Ababa Bole International Airport Terminal 2', 8.9806, 38.7997, NOW() - INTERVAL '4 hours', 1, 'Transport international health consultant to departing flight.', 'Please be at VIP Gate 2.', 'COMPLETED'),

    -- Request 3: External Transport (Uber / RIDE alternative) demonstration
    ('req-03', 'REQ-2026-0003', 'proj-eth-a', 'usr-staff-01', 'Sarbet Canadian Embassy area', 8.9950, 38.7350, 'Ministry of Health, Sudan Street', 9.0160, 38.7510, NOW() - INTERVAL '1 day', 1, 'Emergency document delivery when all internal fleet vehicles were in field mission.', 'Uber alternative arranged by Movement Officer.', 'COMPLETED')
ON CONFLICT (id) DO NOTHING;

-- 9. Insert Trip Assignments
INSERT INTO trip_assignments (id, request_id, project_id, vehicle_id, driver_id, assigned_by_user_id, status, estimated_pickup_time, estimated_distance_km, estimated_duration_mins, actual_start_time, actual_pickup_time, actual_completion_time, actual_distance_km, notes)
VALUES
    ('assign-02', 'req-02', 'proj-eth-a', 'veh-01', 'drv-01', 'usr-move-a', 'COMPLETED', NOW() - INTERVAL '4 hours', 8.5, 25, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 40 minutes', NOW() - INTERVAL '3 hours 10 minutes', 9.1, 'Trip smoothly completed on time.')
ON CONFLICT (id) DO NOTHING;

-- 10. Insert External Transport Record (Workflow E)
INSERT INTO external_transports (id, request_id, project_id, arranged_by_user_id, staff_id, provider_name, fare_amount, currency, ride_date, reason, receipt_url, has_receipt, is_approved, notes)
VALUES
    ('ext-01', 'req-03', 'proj-eth-a', 'usr-move-a', 'usr-staff-01', 'RIDE Transportation (Addis)', 650.00, 'ETB', NOW() - INTERVAL '1 day', 'All project 4x4 vehicles deployed to rural zones; urgent delivery required for ministry briefing.', 'https://placehold.co/600x400/png?text=Receipt+RIDE+650+ETB', TRUE, TRUE, 'Receipt verified and approved by Master Person A.')
ON CONFLICT (id) DO NOTHING;

-- 11. Insert Vehicle Expenses
INSERT INTO vehicle_expenses (id, vehicle_id, project_id, recorded_by_user_id, expense_type, amount, currency, odometer_reading, receipt_url, description, expense_date)
VALUES
    ('exp-01', 'veh-01', 'proj-eth-a', 'usr-coord-a', 'FUEL', 4800.00, 'ETB', 34200.0, 'https://placehold.co/600x400/png?text=TotalEnergies+Fuel+4800+ETB', 'Full tank TotalEnergies Diesel (65 Liters) prior to field assignment.', CURRENT_DATE - INTERVAL '2 days'),
    ('exp-02', 'veh-02', 'proj-eth-a', 'usr-coord-a', 'MAINTENANCE', 12500.00, 'ETB', 52100.0, 'https://placehold.co/600x400/png?text=Oil+Change+and+Filter+Service', '50,000km scheduled synthetic engine oil change, fuel filter replacement, and tire rotation.', CURRENT_DATE - INTERVAL '1 week')
ON CONFLICT (id) DO NOTHING;

-- 12. Insert Audit Logs
INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, project_id, new_values, ip_address)
VALUES
    ('aud-01', 'usr-admin-01', 'SYSTEM_INITIALIZATION', 'PLATFORM', 'ROOT', NULL, '{"status":"Initialized with Ethiopia and Kenya seed projects"}', '127.0.0.1'),
    ('aud-02', 'usr-master-a', 'USER_ONBOARDING', 'USER', 'usr-coord-a', 'proj-eth-a', '{"role":"LOGISTICS_COORDINATOR","name":"Yonas Mengistu"}', '127.0.0.1')
ON CONFLICT (id) DO NOTHING;
