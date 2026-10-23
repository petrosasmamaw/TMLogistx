// ====================================================================
// TMLogistx In-Memory Development Store
// Serves as immediate out-of-the-box storage when Neon DB connection
// string is using demo credentials or offline during initial local testing.
// ====================================================================

export const initialStore = {
  countries: [
    { id: 'cnt-ethiopia', name: 'Ethiopia', code: 'ET', currency: 'ETB', is_active: true, created_at: new Date() },
    { id: 'cnt-kenya', name: 'Kenya', code: 'KE', currency: 'KES', is_active: true, created_at: new Date() }
  ],
  projects: [
    {
      id: 'proj-eth-a',
      country_id: 'cnt-ethiopia',
      name: 'Project A - Addis Health Outreach',
      code: 'ETH-HLTH-A',
      description: 'Public health supply and staff transportation in Addis Ababa & surrounding zones.',
      allow_vehicle_sharing: true,
      is_active: true,
      created_at: new Date()
    },
    {
      id: 'proj-eth-b',
      country_id: 'cnt-ethiopia',
      name: 'Project B - Oromia Agri Initiative',
      code: 'ETH-AGRI-B',
      description: 'Rural agricultural research and field extension officer movement in Oromia region.',
      allow_vehicle_sharing: false,
      is_active: true,
      created_at: new Date()
    },
    {
      id: 'proj-ken-c',
      country_id: 'cnt-kenya',
      name: 'Project C - Nairobi Logistics Hub',
      code: 'KEN-LOG-C',
      description: 'Regional equipment and personnel transit hub in Nairobi & Rift Valley.',
      allow_vehicle_sharing: false,
      is_active: true,
      created_at: new Date()
    }
  ],
  project_sites: [
    { id: 'site-eth-a-bole', project_id: 'proj-eth-a', name: 'Addis Ababa — Bole', short_label: 'Bole', country_id: 'cnt-ethiopia', display_order: 1, lead_logistics_coordinator_user_id: 'usr-coord-a', lead_movement_officer_user_id: 'usr-move-a', is_active: true, created_at: new Date() },
    { id: 'site-eth-a-lideta', project_id: 'proj-eth-a', name: 'Addis Ababa — Lideta', short_label: 'Lideta', country_id: 'cnt-ethiopia', display_order: 2, is_active: true, created_at: new Date() },
    { id: 'site-eth-a-yeka', project_id: 'proj-eth-a', name: 'Addis Ababa — Yeka', short_label: 'Yeka', country_id: 'cnt-ethiopia', display_order: 3, is_active: true, created_at: new Date() },
    { id: 'site-eth-a-adama', project_id: 'proj-eth-a', name: 'Adama Field Site', short_label: 'Adama', country_id: 'cnt-ethiopia', display_order: 4, is_active: true, created_at: new Date() },
    { id: 'site-eth-a-hawassa', project_id: 'proj-eth-a', name: 'Hawassa Outreach', short_label: 'Hawassa', country_id: 'cnt-ethiopia', display_order: 5, is_active: true, created_at: new Date() },
    { id: 'site-eth-b-adama', project_id: 'proj-eth-b', name: 'Adama Research Hub', short_label: 'Adama', country_id: 'cnt-ethiopia', display_order: 1, is_active: true, created_at: new Date() },
    { id: 'site-eth-b-bishoftu', project_id: 'proj-eth-b', name: 'Bishoftu Extension', short_label: 'Bishoftu', country_id: 'cnt-ethiopia', display_order: 2, is_active: true, created_at: new Date() },
    { id: 'site-ken-c-nairobi', project_id: 'proj-ken-c', name: 'Nairobi Central', short_label: 'Nairobi', country_id: 'cnt-kenya', display_order: 1, is_active: true, created_at: new Date() },
    { id: 'site-ken-c-nakuru', project_id: 'proj-ken-c', name: 'Nakuru Rift Site', short_label: 'Nakuru', country_id: 'cnt-kenya', display_order: 2, is_active: true, created_at: new Date() }
  ],
  users: [
    {
      id: 'usr-admin-01',
      email: 'admin@tmlogistx.com',
      password_hash: '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', // Password@123
      full_name: 'Dawit Haile (System Admin)',
      phone_number: '+251 911 234567',
      role: 'SYSTEM_ADMIN',
      country_id: null,
      project_id: null,
      language_preference: 'en',
      is_active: true,
      created_at: new Date()
    },
    {
      id: 'usr-master-a',
      email: 'master.a@tmlogistx.com',
      password_hash: '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', // Password@123
      full_name: 'Dr. Almaz Bekele (Master Person A)',
      phone_number: '+251 912 345678',
      role: 'MASTER_PERSON',
      country_id: 'cnt-ethiopia',
      project_id: 'proj-eth-a',
      site_id: 'site-eth-a-bole',
      master_active_project_id: 'proj-eth-a',
      master_active_site_id: 'site-eth-a-bole',
      language_preference: 'en',
      is_active: true,
      created_at: new Date()
    },
    {
      id: 'usr-master-b',
      email: 'master.b@tmlogistx.com',
      password_hash: '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', // Password@123
      full_name: 'Getachew Tadesse (Master Person B)',
      phone_number: '+251 913 456789',
      role: 'MASTER_PERSON',
      country_id: 'cnt-ethiopia',
      project_id: 'proj-eth-b',
      site_id: 'site-eth-b-adama',
      master_active_project_id: 'proj-eth-b',
      master_active_site_id: 'site-eth-b-adama',
      language_preference: 'am',
      is_active: true,
      created_at: new Date()
    },
    {
      id: 'usr-master-c',
      email: 'master.c@tmlogistx.com',
      password_hash: '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', // Password@123
      full_name: 'Faith Mwangi (Master Person C)',
      phone_number: '+254 722 123456',
      role: 'MASTER_PERSON',
      country_id: 'cnt-kenya',
      project_id: 'proj-ken-c',
      site_id: 'site-ken-c-nairobi',
      master_active_project_id: 'proj-ken-c',
      master_active_site_id: 'site-ken-c-nairobi',
      language_preference: 'en',
      is_active: true,
      created_at: new Date()
    },
    {
      id: 'usr-coord-a',
      email: 'logistics.a@tmlogistx.com',
      password_hash: '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', // Password@123
      full_name: 'Yonas Mengistu (Logistics Coord)',
      phone_number: '+251 914 567890',
      role: 'LOGISTICS_COORDINATOR',
      country_id: 'cnt-ethiopia',
      project_id: 'proj-eth-a',
      site_id: 'site-eth-a-bole',
      language_preference: 'en',
      is_active: true,
      created_at: new Date()
    },
    {
      id: 'usr-move-a',
      email: 'movement.a@tmlogistx.com',
      password_hash: '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', // Password@123
      full_name: 'Selamawit Desta (Movement Officer)',
      phone_number: '+251 915 678901',
      role: 'MOVEMENT_OFFICER',
      country_id: 'cnt-ethiopia',
      project_id: 'proj-eth-a',
      site_id: 'site-eth-a-lideta',
      language_preference: 'am',
      is_active: true,
      created_at: new Date()
    },
    {
      id: 'usr-staff-01',
      email: 'staff1@tmlogistx.com',
      password_hash: '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', // Password@123
      full_name: 'Blen Kebede (Public Health Officer)',
      phone_number: '+251 916 789012',
      role: 'STAFF',
      country_id: 'cnt-ethiopia',
      project_id: 'proj-eth-a',
      site_id: 'site-eth-a-bole',
      language_preference: 'en',
      is_active: true,
      created_at: new Date()
    },
    {
      id: 'usr-staff-02',
      email: 'staff2@tmlogistx.com',
      password_hash: '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', // Password@123
      full_name: 'Tamirat Girma (Field Researcher)',
      phone_number: '+251 917 890123',
      role: 'STAFF',
      country_id: 'cnt-ethiopia',
      project_id: 'proj-eth-a',
      site_id: 'site-eth-a-yeka',
      language_preference: 'am',
      is_active: true,
      created_at: new Date()
    },
    {
      id: 'usr-driver-01',
      email: 'driver1@tmlogistx.com',
      password_hash: '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', // Password@123
      full_name: 'Abebe Bikila (Senior Driver)',
      phone_number: '+251 918 901234',
      role: 'DRIVER',
      country_id: 'cnt-ethiopia',
      project_id: 'proj-eth-a',
      site_id: 'site-eth-a-bole',
      language_preference: 'am',
      is_active: true,
      created_at: new Date()
    },
    {
      id: 'usr-driver-02',
      email: 'driver2@tmlogistx.com',
      password_hash: '$2b$10$6R2bkUyhrhUQIOSYH0a2d.88nv7ctRcIIPf4MWyJffZC7g6noHP66', // Password@123
      full_name: 'Chala Dejene (Fleet Driver)',
      phone_number: '+251 919 012345',
      role: 'DRIVER',
      country_id: 'cnt-ethiopia',
      project_id: 'proj-eth-a',
      language_preference: 'en',
      is_active: true,
      created_at: new Date()
    }
  ],
  master_person_projects: [
    { id: 'mpp-1', user_id: 'usr-master-a', project_id: 'proj-eth-a' },
    { id: 'mpp-2', user_id: 'usr-master-b', project_id: 'proj-eth-b' },
    { id: 'mpp-3', user_id: 'usr-master-c', project_id: 'proj-ken-c' }
  ],
  vehicles: [
    {
      id: 'veh-01',
      project_id: 'proj-eth-a',
      site_id: 'site-eth-a-bole',
      plate_number: 'ET-3-A12345',
      make: 'Toyota',
      model: 'Land Cruiser Prado',
      year: 2023,
      capacity: 7,
      fuel_type: 'Diesel',
      operational_status: 'AVAILABLE',
      shift_type: 'NORMAL_DAY',
      shift_start_time: '08:00',
      shift_end_time: '18:00',
      is_weekend_eligible: false,
      current_lat: 9.0123,
      current_lng: 38.7612,
      current_address: 'Bole Sub-City, Addis Ababa',
      last_location_update: new Date(),
      odometer_km: 34500.0,
      created_at: new Date()
    },
    {
      id: 'veh-02',
      project_id: 'proj-eth-a',
      plate_number: 'ET-3-B67890',
      make: 'Toyota',
      model: 'Hilux Double Cabin 4x4',
      year: 2022,
      capacity: 5,
      fuel_type: 'Diesel',
      operational_status: 'AVAILABLE',
      shift_type: 'NIGHT_SHIFT',
      shift_start_time: '18:00',
      shift_end_time: '06:00',
      is_weekend_eligible: true,
      current_lat: 9.0256,
      current_lng: 38.7465,
      current_address: 'Kazanchis, Addis Ababa',
      last_location_update: new Date(Date.now() - 3 * 60 * 1000),
      odometer_km: 52300.0,
      created_at: new Date()
    },
    {
      id: 'veh-03',
      project_id: 'proj-eth-a',
      plate_number: 'ET-3-C44556',
      make: 'Toyota',
      model: 'HiAce Van 14-Seat',
      year: 2021,
      capacity: 14,
      fuel_type: 'Diesel',
      operational_status: 'MAINTENANCE',
      shift_type: 'WEEKEND',
      shift_start_time: '08:00',
      shift_end_time: '20:00',
      is_weekend_eligible: true,
      current_lat: 9.0045,
      current_lng: 38.7890,
      current_address: 'Kality Maintenance Depot',
      last_location_update: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      odometer_km: 98400.0,
      created_at: new Date()
    },
    {
      id: 'veh-04',
      project_id: 'proj-eth-b',
      plate_number: 'ET-3-D99887',
      make: 'Nissan',
      model: 'Patrol 4WD',
      year: 2020,
      capacity: 6,
      fuel_type: 'Petrol',
      operational_status: 'AVAILABLE',
      shift_type: 'ALL_HOURS',
      shift_start_time: '00:00',
      shift_end_time: '23:59',
      is_weekend_eligible: true,
      current_lat: 8.5400,
      current_lng: 39.2700,
      current_address: 'Adama Town Center, Oromia',
      last_location_update: new Date(),
      odometer_km: 64200.0,
      created_at: new Date()
    }
  ],
  drivers: [
    {
      id: 'drv-01',
      user_id: 'usr-driver-01',
      project_id: 'proj-eth-a',
      license_number: 'ET-LIC-98214',
      license_category: 'Public Transport Grade 3',
      license_expiry: '2028-12-31',
      assigned_vehicle_id: 'veh-01',
      availability_status: 'AVAILABLE',
      shift_start_time: '07:30:00',
      shift_end_time: '18:30:00',
      total_trips_completed: 142,
      rating: 4.9,
      created_at: new Date()
    },
    {
      id: 'drv-02',
      user_id: 'usr-driver-02',
      project_id: 'proj-eth-a',
      license_number: 'ET-LIC-45120',
      license_category: 'Public Transport Grade 3',
      license_expiry: '2027-06-30',
      assigned_vehicle_id: 'veh-02',
      availability_status: 'AVAILABLE',
      shift_start_time: '08:00:00',
      shift_end_time: '17:00:00',
      total_trips_completed: 89,
      rating: 4.8,
      created_at: new Date()
    }
  ],
  vehicle_schedules: [
    {
      id: 'sched-01',
      vehicle_id: 'veh-03',
      driver_id: null,
      project_id: 'proj-eth-a',
      start_time: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      schedule_type: 'MAINTENANCE',
      status: 'CONFIRMED',
      notes: 'Scheduled 100,000 km general service and brake replacement at Kality Workshop.',
      created_at: new Date()
    }
  ],
  movement_requests: [
    {
      id: 'req-01',
      request_code: 'REQ-2026-0001',
      project_id: 'proj-eth-a',
      site_id: 'site-eth-a-bole',
      staff_id: 'usr-staff-01',
      pickup_address: 'Bole Atlas Hotel, Addis Ababa',
      pickup_lat: 8.9984,
      pickup_lng: 38.7845,
      destination_address: 'Black Lion Hospital, Lideta, Addis Ababa',
      destination_lat: 9.0182,
      destination_lng: 38.7494,
      requested_datetime: new Date(Date.now() + 45 * 60 * 1000),
      passenger_count: 2,
      purpose: 'Delivering specialized medical test samples & visiting regional outreach staff.',
      special_instructions: 'Fragile diagnostic equipment in rear cargo.',
      status: 'PENDING',
      created_at: new Date()
    },
    {
      id: 'req-02',
      request_code: 'REQ-2026-0002',
      project_id: 'proj-eth-a',
      site_id: 'site-eth-a-yeka',
      staff_id: 'usr-staff-02',
      pickup_address: 'UNECA Conference Center, Menelik II Ave',
      pickup_lat: 9.0150,
      pickup_lng: 38.7620,
      destination_address: 'Addis Ababa Bole International Airport Terminal 2',
      destination_lat: 8.9806,
      destination_lng: 38.7997,
      requested_datetime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      passenger_count: 1,
      purpose: 'Transport international health consultant to departing flight.',
      special_instructions: 'Please be at VIP Gate 2.',
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000)
    },
    {
      id: 'req-03',
      request_code: 'REQ-2026-0003',
      project_id: 'proj-eth-a',
      site_id: 'site-eth-a-bole',
      staff_id: 'usr-staff-01',
      pickup_address: 'Sarbet Canadian Embassy area',
      pickup_lat: 8.9950,
      pickup_lng: 38.7350,
      destination_address: 'Ministry of Health, Sudan Street',
      destination_lat: 9.0160,
      destination_lng: 38.7510,
      requested_datetime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      passenger_count: 1,
      purpose: 'Emergency document delivery when all internal fleet vehicles were in field mission.',
      special_instructions: 'Uber alternative arranged by Movement Officer.',
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 25 * 60 * 60 * 1000)
    }
  ],
  trip_assignments: [
    {
      id: 'assign-02',
      request_id: 'req-02',
      project_id: 'proj-eth-a',
      vehicle_id: 'veh-01',
      driver_id: 'drv-01',
      assigned_by_user_id: 'usr-move-a',
      status: 'COMPLETED',
      estimated_pickup_time: new Date(Date.now() - 4 * 60 * 60 * 1000),
      estimated_distance_km: 8.5,
      estimated_duration_mins: 25,
      actual_start_time: new Date(Date.now() - 4 * 60 * 60 * 1000),
      actual_pickup_time: new Date(Date.now() - 3.6 * 60 * 60 * 1000),
      actual_completion_time: new Date(Date.now() - 3.1 * 60 * 60 * 1000),
      actual_distance_km: 9.1,
      notes: 'Trip smoothly completed on time.',
      created_at: new Date(Date.now() - 4.5 * 60 * 60 * 1000)
    }
  ],
  external_transports: [
    {
      id: 'ext-01',
      request_id: 'req-03',
      project_id: 'proj-eth-a',
      arranged_by_user_id: 'usr-move-a',
      staff_id: 'usr-staff-01',
      provider_name: 'RIDE Transportation (Addis)',
      fare_amount: 650.00,
      currency: 'ETB',
      ride_date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      reason: 'All project 4x4 vehicles deployed to rural zones; urgent delivery required for ministry briefing.',
      receipt_url: 'https://placehold.co/600x400/png?text=Receipt+RIDE+650+ETB',
      has_receipt: true,
      is_approved: true,
      notes: 'Receipt verified and approved by Master Person A.',
      created_at: new Date()
    }
  ],
  vehicle_expenses: [
    {
      id: 'exp-01',
      vehicle_id: 'veh-01',
      project_id: 'proj-eth-a',
      recorded_by_user_id: 'usr-coord-a',
      expense_type: 'FUEL',
      amount: 4800.00,
      currency: 'ETB',
      odometer_reading: 34200.0,
      receipt_url: 'https://placehold.co/600x400/png?text=TotalEnergies+Fuel+4800+ETB',
      description: 'Full tank TotalEnergies Diesel (65 Liters) prior to field assignment.',
      expense_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date()
    },
    {
      id: 'exp-02',
      vehicle_id: 'veh-02',
      project_id: 'proj-eth-a',
      recorded_by_user_id: 'usr-coord-a',
      expense_type: 'MAINTENANCE',
      amount: 12500.00,
      currency: 'ETB',
      odometer_reading: 52100.0,
      receipt_url: 'https://placehold.co/600x400/png?text=Oil+Change+and+Filter+Service',
      description: '50,000km scheduled synthetic engine oil change, fuel filter replacement, and tire rotation.',
      expense_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date()
    }
  ],
  audit_logs: [
    {
      id: 'aud-01',
      user_id: 'usr-admin-01',
      action: 'SYSTEM_INITIALIZATION',
      entity_type: 'PLATFORM',
      entity_id: 'ROOT',
      project_id: null,
      new_values: { status: 'Initialized with Ethiopia and Kenya seed projects' },
      ip_address: '127.0.0.1',
      created_at: new Date()
    }
  ],
  gps_logs: [],
  vehicle_accidents: [
    {
      id: 'acc-01',
      vehicle_id: 'veh-02',
      driver_id: 'drv-02',
      project_id: 'proj-eth-a',
      reported_by_user_id: 'usr-driver-02',
      accident_date: new Date(Date.now() - 12 * 60 * 60 * 1000),
      location_address: 'Kazanchis Inter-Continental Roundabout, Addis Ababa',
      location_lat: 9.0210,
      location_lng: 38.7620,
      severity: 'MINOR',
      description: 'Side mirror and fender scrape with a blue-and-white minibus taxi during morning peak transit.',
      damage_details: 'Right front side-mirror housing fractured and right front fender scratched. No engine or suspension damage.',
      third_party_info: 'Minibus Plate ET-03-A12891, Driver Girma Hailu (+251 911 887766)',
      police_report_number: 'POL-KAZ-2026-4412',
      status: 'UNDER_INVESTIGATION',
      resolved_at: null,
      notes: 'Insurance claim form initiated. Vehicle operational status shifted to IN_REPAIR.',
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000)
    }
  ],
  fuel_logs: [
    {
      id: 'fuel-01',
      vehicle_id: 'veh-01',
      driver_id: 'drv-01',
      trip_assignment_id: 'assign-02',
      project_id: 'proj-eth-a',
      recorded_by_user_id: 'usr-driver-01',
      liters: 45.0,
      cost: 3532.50,
      currency: 'ETB',
      odometer_reading: 34500.0,
      fuel_station: 'TotalEnergies Bole Medhanialem',
      fuel_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      days_covered: 1,
      receipt_url: 'https://placehold.co/600x400/png?text=TotalEnergies+Receipt+45L',
      notes: 'Filled tank following morning field outreach to Sarbet.',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: 'fuel-02',
      vehicle_id: 'veh-04',
      driver_id: null,
      trip_assignment_id: null,
      project_id: 'proj-eth-b',
      recorded_by_user_id: 'usr-driver-02',
      liters: 80.0,
      cost: 6280.00,
      currency: 'ETB',
      odometer_reading: 64200.0,
      fuel_station: 'National Oil Ethiopia (NOC) Adama',
      fuel_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      days_covered: 3,
      receipt_url: 'https://placehold.co/600x400/png?text=NOC+Fuel+80L+Bulk',
      notes: 'Bulk fuel recording for past 3 days of rural agrarian field surveys.',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  ],
  personal_fuel_recoveries: [
    {
      id: 'pfuel-01',
      request_id: 'req-02',
      staff_id: 'usr-staff-01',
      project_id: 'proj-eth-a',
      vehicle_id: 'veh-01',
      distance_km: 18.2,
      estimated_fuel_liters: 2.3,
      fuel_rate_per_liter: 78.50,
      total_amount_due: 180.55,
      currency: 'ETB',
      status: 'PENDING_PAYMENT',
      paid_at: null,
      payment_reference: null,
      verified_by_user_id: null,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  ],
  policies: [
    {
      id: 'pol-drv-01',
      role_target: 'DRIVER',
      title: 'Professional Driver Safety & Vehicle Custody Code of Conduct',
      content: `1. Defensive & Safe Driving: Drivers must observe all road speed limits (maximum 60 km/h in urban centers, 80 km/h on rural trunk roads) and take the safest evaluated route at all times.
2. Vehicle Pre-Trip Inspection: Check tire pressure, engine coolant, engine oil, brake functionality, and seatbelts before every assignment.
3. Zero Tolerance: Operating vehicles under the influence of alcohol, drugs, or severe exhaustion is grounds for immediate termination.
4. Fuel Logging Mandate: Record fuel consumption immediately per trip or within 24 hours for multi-day field operations, recording exact liters, odometer, and station receipts.
5. Accident & Incident Protocol: In case of collision, scratch, breakdown, or accident, ensure passenger safety first, record GPS coordinates and photos, obtain police report if third party is involved, and file the Accident Report on the app immediately.`,
      version: 1,
      is_active: true,
      updated_by_user_id: 'usr-admin-01',
      updated_at: new Date(),
      created_at: new Date()
    },
    {
      id: 'pol-stf-01',
      role_target: 'STAFF',
      title: 'Staff Passenger Transport & Vehicle Usage Policy',
      content: `1. Official vs. Personal Travel: Vehicles are prioritized for program and official business. When approved for personal use, the staff member is legally and financially obligated to repay the company for all fuel consumed based on calculated road distance.
2. Trip Cancellations: If field appointments change or travel is delayed, staff must cancel their movement request on the app at least 30 minutes in advance to release the vehicle and driver for urgent missions.
3. Code of Conduct: Wear seatbelts at all times, respect the driver, adhere to assigned pickup points, and do not instruct drivers to violate traffic laws.
4. Alternative Transport (Uber/RIDE): When coordinator arranges Uber or RIDE 8294 due to fleet unavailability, tap Start Ride upon boarding, End Ride upon arrival, and submit exact fare paid for audit.`,
      version: 1,
      is_active: true,
      updated_by_user_id: 'usr-admin-01',
      updated_at: new Date(),
      created_at: new Date()
    },
    {
      id: 'pol-log-01',
      role_target: 'LOGISTICS_COORDINATOR',
      title: 'Logistics Coordinator & Movement Manager Operating Protocol',
      content: `1. Dynamic Dispatch: Drivers and vehicles are assigned per drive/movement; no vehicle is permanently locked to a single driver.
2. Shift & Availability Governance: Routinely review vehicle operational statuses (AVAILABLE, IN_ACCIDENT, IN_REPAIR, MAINTENANCE) and assign day, night, or weekend shifts according to project demands.
3. Reassignment & Cancellation: Coordinators hold full authority to change vehicles or drivers on pending trips or cancel assignments if requirements change.
4. External Provider Dispatch: When internal fleet capacity is depleted, coordinators must call and book verified Uber/RIDE 8294 transport and dispatch driver details directly to the staff app.`,
      version: 1,
      is_active: true,
      updated_by_user_id: 'usr-admin-01',
      updated_at: new Date(),
      created_at: new Date()
    }
  ],
  policy_acceptances: []
};

export const mockStore = initialStore;
export default initialStore;
