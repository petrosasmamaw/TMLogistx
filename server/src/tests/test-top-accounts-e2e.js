/**
 * TMLogistx — Top-level QA accounts + full feature smoke test
 * Creates one account per role (System Admin delegates via existing admin login)
 * and exercises all major API capabilities in one run.
 */
import http from 'http';
import app from '../app.js';
import { getStore } from '../db/connection.js';

const PORT = 5620;
const PASSWORD = 'TopQA@2026';
const PROJECT_ID = 'proj-eth-a';
const COUNTRY_ID = 'cnt-ethiopia';

const QA_ACCOUNTS = {
  MASTER_PERSON: { email: 'qa.top.master@tmlogistx.com', full_name: 'QA Top Master Person' },
  LOGISTICS_COORDINATOR: { email: 'qa.top.logistics@tmlogistx.com', full_name: 'QA Top Logistics' },
  MOVEMENT_OFFICER: { email: 'qa.top.movement@tmlogistx.com', full_name: 'QA Top Movement' },
  STAFF: { email: 'qa.top.staff@tmlogistx.com', full_name: 'QA Top Staff' },
  DRIVER: { email: 'qa.top.driver@tmlogistx.com', full_name: 'QA Top Driver' }
};

let server;
let passed = 0;
let failed = 0;
const results = [];

function assert(condition, label) {
  if (condition) {
    passed++;
    results.push({ ok: true, label });
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    results.push({ ok: false, label });
    console.log(`  ❌ ${label}`);
  }
}

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        method,
        host: '127.0.0.1',
        port: PORT,
        path,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(email, password = PASSWORD) {
  const res = await request('POST', '/api/auth/login', { email, password });
  return res.body?.token || null;
}

async function run() {
  console.log('========================================================');
  console.log(' TMLogistx — Top QA Accounts + Full Feature Smoke Test');
  console.log('========================================================\n');

  server = app.listen(PORT);
  const store = getStore();

  // --- Health ---
  const health = await request('GET', '/api/health');
  assert(health.status === 200 && health.body?.status === 'online', 'Health check');

  const adminToken = await login('admin@tmlogistx.com', 'Password@123');
  assert(Boolean(adminToken), 'System Admin login (seed account)');

  // --- Create top QA accounts (skip if re-run in same process — use fresh node each time) ---
  console.log('\n--- Create top-level QA accounts (all roles) ---');
  const tokens = { SYSTEM_ADMIN: adminToken };

  for (const [role, meta] of Object.entries(QA_ACCOUNTS)) {
    const existing = store.users.find((u) => u.email === meta.email);
    if (!existing) {
      const createRes = await request(
        'POST',
        '/api/users',
        {
          email: meta.email,
          password: PASSWORD,
          full_name: meta.full_name,
          phone_number: '+251900000001',
          role,
          country_id: COUNTRY_ID,
          project_id: PROJECT_ID,
          language_preference: role === 'DRIVER' ? 'am' : 'en',
          license_number: 'QA-LIC-99999'
        },
        adminToken
      );
      assert(createRes.status === 201, `Create ${role} → ${meta.email}`);
    } else {
      assert(true, `Create ${role} (already exists in store) → ${meta.email}`);
    }
    tokens[role] = await login(meta.email, PASSWORD);
    assert(Boolean(tokens[role]), `Login ${role}`);
  }

  // --- Admin: countries & projects ---
  console.log('\n--- Platform structure ---');
  const countries = await request('GET', '/api/countries', null, adminToken);
  assert(countries.status === 200 && countries.body?.data?.length >= 2, 'List countries');

  const projects = await request('GET', '/api/projects', null, adminToken);
  assert(projects.status === 200 && projects.body?.data?.length >= 1, 'List projects');

  // --- Logistics: vehicle ---
  console.log('\n--- Fleet (Logistics) ---');
  const vehRes = await request(
    'POST',
    '/api/vehicles',
    {
      project_id: PROJECT_ID,
      plate_number: `QA-TOP-${Date.now().toString().slice(-6)}`,
      make: 'Toyota',
      model: 'QA Test Van',
      capacity: 6,
      fuel_type: 'Diesel',
      shift_type: 'ALL_HOURS'
    },
    tokens.LOGISTICS_COORDINATOR
  );
  const qaVehicleId = vehRes.body?.data?.id;
  assert(vehRes.status === 201 && qaVehicleId, 'Register QA vehicle');

  const vehicles = await request('GET', `/api/vehicles?project_id=${PROJECT_ID}`, null, tokens.LOGISTICS_COORDINATOR);
  assert(vehicles.status === 200, 'List vehicles');

  // --- Staff: movement requests ---
  console.log('\n--- Movement requests (Staff) ---');
  const officialReq = await request(
    'POST',
    '/api/requests',
    {
      project_id: PROJECT_ID,
      pickup_address: 'Bole Airport',
      pickup_lat: 8.9778,
      pickup_lng: 38.7993,
      destination_address: 'UNECA',
      destination_lat: 9.0163,
      destination_lng: 38.7636,
      passenger_count: 2,
      purpose: 'QA Official trip',
      trip_category: 'OFFICIAL'
    },
    tokens.STAFF
  );
  const officialRequestId = officialReq.body?.data?.id;
  assert(officialReq.status === 201 && officialRequestId, 'Staff creates OFFICIAL request');

  const personalReq = await request(
    'POST',
    '/api/requests',
    {
      project_id: PROJECT_ID,
      pickup_address: 'Home QA',
      pickup_lat: 9.03,
      pickup_lng: 38.75,
      destination_address: 'Mall QA',
      destination_lat: 9.01,
      destination_lng: 38.78,
      passenger_count: 1,
      purpose: 'QA Personal errand',
      trip_category: 'PERSONAL'
    },
    tokens.STAFF
  );
  const personalRequestId = personalReq.body?.data?.id;
  assert(personalReq.status === 201 && personalRequestId, 'Staff creates PERSONAL request');

  // --- Dispatch official trip ---
  console.log('\n--- Dispatch (Movement Officer) ---');
  const recs = await request('GET', `/api/dispatch/recommendations/${officialRequestId}`, null, tokens.MOVEMENT_OFFICER);
  assert(recs.status === 200 && Array.isArray(recs.body?.data), 'Dispatch recommendations (Workflow C)');

  const top = recs.body?.data?.find((r) => r.is_eligible) || recs.body?.data?.[0];
  const assignVehicleId = top?.vehicle?.id || store.vehicles.find((v) => v.project_id === PROJECT_ID && v.operational_status === 'AVAILABLE')?.id;
  const assignDriverId =
    top?.driver?.id ||
    store.drivers.find((d) => d.project_id === PROJECT_ID && d.availability_status === 'AVAILABLE')?.id;

  const assignRes = await request(
    'POST',
    '/api/dispatch/assign',
    {
      request_id: officialRequestId,
      vehicle_id: assignVehicleId,
      driver_id: assignDriverId,
      notes: 'QA top accounts assignment'
    },
    tokens.MOVEMENT_OFFICER
  );
  const assignmentId = assignRes.body?.data?.id;
  assert(assignRes.status === 201 && assignmentId, 'Assign vehicle & driver (Workflow C)');

  // --- Workflow D ---
  console.log('\n--- Driver trip pipeline (Workflow D) ---');
  const steps = ['ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED', 'PASSENGER_PICKED_UP', 'IN_TRANSIT', 'COMPLETED'];
  let driverToken = tokens.DRIVER;
  const driverUser = store.users.find((u) => u.email === QA_ACCOUNTS.DRIVER.email);
  const driverRecord = store.drivers.find((d) => d.user_id === driverUser?.id);
  if (driverRecord && assignRes.body?.data?.driver_id !== driverRecord.id) {
    const seedDriver = store.users.find((u) => u.role === 'DRIVER' && u.project_id === PROJECT_ID);
    if (seedDriver) {
      driverToken = await login(seedDriver.email, 'Password@123');
    }
  }

  for (const step of steps) {
    const body = step === 'COMPLETED' ? { status: step, actual_distance_km: 12.5 } : { status: step };
    const st = await request('PATCH', `/api/tracking/trip/${assignmentId}/status`, body, driverToken);
    assert(st.status === 200, `Workflow D → ${step}`);
  }

  // --- Personal trip: assign + complete for fuel recovery ---
  const recsP = await request('GET', `/api/dispatch/recommendations/${personalRequestId}`, null, tokens.MOVEMENT_OFFICER);
  const topP = recsP.body?.data?.find((r) => r.is_eligible) || recsP.body?.data?.[0];
  const v2 = topP?.vehicle?.id || assignVehicleId;
  const d2 = topP?.driver?.id || assignDriverId;
  const assignP = await request(
    'POST',
    '/api/dispatch/assign',
    { request_id: personalRequestId, vehicle_id: v2, driver_id: d2 },
    tokens.MOVEMENT_OFFICER
  );
  const assignPId = assignP.body?.data?.id;
  if (assignP.status === 201 && assignPId) {
    await request('PATCH', `/api/tracking/trip/${assignPId}/status`, { status: 'ACCEPTED' }, driverToken);
    await request('PATCH', `/api/tracking/trip/${assignPId}/status`, { status: 'COMPLETED', actual_distance_km: 20 }, driverToken);
    const recoveries = await request('GET', '/api/personal-fuel', null, adminToken);
    assert(recoveries.status === 200, 'Personal fuel recovery ledger (admin)');
  } else {
    assert(false, 'Assign PERSONAL trip for fuel recovery');
  }

  // --- GPS ---
  console.log('\n--- Telematics ---');
  const gps = await request(
    'POST',
    '/api/tracking/gps',
    { vehicle_id: qaVehicleId || assignVehicleId, latitude: 9.02, longitude: 38.76, speed: 40 },
    driverToken
  );
  assert(gps.status === 200, 'Driver GPS broadcast');

  const fleet = await request('GET', `/api/tracking/live-fleet?project_id=${PROJECT_ID}`, null, tokens.MOVEMENT_OFFICER);
  assert(fleet.status === 200, 'Live fleet map data');

  // --- Fuel log ---
  console.log('\n--- Driver fuel ---');
  const fuel = await request(
    'POST',
    '/api/fuel',
    {
      vehicle_id: qaVehicleId || assignVehicleId,
      liters: 45,
      cost: 3500,
      fuel_station: 'TotalEnergies',
      odometer_km: 125000,
      entry_mode: 'SINGLE_TRIP',
      notes: 'QA fuel log'
    },
    driverToken
  );
  assert(fuel.status === 201 || fuel.status === 200, 'Driver fuel log');

  // --- Accident ---
  console.log('\n--- Safety / accident ---');
  const acc = await request(
    'POST',
    '/api/accidents',
    {
      vehicle_id: qaVehicleId || assignVehicleId,
      description: 'QA minor bumper test incident',
      severity: 'MINOR',
      latitude: 9.01,
      longitude: 38.77,
      police_report_number: 'QA-POL-001'
    },
    driverToken
  );
  assert(acc.status === 201 || acc.status === 200, 'Record accident (vehicle → IN_ACCIDENT)');

  // --- Policies ---
  console.log('\n--- Policies ---');
  const polList = await request('GET', '/api/policies', null, adminToken);
  assert(polList.status === 200, 'List policies (admin)');

  // --- External Uber/RIDE ---
  console.log('\n--- External transport ---');
  const extReq = await request(
    'POST',
    '/api/requests',
    {
      project_id: PROJECT_ID,
      pickup_address: 'QA Ext Pickup',
      pickup_lat: 9.0,
      pickup_lng: 38.74,
      destination_address: 'QA Ext Dest',
      destination_lat: 9.02,
      destination_lng: 38.77,
      passenger_count: 1,
      trip_category: 'OFFICIAL'
    },
    tokens.STAFF
  );
  const extRequestId = extReq.body?.data?.id;
  if (extRequestId) {
    const uber = await request(
      'POST',
      '/api/dispatch/authorize-external',
      {
        request_id: extRequestId,
        provider: 'RIDE (8294)',
        driver_name: 'QA Taxi Driver',
        driver_phone: '+251911000000',
        plate_number: 'AA-QA-9999',
        vehicle_model: 'Toyota Vitz',
        booking_ref: 'QA-BOOK-001'
      },
      tokens.MOVEMENT_OFFICER
    );
    assert(uber.status === 200 || uber.status === 201, 'Coordinator Uber/RIDE dispatch');
  }

  // --- Reports ---
  console.log('\n--- Analytics / reports ---');
  const util = await request('GET', `/api/reports/vehicle-utilization?project_id=${PROJECT_ID}`, null, tokens.MASTER_PERSON);
  assert(util.status === 200, 'Master Person vehicle utilization report');

  // --- Master creates staff (RBAC) ---
  const masterStaffEmail = `qa.master.created.staff.${Date.now()}@tmlogistx.com`;
  const masterCreate = await request(
    'POST',
    '/api/users',
    {
      email: masterStaffEmail,
      password: PASSWORD,
      full_name: 'Staff Created By Master',
      role: 'STAFF',
      project_id: PROJECT_ID,
      country_id: COUNTRY_ID
    },
    tokens.MASTER_PERSON
  );
  assert(masterCreate.status === 201, 'Master Person can provision STAFF');

  console.log('\n========================================================');
  console.log(` RESULT: ${passed} passed, ${failed} failed`);
  console.log('========================================================');
  console.log('\n📋 QA TOP ACCOUNTS (password for all new QA users):');
  console.log(`   Password: ${PASSWORD}`);
  console.log('   Seed admin: admin@tmlogistx.com / Password@123');
  for (const [role, meta] of Object.entries(QA_ACCOUNTS)) {
    console.log(`   ${role}: ${meta.email}`);
  }
  console.log('========================================================\n');

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  if (server) server.close();
  process.exit(1);
});
