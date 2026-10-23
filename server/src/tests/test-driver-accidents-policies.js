import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { config } from '../config/index.js';
import { mockStore } from '../db/mockStore.js';

let server;
let port;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Generate auth headers for testing with valid JWT
function authHeader(user) {
  const token = jwt.sign(
    {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      projectId: user.project_id || 'proj-eth-a',
      project_id: user.project_id || 'proj-eth-a'
    },
    config.jwtSecret,
    { expiresIn: '2h' }
  );
  return {
    Authorization: `Bearer ${token}`
  };
}


async function runTests() {
  console.log('========================================================');
  console.log('🚀 RUNNING COMPREHENSIVE SUITE FOR 8 FLEET CAPABILITIES');
  console.log('========================================================');

  // Start temporary server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const driverUser = mockStore.users.find(u => u.role === 'DRIVER');
  const staffUser = mockStore.users.find(u => u.role === 'STAFF');
  const coordinatorUser = mockStore.users.find(u => u.role === 'LOGISTICS_COORDINATOR');
  const adminUser = mockStore.users.find(u => u.role === 'SYSTEM_ADMIN');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // TEST 1: Driver Fuel Consumption Recording (Per Trip & Multi-Day)
    // ---------------------------------------------------------
    console.log('\n[1] Testing Driver Fuel Consumption Recording:');
    const fuelRes1 = await request('POST', '/api/fuel/log', {
      vehicle_id: 'veh-01',
      entry_mode: 'PER_MOVEMENT',
      liters: 45.5,
      cost_amount: 3571.75,
      odometer_km: 12450,
      fuel_station: 'TotalEnergies Bole Hub',
      notes: 'Logged for airport shuttle movement'
    }, authHeader(driverUser));

    assert(fuelRes1.status === 201, 'Per-movement fuel logged successfully (HTTP 201)');
    assert(fuelRes1.body.data.liters === 45.5, 'Fuel liters recorded accurately (45.5L)');

    // Test Multi-day Bulk Fuel
    const fuelRes2 = await request('POST', '/api/fuel/log', {
      vehicle_id: 'veh-01',
      entry_mode: 'MULTI_DAY_BULK',
      bulk_days_count: 5,
      liters: 140,
      cost_amount: 10990,
      odometer_km: 13100,
      fuel_station: 'NOC Meskel Square',
      notes: 'Consolidated past 5 days fuel consumption'
    }, authHeader(driverUser));

    assert(fuelRes2.status === 201, 'Multi-day bulk fuel entry logged successfully');
    assert(fuelRes2.body.data.bulk_days_count === 5, 'Bulk days count (5 days) saved');

    // ---------------------------------------------------------
    // TEST 2: Driver Accident Recording & Automatic Vehicle Status Update
    // ---------------------------------------------------------
    console.log('\n[2] Testing Driver Accident Recording & Fleet Safety:');
    const accidentRes = await request('POST', '/api/accidents/report', {
      vehicle_id: 'veh-02',
      latitude: 9.0250,
      longitude: 38.7468,
      location_description: 'Ring Road near Gotera Interchange',
      severity: 'MODERATE',
      description: 'Rear bumper scratch from delivery motorcycle in rain',
      third_party_involved: true,
      police_report_number: 'PL-ADDIS-88219',
      estimated_damage_cost: 15000
    }, authHeader(driverUser));

    assert(accidentRes.status === 201, 'Accident recorded by driver (HTTP 201)');
    assert(accidentRes.body.data.severity === 'MODERATE', 'Accident severity captured');

    // Verify vehicle status became IN_ACCIDENT
    const vehCheck = await request('GET', '/api/vehicles/veh-02', null, authHeader(coordinatorUser));
    assert(vehCheck.body.data?.operational_status === 'IN_ACCIDENT', 'Vehicle operational status automatically set to IN_ACCIDENT');

    // ---------------------------------------------------------
    // TEST 3: Dynamic Fleet Shifts, Status Transitions & Project Reassignment
    // ---------------------------------------------------------
    console.log('\n[3] Testing Shift & Availability Control:');
    // Change shift to NIGHT_SHIFT
    const shiftRes = await request('PATCH', '/api/vehicles/veh-03', {
      shift_type: 'NIGHT_SHIFT',
      shift_start_time: '18:00',
      shift_end_time: '06:00',
      is_weekend_eligible: true
    }, authHeader(coordinatorUser));

    assert(shiftRes.status === 200, 'Coordinator changed vehicle shift to NIGHT_SHIFT');
    assert(shiftRes.body.data.shift_type === 'NIGHT_SHIFT', 'Vehicle shift updated in store');

    // Transition veh-02 to IN_REPAIR then AVAILABLE
    const repairRes = await request('PATCH', '/api/vehicles/veh-02', {
      operational_status: 'IN_REPAIR'
    }, authHeader(coordinatorUser));
    assert(repairRes.body.data.operational_status === 'IN_REPAIR', 'Vehicle status moved to IN_REPAIR');

    // Reassign project
    const projRes = await request('PATCH', '/api/vehicles/veh-03', {
      project_id: 'proj-eth-b'
    }, authHeader(coordinatorUser));
    assert(projRes.body.data.project_id === 'proj-eth-b', 'Vehicle reassigned to project proj-eth-b');

    // ---------------------------------------------------------
    // TEST 4: Staff "Car is Coming" Vehicle & Driver Card Data
    // ---------------------------------------------------------
    console.log('\n[4] Testing Staff "Car is Coming" Display Enrichment:');
    // Create official request
    const reqCreate = await request('POST', '/api/requests', {
      pickup_address: 'UN-ECA Compound, Addis Ababa',
      pickup_latitude: 9.0180,
      pickup_longitude: 38.7610,
      destination_address: 'Bole Medhanealem Church',
      destination_latitude: 8.9950,
      destination_longitude: 38.7880,
      passengers_count: 2,
      trip_category: 'OFFICIAL',
      purpose: 'Official Ministry of Health Meeting'
    }, authHeader(staffUser));

    const requestId = reqCreate.body.data.id;
    assert(reqCreate.status === 201, 'Staff created movement request');

    // Coordinator assigns veh-01 and driver
    const assignRes = await request('POST', '/api/dispatch/assign', {
      request_id: requestId,
      vehicle_id: 'veh-01',
      driver_id: driverUser.id,
      notes: 'Assigned for priority delegation'
    }, authHeader(coordinatorUser));

    assert(assignRes.status === 200 || assignRes.status === 201, 'Coordinator assigned vehicle and driver');

    // Check staff view of requests has vehicle & driver cards
    const staffReqs = await request('GET', '/api/requests?mine=true', null, authHeader(staffUser));
    const activeReq = staffReqs.body.data.find(r => r.id === requestId);
    assert(activeReq.assignment !== null, 'Assignment object exists for staff');
    assert(activeReq.assignment.vehicle.plate_number === 'ET-3-A12345', 'Staff app receives plate number (ET-3-A12345)');
    assert(activeReq.assignment.driver.full_name === driverUser.full_name, 'Staff app receives driver full name');

    // ---------------------------------------------------------
    // TEST 5: Reassignment & Cancellation Flexibility
    // ---------------------------------------------------------
    console.log('\n[5] Testing Reassignment & Cancellation:');
    // Coordinator reassigns to another vehicle (veh-04)
    const reassignRes = await request('POST', '/api/dispatch/reassign', {
      request_id: requestId,
      vehicle_id: 'veh-04',
      reason: 'Fleet optimization swap'
    }, authHeader(coordinatorUser));
    assert(reassignRes.status === 200, 'Coordinator reassigned vehicle to veh-04');

    // Coordinator cancels assignment completely
    const cancelAssignRes = await request('POST', '/api/dispatch/cancel-assignment', {
      request_id: requestId,
      reason: 'Meeting postponed'
    }, authHeader(coordinatorUser));
    assert(cancelAssignRes.status === 200, 'Coordinator cancelled trip assignment');
    const cancelledReqStatus = cancelAssignRes.body.data?.request?.status || cancelAssignRes.body.data?.status;
    assert(cancelledReqStatus === 'PENDING', 'Request status reverted to PENDING');

    // Staff cancels their own request
    const staffCancelRes = await request('PATCH', `/api/requests/${requestId}/cancel`, {
      reason: 'No longer needed'
    }, authHeader(staffUser));
    assert(staffCancelRes.status === 200, 'Staff cancelled own request on mobile');
    assert(staffCancelRes.body.data.status === 'CANCELLED', 'Request status set to CANCELLED');

    // ---------------------------------------------------------
    // TEST 6: Staff Personal Trip & Automatic Fuel Liability Recovery
    // ---------------------------------------------------------
    console.log('\n[6] Testing Staff Personal Trip & Fuel Debt Recovery:');
    const personalReq = await request('POST', '/api/requests', {
      pickup_address: 'Home Residence, Old Airport',
      pickup_latitude: 9.0010,
      pickup_longitude: 38.7400,
      destination_address: 'Century Mall, Gurd Shola',
      destination_latitude: 9.0200,
      destination_longitude: 38.8100,
      passengers_count: 1,
      trip_category: 'PERSONAL',
      purpose: 'Weekend family grocery run'
    }, authHeader(staffUser));

    const pReqId = personalReq.body.data.id;
    assert(personalReq.body.data.trip_category === 'PERSONAL', 'Trip categorized as PERSONAL');

    // Coordinator assigns veh-01
    await request('POST', '/api/dispatch/assign', {
      request_id: pReqId,
      vehicle_id: 'veh-01',
      driver_id: driverUser.id
    }, authHeader(coordinatorUser));

    // Simulate completion with 24 km traveled
    const completeRes = await request('POST', `/api/tracking/trip/${pReqId}/complete`, {
      actual_distance_km: 24.0,
      notes: 'Personal trip completed safely'
    }, authHeader(driverUser));

    assert(completeRes.status === 200, 'Personal trip marked as completed');

    // Verify liability ledger in personal_fuel_recoveries
    const recoveriesRes = await request('GET', '/api/personal-fuel', null, authHeader(adminUser));
    const recovery = recoveriesRes.body.data.find(r => r.request_id === pReqId);
    assert(recovery !== undefined, 'Fuel liability record generated for staff');
    assert(recovery.settlement_status === 'UNPAID', 'Settlement status is UNPAID');
    assert(Number(recovery.amount_billed_etb) > 0, `Fuel debt calculated: ${recovery.amount_billed_etb} ETB`);

    // Top Admin marks personal fuel debt as paid
    const markPaidRes = await request('PATCH', `/api/personal-fuel/${recovery.id}/mark-paid`, {
      payment_reference: 'FIN-CASH-REC-99412',
      notes: 'Paid at finance cashier'
    }, authHeader(adminUser));

    assert(markPaidRes.status === 200, 'Top Admin marked personal fuel debt as PAID');
    assert(markPaidRes.body.data.settlement_status === 'PAID', 'Settlement status updated to PAID');

    // ---------------------------------------------------------
    // TEST 7: Fleet Policies & Agreements Management
    // ---------------------------------------------------------
    console.log('\n[7] Testing Fleet Policies & Code of Conduct:');
    const policiesRes = await request('GET', '/api/policies', null, authHeader(adminUser));
    assert(policiesRes.status === 200, 'Policies retrieved');
    assert(policiesRes.body.data.length >= 3, 'Policies exist for DRIVER, STAFF, and LOGISTICS');

    // Update DRIVER policy
    const updatePolRes = await request('PUT', '/api/policies/DRIVER', {
      title: 'TMLogistx Professional Driver Safety & Care Policy 2026',
      content: '1. Drive safely and adhere strictly to city speed limits.\n2. Always take safe and paved approved corridors.\n3. Complete pre-trip inspection before moving.\n4. Record all fuel fills immediately.',
      version: '2.0',
      required_acceptance: true
    }, authHeader(adminUser));

    assert(updatePolRes.status === 200, 'Top Admin updated DRIVER policy to v2.0');

    // Driver accepts policy
    const acceptRes = await request('POST', '/api/policies/accept', {
      policy_id: updatePolRes.body.data.id || 'pol-driver-01',
      version: '2.0'
    }, authHeader(driverUser));

    assert(acceptRes.status === 200, 'Driver accepted updated safety policy');

    // ---------------------------------------------------------
    // TEST 8: Coordinator-Dispatched Uber / RIDE Workflow
    // ---------------------------------------------------------
    console.log('\n[8] Testing Coordinator-Dispatched Uber / RIDE:');
    const uberReq = await request('POST', '/api/requests', {
      pickup_address: 'Megenagna Square',
      pickup_latitude: 9.0200,
      pickup_longitude: 38.8000,
      destination_address: 'Bole Airport Cargo Terminal',
      destination_latitude: 8.9800,
      destination_longitude: 38.7900,
      passengers_count: 1,
      trip_category: 'OFFICIAL',
      purpose: 'Urgent customs document pickup'
    }, authHeader(staffUser));

    const uReqId = uberReq.body.data.id;

    // Coordinator books Uber / RIDE and dispatches details to staff
    const uberDispatchRes = await request('POST', '/api/dispatch/authorize-external', {
      request_id: uReqId,
      provider: 'RIDE (8294)',
      notes: 'Coordinator booked via dispatch call center',
      coordinator_booked: true,
      driver_name: 'Solomon Getachew',
      driver_phone: '+251 91 234 5678',
      plate_number: 'AA-2-C77219',
      vehicle_model: 'Toyota Yaris (Blue)',
      booking_ref: 'RIDE-88310'
    }, authHeader(coordinatorUser));

    assert(uberDispatchRes.status === 200, 'Coordinator dispatched external taxi to staff');
    assert(uberDispatchRes.body.data.external_driver_name === 'Solomon Getachew', 'Taxi driver name sent');
    assert(uberDispatchRes.body.data.external_vehicle_plate === 'AA-2-C77219', 'Taxi plate number sent');

    // Staff checks incoming taxi card
    const staffUberView = await request('GET', `/api/requests/${uReqId}`, null, authHeader(staffUser));
    assert(staffUberView.body.data.external_driver_phone === '+251 91 234 5678', 'Staff receives taxi driver phone number');

    console.log('\n========================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
