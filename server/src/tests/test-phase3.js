import http from 'http';
import app from '../app.js';
import { getStore } from '../db/connection.js';

let server;
const PORT = 5598; // Isolated test port

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

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('🧪 Starting TMLogistx Phase 3 Automated Test Suite');
  console.log('   (Fleet, Driver, Availability & Expense Engines)');
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
    // Step 0: Obtain JWT tokens for Logistics Coordinator and Staff
    console.log('\n--- 0. Authentication Setup ---');
    const coordLogin = await request(
      { method: 'POST', path: '/api/auth/login' },
      { email: 'logistics.a@tmlogistx.com', password: 'Password@123' }
    );
    assert(coordLogin.status === 200, 'Logistics Coordinator authenticated successfully');
    const coordToken = coordLogin.body.token;

    const staffLogin = await request(
      { method: 'POST', path: '/api/auth/login' },
      { email: 'staff1@tmlogistx.com', password: 'Password@123' }
    );
    assert(staffLogin.status === 200, 'Staff authenticated successfully');
    const staffToken = staffLogin.body.token;

    // Step 1: Vehicle Management
    console.log('\n--- 1. Fleet Vehicle Management ---');
    const listVehRes = await request({
      method: 'GET',
      path: '/api/vehicles',
      headers: { Authorization: `Bearer ${coordToken}` }
    });
    assert(listVehRes.status === 200, 'Logistics Coordinator can fetch fleet vehicles');
    assert(listVehRes.body.count >= 3, 'Fleet includes Project A vehicles (Toyota Prado, Hilux, HiAce)');
    const prado = listVehRes.body.data.find(v => v.plate_number === 'ET-3-A12345');
    assert(prado != null, 'Prado ET-3-A12345 retrieved with project metadata');

    // Register a new vehicle
    const newVehPlate = 'ET-3-E55667';
    const createVehRes = await request(
      {
        method: 'POST',
        path: '/api/vehicles',
        headers: { Authorization: `Bearer ${coordToken}` }
      },
      {
        plate_number: newVehPlate,
        make: 'Toyota',
        model: 'Hilux Double Cabin',
        year: 2024,
        capacity: 5,
        fuel_type: 'Diesel',
        odometer_km: 15200,
        project_id: 'proj-eth-a'
      }
    );
    assert(createVehRes.status === 201, 'Logistics Coordinator successfully registered new vehicle (201 Created)');
    assert(createVehRes.body.data.plate_number === newVehPlate, 'Vehicle plate number properly registered');
    const createdVehId = createVehRes.body.data.id;

    // Security check: Staff cannot register vehicles
    const staffVehRes = await request(
      {
        method: 'POST',
        path: '/api/vehicles',
        headers: { Authorization: `Bearer ${staffToken}` }
      },
      { plate_number: 'ET-3-ILLEGAL', make: 'Ford', model: 'Ranger' }
    );
    assert(staffVehRes.status === 403, 'Staff is blocked from registering vehicles (403 Forbidden)');

    // Duplicate plate prevention
    const dupPlateRes = await request(
      {
        method: 'POST',
        path: '/api/vehicles',
        headers: { Authorization: `Bearer ${coordToken}` }
      },
      { plate_number: newVehPlate, make: 'Toyota', model: 'Hilux' }
    );
    assert(dupPlateRes.status === 400, 'Duplicate plate number registration rejected (400 Bad Request)');

    // Update vehicle status
    const updateVehRes = await request(
      {
        method: 'PATCH',
        path: `/api/vehicles/${createdVehId}`,
        headers: { Authorization: `Bearer ${coordToken}` }
      },
      { operational_status: 'AVAILABLE', odometer_km: 15350 }
    );
    assert(updateVehRes.status === 200, 'Vehicle updated with operational status & odometer');
    assert(updateVehRes.body.data.odometer_km === 15350, 'Vehicle odometer correctly stored');

    // Step 2: Driver Management & Vehicle Binding
    console.log('\n--- 2. Driver Management & Vehicle Assignment ---');
    const listDriversRes = await request({
      method: 'GET',
      path: '/api/drivers',
      headers: { Authorization: `Bearer ${coordToken}` }
    });
    assert(listDriversRes.status === 200, 'Logistics Coordinator can fetch project drivers');
    assert(listDriversRes.body.count >= 2, 'Project A drivers retrieved (Abebe Bikila, Chala Dejene)');

    const targetDriver = listDriversRes.body.data[0];
    const bindVehRes = await request(
      {
        method: 'POST',
        path: `/api/drivers/${targetDriver.id}/assign-vehicle`,
        headers: { Authorization: `Bearer ${coordToken}` }
      },
      { vehicle_id: createdVehId }
    );
    assert(bindVehRes.status === 200, 'Vehicle successfully assigned to driver');
    assert(bindVehRes.body.data.assigned_vehicle_id === createdVehId, 'Driver assigned_vehicle_id updated');

    // Step 3: Scheduling & Conflict Prevention
    console.log('\n--- 3. Scheduling & Double-Booking Conflict Prevention ---');
    const now = Date.now();
    const startTime1 = new Date(now + 2 * 60 * 60 * 1000).toISOString();
    const endTime1 = new Date(now + 5 * 60 * 60 * 1000).toISOString();

    const scheduleRes1 = await request(
      {
        method: 'POST',
        path: '/api/schedules',
        headers: { Authorization: `Bearer ${coordToken}` }
      },
      {
        vehicle_id: createdVehId,
        driver_id: targetDriver.id,
        start_time: startTime1,
        end_time: endTime1,
        schedule_type: 'RESERVATION',
        notes: 'VIP Delegation field outreach visit'
      }
    );
    assert(scheduleRes1.status === 201, 'Schedule reservation created successfully');
    assert(scheduleRes1.body.data.status === 'CONFIRMED', 'Schedule status is CONFIRMED');

    // Overlapping schedule attempt (Double-Booking Conflict!)
    const overlapStartTime = new Date(now + 3 * 60 * 60 * 1000).toISOString();
    const overlapEndTime = new Date(now + 6 * 60 * 60 * 1000).toISOString();

    const conflictRes = await request(
      {
        method: 'POST',
        path: '/api/schedules',
        headers: { Authorization: `Bearer ${coordToken}` }
      },
      {
        vehicle_id: createdVehId,
        start_time: overlapStartTime,
        end_time: overlapEndTime,
        schedule_type: 'RESERVATION',
        notes: 'Conflicting booking'
      }
    );
    assert(conflictRes.status === 409, 'Overlapping schedule rejected with 409 Conflict (Double-Booking Prevented)');
    assert(conflictRes.body.conflicts.length > 0, 'Collision detector returned conflicting schedule details');

    // Check availability endpoint
    const availRes1 = await request({
      method: 'GET',
      path: `/api/schedules/check-availability?vehicle_id=${createdVehId}&start_time=${overlapStartTime}&end_time=${overlapEndTime}`,
      headers: { Authorization: `Bearer ${coordToken}` }
    });
    assert(availRes1.status === 200, 'Availability check endpoint returns 200');
    assert(availRes1.body.available === false, 'Availability check correctly reports vehicle is unavailable during conflict');

    const tomorrowStart = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    const tomorrowEnd = new Date(now + 27 * 60 * 60 * 1000).toISOString();
    const availRes2 = await request({
      method: 'GET',
      path: `/api/schedules/check-availability?vehicle_id=${createdVehId}&start_time=${tomorrowStart}&end_time=${tomorrowEnd}`,
      headers: { Authorization: `Bearer ${coordToken}` }
    });
    assert(availRes2.body.available === true, 'Availability check reports vehicle is free for unbooked window tomorrow');

    // Step 4: Expense & Fuel Tracking
    console.log('\n--- 4. Vehicle Expense & Fuel Tracking ---');
    const fuelExpenseRes = await request(
      {
        method: 'POST',
        path: '/api/expenses',
        headers: { Authorization: `Bearer ${coordToken}` }
      },
      {
        vehicle_id: createdVehId,
        expense_type: 'FUEL',
        amount: 5200.00,
        currency: 'ETB',
        odometer_reading: 15800.0,
        description: 'Full tank TotalEnergies Diesel at Bole Terminal',
        receipt_url: 'https://placehold.co/600x400/png?text=Fuel+Receipt+5200+ETB'
      }
    );
    assert(fuelExpenseRes.status === 201, 'Fuel expense logged successfully (201 Created)');
    assert(fuelExpenseRes.body.data.amount === 5200, 'Expense amount logged accurately');

    // Verify odometer was auto-synced on vehicle
    const checkVehRes = await request({
      method: 'GET',
      path: `/api/vehicles/${createdVehId}`,
      headers: { Authorization: `Bearer ${coordToken}` }
    });
    assert(checkVehRes.body.data.odometer_km === 15800, 'Vehicle odometer automatically synchronized from fuel slip');

    // Expense summary
    const summaryRes = await request({
      method: 'GET',
      path: '/api/expenses/summary',
      headers: { Authorization: `Bearer ${coordToken}` }
    });
    assert(summaryRes.status === 200, 'Expense summary calculated successfully');
    assert(summaryRes.body.data.totalSpent > 0, 'Total fleet spending accumulated');
    assert(summaryRes.body.data.byType.FUEL > 0, 'Fuel expense category calculated');

    // Security check: Staff cannot record fleet expenses
    const staffExpRes = await request(
      {
        method: 'POST',
        path: '/api/expenses',
        headers: { Authorization: `Bearer ${staffToken}` }
      },
      { vehicle_id: createdVehId, expense_type: 'FUEL', amount: 1000 }
    );
    assert(staffExpRes.status === 403, 'Staff is blocked from creating vehicle expenses (403 Forbidden)');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} PHASE 3 TESTS PASSED PERFECTLY!`);
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runPhase3Tests().catch(err => {
  console.error('Phase 3 test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
