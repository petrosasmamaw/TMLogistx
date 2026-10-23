import http from 'http';
import app from '../app.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { getStore } from '../db/connection.js';

function generateToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
}

let server;
let port;
let baseUrl;

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
  }
}

async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    body: data
  };
}

async function runExternalShiftsTests() {
  console.log('\n======================================================');
  console.log('🧪 TMLogistx: Vehicle Shifts & Staff Uber/RIDE Test Suite');
  console.log('======================================================\n');

  // Start test server
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      console.log(`Test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  const coordToken = generateToken({
    userId: 'usr-coord-a',
    email: 'coordinator1@tmlogistx.com',
    role: 'LOGISTICS_COORDINATOR',
    projectId: 'proj-eth-a'
  });

  const moveToken = generateToken({
    userId: 'usr-move-a',
    email: 'movement1@tmlogistx.com',
    role: 'MOVEMENT_OFFICER',
    projectId: 'proj-eth-a'
  });

  const staffToken = generateToken({
    userId: 'usr-staff-01',
    email: 'staff1@tmlogistx.com',
    role: 'STAFF',
    projectId: 'proj-eth-a'
  });

  // 1. Vehicle Registration with Operational Shift Duty
  console.log('--- 1. Vehicle Registration with Shift Assignment ---');
  const newVehPlate = 'ET-3-SHIFT-' + Math.floor(Math.random() * 10000);
  const createVehRes = await apiRequest('/vehicles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${coordToken}` },
    body: {
      plate_number: newVehPlate,
      make: 'Nissan',
      model: 'Patrol 4x4 Shift Spec',
      year: 2024,
      capacity: 5,
      fuel_type: 'Diesel',
      shift_type: 'NIGHT_SHIFT',
      shift_start_time: '18:00',
      shift_end_time: '06:00',
      is_weekend_eligible: true
    }
  });

  assert(createVehRes.status === 201, 'Vehicle created with status 201');
  assert(createVehRes.body.data.shift_type === 'NIGHT_SHIFT', 'Vehicle shift_type is NIGHT_SHIFT');
  assert(createVehRes.body.data.is_weekend_eligible === true, 'Vehicle is weekend eligible');

  // 2. Dispatch Recommendations Shift Matching
  console.log('\n--- 2. Dispatch Recommendations & Shift Filtering ---');
  const store = getStore();
  const testReq = {
    id: 'req-shift-test-' + Date.now(),
    request_code: 'REQ-SHIFT-001',
    project_id: 'proj-eth-a',
    staff_id: 'usr-staff-01',
    pickup_address: 'Bole Atlas Hotel, Addis Ababa',
    pickup_lat: 8.9984,
    pickup_lng: 38.7845,
    destination_address: 'UNECA, Addis Ababa',
    destination_lat: 9.0150,
    destination_lng: 38.7620,
    requested_datetime: new Date('2026-10-20T10:00:00Z'), // Daytime weekday
    passenger_count: 2,
    purpose: 'Ministry Health Logistics Consultation',
    status: 'PENDING',
    created_at: new Date()
  };
  store.movement_requests.push(testReq);

  const recRes = await apiRequest(`/dispatch/recommendations/${testReq.id}`, {
    headers: { Authorization: `Bearer ${moveToken}` }
  });

  assert(recRes.status === 200, 'Recommendations fetched with status 200');
  assert(recRes.body.recommendations.length > 0, 'Recommendation vehicles returned');
  const recVeh = recRes.body.recommendations[0];
  assert(Boolean(recVeh.vehicle.shift_type), `Vehicle contains assigned shift_type: ${recVeh.vehicle.shift_type}`);

  // 3. Movement Controller Authorizes Uber / RIDE
  console.log('\n--- 3. Movement Officer Authorizes Uber / RIDE for Staff ---');
  const authRes = await apiRequest('/dispatch/authorize-external', {
    method: 'POST',
    headers: { Authorization: `Bearer ${moveToken}` },
    body: {
      request_id: testReq.id,
      provider: 'RIDE Transportation (Addis)',
      notes: 'No fleet vehicles on duty for this mission. Authorized external taxi.'
    }
  });

  assert(authRes.status === 200, 'External transport authorized with status 200');
  assert(authRes.body.data.status === 'EXTERNAL_AUTHORIZED', 'Request status set to EXTERNAL_AUTHORIZED');
  assert(authRes.body.data.external_authorized === true, 'external_authorized flag set to true');
  assert(authRes.body.data.external_provider === 'RIDE Transportation (Addis)', 'external_provider recorded');

  // 4. Staff Starts External Ride
  console.log('\n--- 4. Staff Starts External Ride on Mobile ---');
  const startRideRes = await apiRequest('/dispatch/start-external', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: {
      request_id: testReq.id,
      start_lat: 8.9984,
      start_lng: 38.7845,
      start_address: 'Bole Atlas Taxi Pickup'
    }
  });

  assert(startRideRes.status === 200, 'External ride started with status 200');
  assert(startRideRes.body.data.status === 'IN_TRANSIT', 'Request status transitioned to IN_TRANSIT');
  assert(startRideRes.body.data.external_status === 'IN_TRANSIT', 'external_status is IN_TRANSIT');
  assert(Boolean(startRideRes.body.data.external_start_time), 'Departure timestamp captured');

  // 5. Staff Ends Ride, Distance Auto-Calculated, Fare Entered
  console.log('\n--- 5. Staff Ends Ride, Distance Auto-Calculated & Submits Paid Fare ---');
  const endRideRes = await apiRequest('/dispatch/complete-external', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: {
      request_id: testReq.id,
      end_lat: 9.0150,
      end_lng: 38.7620,
      end_address: 'UNECA VIP Gate',
      fare_amount: 480.00,
      currency: 'ETB',
      receipt_notes: 'RIDE electronic receipt #882190'
    }
  });

  assert(endRideRes.status === 200, 'External ride completed with status 200');
  assert(endRideRes.body.data.request.status === 'COMPLETED', 'Request status transitioned to COMPLETED');
  assert(endRideRes.body.data.request.external_cost === 480.00, 'Fare cost recorded as 480 ETB');
  assert(endRideRes.body.data.request.external_distance_km > 0, `Travel distance calculated: ${endRideRes.body.data.request.external_distance_km} km`);
  assert(endRideRes.body.data.external_transport.provider_name === 'RIDE Transportation (Addis)', 'Ledger record created with correct provider');
  assert(endRideRes.body.data.external_transport.fare_amount === 480.00, 'Ledger fare amount recorded correctly');

  // 6. External Transports Ledger Isolation
  console.log('\n--- 6. Ledger Verification ---');
  const extRecord = store.external_transports.find(e => e.request_id === testReq.id);
  assert(Boolean(extRecord), 'Record exists in external_transports store');
  assert(extRecord.fare_amount === 480.00, 'Ledger fare amount verified');

  server.close();

  console.log('\n======================================================');
  console.log(`Results: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runExternalShiftsTests().catch(err => {
  console.error('Test execution error:', err);
  if (server) server.close();
  process.exit(1);
});
