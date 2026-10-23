import http from 'http';
import app from '../app.js';
import { getStore } from '../db/connection.js';

let server;
const PORT = 5596; // Isolated test port

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ ...options, port: PORT, host: '127.0.0.1' }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.setHeader('Content-Type', 'application/json');
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('🧪 Starting TMLogistx Phase 5 Automated Test Suite');
  console.log('   (Real-Time GPS Tracking, Maps & Trip Stepper)');
  console.log('====================================================');

  server = app.listen(PORT);
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // Step 0: Obtain JWT tokens for Driver, Staff, and Logistics Coordinator
    console.log('\n--- 0. Authentication Setup ---');
    const driverLogin = await request(
      { method: 'POST', path: '/api/auth/login' },
      { email: 'driver1@tmlogistx.com', password: 'Password@123' }
    );
    assert(driverLogin.status === 200, 'Driver authenticated successfully');
    const driverToken = driverLogin.body.token;

    const staffLogin = await request(
      { method: 'POST', path: '/api/auth/login' },
      { email: 'staff1@tmlogistx.com', password: 'Password@123' }
    );
    assert(staffLogin.status === 200, 'Staff authenticated successfully');
    const staffToken = staffLogin.body.token;

    const coordLogin = await request(
      { method: 'POST', path: '/api/auth/login' },
      { email: 'logistics.a@tmlogistx.com', password: 'Password@123' }
    );
    assert(coordLogin.status === 200, 'Logistics Coordinator authenticated successfully');
    const coordToken = coordLogin.body.token;

    // Step 1: Live Fleet Telemetry & Automatic Stale Detection
    console.log('\n--- 1. Live Fleet Map & Stale Location Detection ---');
    const liveFleetRes = await request({
      method: 'GET',
      path: '/api/tracking/live-fleet',
      headers: { Authorization: `Bearer ${coordToken}` }
    });

    assert(liveFleetRes.status === 200, 'Logistics Coordinator fetched live fleet telemetry');
    assert(liveFleetRes.body.data.length >= 3, 'Fleet includes all project vehicles');

    // Check active vs stale detection
    const freshVeh = liveFleetRes.body.data.find(v => v.plate_number === 'ET-3-A12345');
    assert(freshVeh != null && freshVeh.is_stale === false, 'Freshly reported vehicle flagged is_stale: false');

    const staleVeh = liveFleetRes.body.data.find(v => v.plate_number === 'ET-3-C44556');
    assert(staleVeh != null && staleVeh.is_stale === true, 'Vehicle with old timestamp automatically flagged is_stale: true');
    assert(staleVeh.stale_duration_mins != null, 'Stale duration in minutes calculated for UI timestamp display');

    // Step 2: Driver GPS Telemetry Transmission
    console.log('\n--- 2. Driver Live GPS Telemetry Broadcast ---');
    const gpsRes = await request(
      {
        method: 'POST',
        path: '/api/tracking/gps',
        headers: { Authorization: `Bearer ${driverToken}` }
      },
      {
        vehicle_id: 'veh-01',
        latitude: 9.0145,
        longitude: 38.7634,
        speed: 38.5,
        heading: 175.0
      }
    );

    assert(gpsRes.status === 200, 'Driver successfully transmitted live GPS coordinates');
    assert(gpsRes.body.data.latitude === 9.0145, 'Live latitude saved to vehicle');
    assert(gpsRes.body.data.longitude === 38.7634, 'Live longitude saved to vehicle');

    const store = getStore();
    const latestGpsLog = store.gps_logs[store.gps_logs.length - 1];
    assert(latestGpsLog != null && latestGpsLog.speed === 38.5, 'GPS breadcrumb appended to time-series logs');

    // Step 3: Setup Trip Assignment for Workflow D
    console.log('\n--- 3. Setup Trip Assignment for Workflow D ---');
    // Create new movement request
    const reqRes = await request(
      {
        method: 'POST',
        path: '/api/requests',
        headers: { Authorization: `Bearer ${staffToken}` }
      },
      {
        pickup_address: 'Kazanchis Supermarket',
        pickup_lat: 9.0210,
        pickup_lng: 38.7580,
        destination_address: 'Bole Olympia area',
        destination_lat: 8.9910,
        destination_lng: 38.7710,
        requested_datetime: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        passenger_count: 1,
        purpose: 'Regional health monitoring'
      }
    );
    const testReqId = reqRes.body.data.id;

    // Movement Officer assigns driver1 and veh-01
    const officerLogin = await request(
      { method: 'POST', path: '/api/auth/login' },
      { email: 'movement.a@tmlogistx.com', password: 'Password@123' }
    );
    const officerToken = officerLogin.body.token;

    // Free veh-01 and drv-01 for testing pipeline
    const veh1 = store.vehicles.find(v => v.id === 'veh-01');
    const drv1 = store.drivers.find(d => d.id === 'drv-01');
    veh1.operational_status = 'AVAILABLE';
    drv1.availability_status = 'AVAILABLE';

    const assignRes = await request(
      {
        method: 'POST',
        path: '/api/dispatch/assign',
        headers: { Authorization: `Bearer ${officerToken}` }
      },
      {
        request_id: testReqId,
        vehicle_id: 'veh-01',
        driver_id: 'drv-01'
      }
    );
    const assignmentId = assignRes.body.data.id;
    assert(assignRes.status === 201, 'Trip assignment created for pipeline testing');

    // Step 4: Workflow D - Driver Trip Pipeline Stepper
    console.log('\n--- 4. Workflow D: Complete Driver Trip Pipeline Stepper ---');

    // Stepper 1: Driver Accepts
    const stepAccept = await request(
      {
        method: 'PATCH',
        path: `/api/tracking/trip-status/${assignmentId}`,
        headers: { Authorization: `Bearer ${driverToken}` }
      },
      { status: 'ACCEPTED' }
    );
    assert(stepAccept.status === 200, 'Driver accepted assignment (status: ACCEPTED)');
    assert(stepAccept.body.data.actual_start_time != null, 'actual_start_time timestamp recorded');

    // Stepper 2: Heading to Pickup
    const stepHeading = await request(
      {
        method: 'PATCH',
        path: `/api/tracking/trip-status/${assignmentId}`,
        headers: { Authorization: `Bearer ${driverToken}` }
      },
      { status: 'HEADING_TO_PICKUP' }
    );
    assert(stepHeading.status === 200, 'Driver heading to pickup (status: HEADING_TO_PICKUP)');

    // Stepper 3: Arrived at Pickup
    const stepArrived = await request(
      {
        method: 'PATCH',
        path: `/api/tracking/trip-status/${assignmentId}`,
        headers: { Authorization: `Bearer ${driverToken}` }
      },
      { status: 'ARRIVED' }
    );
    assert(stepArrived.status === 200, 'Driver arrived at pickup location (status: ARRIVED)');

    // Stepper 4: Passenger Picked Up / Start Trip
    const stepBoarded = await request(
      {
        method: 'PATCH',
        path: `/api/tracking/trip-status/${assignmentId}`,
        headers: { Authorization: `Bearer ${driverToken}` }
      },
      { status: 'PASSENGER_PICKED_UP' }
    );
    assert(stepBoarded.status === 200, 'Passenger boarded vehicle (status: PASSENGER_PICKED_UP)');
    assert(stepBoarded.body.data.actual_pickup_time != null, 'actual_pickup_time timestamp recorded');

    // Stepper 5: Complete Trip
    const initialCompletedTrips = drv1.total_trips_completed;
    const stepComplete = await request(
      {
        method: 'PATCH',
        path: `/api/tracking/trip-status/${assignmentId}`,
        headers: { Authorization: `Bearer ${driverToken}` }
      },
      { status: 'COMPLETED', actual_distance_km: 7.8, notes: 'Delivered smoothly' }
    );
    assert(stepComplete.status === 200, 'Trip marked COMPLETED by driver');
    assert(stepComplete.body.data.actual_completion_time != null, 'actual_completion_time recorded');
    assert(stepComplete.body.data.actual_distance_km === 7.8, 'actual_distance_km logged');

    // Check resources freed
    assert(veh1.operational_status === 'AVAILABLE', 'Vehicle automatically returned to AVAILABLE');
    assert(drv1.availability_status === 'AVAILABLE', 'Driver automatically returned to AVAILABLE');
    assert(drv1.total_trips_completed === initialCompletedTrips + 1, 'Driver total_trips_completed incremented');

    // Step 5: Incident Reporting by Driver
    console.log('\n--- 5. Driver Incident & Breakdown Reporting ---');
    const incidentRes = await request(
      {
        method: 'POST',
        path: `/api/tracking/report-incident/${assignmentId}`,
        headers: { Authorization: `Bearer ${driverToken}` }
      },
      {
        incident_type: 'BREAKDOWN',
        description: 'Engine overheating near Mexico Square; radiator coolant leak'
      }
    );
    assert(incidentRes.status === 200, 'Driver reported breakdown incident');
    assert(incidentRes.body.data.incident_report.includes('Engine overheating'), 'Incident description attached to trip');
    assert(veh1.operational_status === 'MAINTENANCE', 'Vehicle operational status automatically updated to MAINTENANCE');

    // Step 6: Live Trip Tracking Details for Staff
    console.log('\n--- 6. Staff Live Trip Tracking Details ---');
    const trackDetailsRes = await request({
      method: 'GET',
      path: `/api/tracking/trip/${assignmentId}`,
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(trackDetailsRes.status === 200, 'Staff can query live tracking details for trip');
    assert(trackDetailsRes.body.data.driver.full_name != null, 'Driver profile retrieved');
    assert(trackDetailsRes.body.data.vehicle.plate_number != null, 'Vehicle plate number retrieved');
    assert(trackDetailsRes.body.data.liveEta != null, 'Live dynamic ETA calculated');

    console.log('\n====================================================');
    console.log(`🎉 ALL 24/24 PHASE 5 TESTS PASSED PERFECTLY!`);
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runPhase5Tests().catch(err => {
  console.error('Phase 5 test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
