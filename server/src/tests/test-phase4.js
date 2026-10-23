import http from 'http';
import app from '../app.js';
import { getStore } from '../db/connection.js';

let server;
const PORT = 5597; // Isolated test port

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

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('🧪 Starting TMLogistx Phase 4 Automated Test Suite');
  console.log('   (Movement Requests & Intelligent Dispatch Engine)');
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
    // Step 0: Authenticate Staff and Movement Officer
    console.log('\n--- 0. Authentication Setup ---');
    const staffLogin = await request(
      { method: 'POST', path: '/api/auth/login' },
      { email: 'staff1@tmlogistx.com', password: 'Password@123' }
    );
    assert(staffLogin.status === 200, 'Staff authenticated successfully');
    const staffToken = staffLogin.body.token;

    const officerLogin = await request(
      { method: 'POST', path: '/api/auth/login' },
      { email: 'movement.a@tmlogistx.com', password: 'Password@123' }
    );
    assert(officerLogin.status === 200, 'Movement Officer authenticated successfully');
    const officerToken = officerLogin.body.token;

    // Step 1: Workflow B - Staff Movement Request Submission
    console.log('\n--- 1. Workflow B: Staff Movement Request Creation ---');
    const createReqRes = await request(
      {
        method: 'POST',
        path: '/api/requests',
        headers: { Authorization: `Bearer ${staffToken}` }
      },
      {
        pickup_address: 'Bole Medhanealem, Addis Ababa',
        pickup_lat: 8.9950,
        pickup_lng: 38.7880,
        destination_address: 'Tikur Anbessa Hospital, Churchill Ave',
        destination_lat: 9.0182,
        destination_lng: 38.7494,
        requested_datetime: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
        passenger_count: 2,
        purpose: 'Transport emergency surgical team and diagnostic kits',
        special_instructions: 'Fragile equipment; please arrive at Gate 3'
      }
    );

    assert(createReqRes.status === 201, 'Movement request created successfully (201 Created)');
    assert(createReqRes.body.data.request_code.startsWith('REQ-'), 'Unique sequential request code generated');
    assert(createReqRes.body.data.status === 'PENDING', 'Initial request status is PENDING');
    const requestId = createReqRes.body.data.id;

    // Verify staff view requests
    const staffListRes = await request({
      method: 'GET',
      path: '/api/requests',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert(staffListRes.status === 200, 'Staff can view their submitted requests');
    assert(staffListRes.body.data.some(r => r.id === requestId), 'Created request present in staff inbox');

    // Step 2: Workflow C - Intelligent Vehicle Recommendation Algorithm
    console.log('\n--- 2. Workflow C: Intelligent Dispatch Recommendations ---');
    const recsRes = await request({
      method: 'GET',
      path: `/api/dispatch/recommendations/${requestId}`,
      headers: { Authorization: `Bearer ${officerToken}` }
    });

    assert(recsRes.status === 200, 'Movement Officer received vehicle dispatch recommendations');
    assert(recsRes.body.recommendations.length > 0, 'Candidate fleet vehicles evaluated');
    
    const topRec = recsRes.body.recommendations[0];
    assert(topRec.eligibility.is_eligible === true, 'Top recommended vehicle passed all eligibility checks');
    assert(topRec.routing.distance_to_pickup_km > 0, 'Distance to pickup calculated in kilometers');
    assert(topRec.routing.estimated_driving_duration_mins > 0, 'Driving time to pickup calculated in minutes');
    assert(topRec.driver != null, 'Assigned/available driver matched with candidate vehicle');

    const selectedVehicleId = topRec.vehicle.id;
    const selectedDriverId = topRec.driver.id;

    // Step 3: Workflow C - Atomic Vehicle Assignment
    console.log('\n--- 3. Workflow C: Atomic Vehicle & Driver Assignment ---');
    const assignRes = await request(
      {
        method: 'POST',
        path: '/api/dispatch/assign',
        headers: { Authorization: `Bearer ${officerToken}` }
      },
      {
        request_id: requestId,
        vehicle_id: selectedVehicleId,
        driver_id: selectedDriverId,
        notes: 'Priority medical transit assigned to team'
      }
    );

    assert(assignRes.status === 201, 'Trip assignment executed successfully (201 Created)');
    assert(assignRes.body.data.status === 'ASSIGNED', 'Assignment status is ASSIGNED');
    assert(assignRes.body.data.estimated_pickup_time != null, 'Estimated pickup time stamped on assignment');
    const assignmentId = assignRes.body.data.id;

    // Verify atomic status changes across tables
    const store = getStore();
    const updatedReq = store.movement_requests.find(r => r.id === requestId);
    const updatedVeh = store.vehicles.find(v => v.id === selectedVehicleId);
    const updatedDrv = store.drivers.find(d => d.id === selectedDriverId);

    assert(updatedReq.status === 'ASSIGNED', 'Request status transitioned to ASSIGNED');
    assert(updatedVeh.operational_status === 'BUSY', 'Vehicle operational status transitioned to BUSY');
    assert(updatedDrv.availability_status === 'ON_TRIP', 'Driver availability status transitioned to ON_TRIP');

    // Double-booking check: attempting to assign this same busy vehicle to another request
    const doubleBookReq = await request(
      {
        method: 'POST',
        path: '/api/dispatch/assign',
        headers: { Authorization: `Bearer ${officerToken}` }
      },
      {
        request_id: 'req-01',
        vehicle_id: selectedVehicleId, // Currently BUSY!
        driver_id: selectedDriverId
      }
    );
    assert(doubleBookReq.status === 409, 'Double-booking blocked with 409 Conflict when vehicle is already BUSY');

    // Step 4: Workflow E - External Transport Recording (Uber/RIDE alternative)
    console.log('\n--- 4. Workflow E: External Alternative Transport Recording ---');
    const extReq = await request(
      {
        method: 'POST',
        path: '/api/requests',
        headers: { Authorization: `Bearer ${staffToken}` }
      },
      {
        pickup_address: 'Bole Bulbula Zone 2',
        pickup_lat: 8.9720,
        pickup_lng: 38.7750,
        destination_address: 'Gelan Industrial Park',
        destination_lat: 8.8850,
        destination_lng: 38.8320,
        requested_datetime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        passenger_count: 1,
        purpose: 'Inspect remote warehouse shipment'
      }
    );
    const extRequestId = extReq.body.data.id;

    const externalDispatchRes = await request(
      {
        method: 'POST',
        path: '/api/dispatch/external',
        headers: { Authorization: `Bearer ${officerToken}` }
      },
      {
        request_id: extRequestId,
        provider_name: 'RIDE Transportation (Addis)',
        fare_amount: 850.00,
        currency: 'ETB',
        reason: 'Internal fleet fully committed to medical outreach mission',
        receipt_url: 'https://placehold.co/600x400/png?text=RIDE+Receipt+850+ETB',
        notes: 'Pre-approved urgent transport'
      }
    );

    assert(externalDispatchRes.status === 201, 'External transport recorded successfully (201 Created)');
    assert(externalDispatchRes.body.data.provider_name === 'RIDE Transportation (Addis)', 'Provider name logged');
    assert(externalDispatchRes.body.data.fare_amount === 850.00, 'Fare amount logged');

    const completedExtReq = store.movement_requests.find(r => r.id === extRequestId);
    assert(completedExtReq.status === 'COMPLETED', 'Request resolved and marked COMPLETED via external dispatch');

    // Step 5: Workflow F - Chained Trip Reassignment
    console.log('\n--- 5. Workflow F: Incident Reassignment ---');
    // Find an available vehicle to reassign to
    const freeVehicle = store.vehicles.find(v => v.operational_status === 'AVAILABLE');
    const freeDriver = store.drivers.find(d => d.availability_status === 'AVAILABLE');

    if (freeVehicle && freeDriver) {
      const reassignRes = await request(
        {
          method: 'POST',
          path: '/api/dispatch/reassign',
          headers: { Authorization: `Bearer ${officerToken}` }
        },
        {
          assignment_id: assignmentId,
          new_vehicle_id: freeVehicle.id,
          new_driver_id: freeDriver.id,
          reason: 'Initial vehicle developed mechanical fault before departure'
        }
      );

      assert(reassignRes.status === 200, 'Trip successfully reassigned to new vehicle and driver');
      assert(reassignRes.body.data.vehicle_id === freeVehicle.id, 'Assignment updated with new vehicle ID');

      // Verify old vehicle was freed back to AVAILABLE
      assert(updatedVeh.operational_status === 'AVAILABLE', 'Previous broken-down vehicle released to AVAILABLE/MAINTENANCE');
    }

    // Step 6: Security Role Guards
    console.log('\n--- 6. Security Role Enforcement ---');
    const staffIllegalDispatch = await request(
      {
        method: 'POST',
        path: '/api/dispatch/assign',
        headers: { Authorization: `Bearer ${staffToken}` }
      },
      { request_id: requestId, vehicle_id: selectedVehicleId, driver_id: selectedDriverId }
    );
    assert(staffIllegalDispatch.status === 403, 'Staff is blocked from assigning vehicles (403 Forbidden)');

    const staffIllegalExternal = await request(
      {
        method: 'POST',
        path: '/api/dispatch/external',
        headers: { Authorization: `Bearer ${staffToken}` }
      },
      { request_id: requestId, provider_name: 'Uber', fare_amount: 500, reason: 'test' }
    );
    assert(staffIllegalExternal.status === 403, 'Staff is blocked from arranging external transport (403 Forbidden)');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} PHASE 4 TESTS PASSED PERFECTLY!`);
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runPhase4Tests().catch(err => {
  console.error('Phase 4 test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
