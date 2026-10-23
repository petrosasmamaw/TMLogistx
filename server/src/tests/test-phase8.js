// Comprehensive Phase 8 Verification Test: Operational Analytics & Reporting Engine
import http from 'http';
import app from '../app.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

function generateToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
}

let server;
let port;
let baseUrl;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✕ [FAIL] ${message}`);
    failed++;
  }
}

async function request(path, options = {}) {
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

async function runPhase8Tests() {
  console.log('\n======================================================');
  console.log('    TMLOGISTX PHASE 8: OPERATIONAL REPORTING TESTS    ');
  console.log('======================================================\n');

  // Start temporary test server
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      console.log(`Test server running at ${baseUrl}`);
      resolve();
    });
  });

  // Setup test tokens for different roles
  const adminToken = generateToken({
    userId: 'user-admin-01',
    email: 'admin@tmlogistx.com',
    role: 'SYSTEM_ADMIN'
  });

  const coordEthToken = generateToken({
    userId: 'user-coord-eth-01',
    email: 'coord.eth@tmlogistx.com',
    role: 'LOGISTICS_COORDINATOR',
    projectId: 'proj-eth-a'
  });

  const driverToken = generateToken({
    userId: 'user-drv-01',
    email: 'driver.abebe@tmlogistx.com',
    role: 'DRIVER',
    projectId: 'proj-eth-01'
  });

  // 1. RBAC Security Tests
  console.log('--- 1. RBAC Access Control on Reports ---');
  const unauthRes = await request('/reports/vehicle-utilization');
  assert(unauthRes.status === 401, 'Unauthenticated request blocked with 401 Unauthorized');

  const driverRes = await request('/reports/vehicle-utilization', {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  assert(driverRes.status === 403, 'Driver access to management reports blocked with 403 Forbidden');

  // 2. Vehicle Utilization Report
  console.log('\n--- 2. Vehicle Utilization & Operating Cost Report ---');
  const utilRes = await request('/reports/vehicle-utilization', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(utilRes.status === 200, 'Admin successfully fetched Vehicle Utilization Report');
  assert(utilRes.body.report_type === 'VEHICLE_UTILIZATION', 'Report type is VEHICLE_UTILIZATION');
  assert(Array.isArray(utilRes.body.vehicles) && utilRes.body.vehicles.length > 0, 'Report contains vehicles list');
  const sampleVeh = utilRes.body.vehicles[0];
  assert(sampleVeh.plate_number && sampleVeh.make_model, 'Vehicle has plate and make/model: ' + sampleVeh.plate_number);
  assert(typeof sampleVeh.trips_completed === 'number', 'Vehicle tracks completed trips count');
  assert(typeof sampleVeh.total_km_traveled === 'number', 'Vehicle tracks total km traveled');
  assert(typeof sampleVeh.cost_per_km === 'number', 'Vehicle calculates cost per km metric');
  assert(utilRes.body.summary && utilRes.body.summary.total_vehicles > 0, 'Summary aggregates total fleet count');

  // Project-Scoped Vehicle Utilization
  const scopedUtilRes = await request('/reports/vehicle-utilization', {
    headers: { Authorization: `Bearer ${coordEthToken}` }
  });
  assert(scopedUtilRes.status === 200, 'Coordinator fetched scoped vehicle utilization');
  assert(scopedUtilRes.body.vehicles.length > 0, 'Scoped vehicles list populated');

  // 3. Driver Performance Report
  console.log('\n--- 3. Driver Performance & Dispatch Metrics Report ---');
  const drvPerfRes = await request('/reports/driver-performance', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(drvPerfRes.status === 200, 'Admin successfully fetched Driver Performance Report');
  assert(drvPerfRes.body.report_type === 'DRIVER_PERFORMANCE', 'Report type is DRIVER_PERFORMANCE');
  assert(Array.isArray(drvPerfRes.body.drivers) && drvPerfRes.body.drivers.length > 0, 'Drivers roster list present');
  const sampleDrv = drvPerfRes.body.drivers[0];
  assert(sampleDrv.driver_name && sampleDrv.email, 'Driver record has name and email: ' + sampleDrv.driver_name);
  assert(typeof sampleDrv.acceptance_rate_pct === 'number', 'Driver tracks acceptance rate percentage');
  assert(typeof sampleDrv.on_time_rate_pct === 'number', 'Driver tracks on-time rate percentage');
  assert(typeof sampleDrv.total_km_driven === 'number', 'Driver tracks total km driven');

  // 4. Staff Movement Report
  console.log('\n--- 4. Staff Movement & Corridors Report ---');
  const staffMoveRes = await request('/reports/staff-movement', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(staffMoveRes.status === 200, 'Admin successfully fetched Staff Movement Report');
  assert(staffMoveRes.body.report_type === 'STAFF_MOVEMENT', 'Report type is STAFF_MOVEMENT');
  assert(staffMoveRes.body.summary.total_requests >= 0, 'Staff movement summary aggregates total requests');
  assert(typeof staffMoveRes.body.summary.fulfillment_rate_pct === 'number', 'Calculates request fulfillment rate %');
  assert(Array.isArray(staffMoveRes.body.popular_corridors), 'Includes popular transit corridors analysis');

  // 5. External Transport Report (Workflow E)
  console.log('\n--- 5. External Transport & Voucher Report (Workflow E) ---');
  const extRes = await request('/reports/external-transport', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(extRes.status === 200, 'Admin successfully fetched External Transport Report');
  assert(extRes.body.report_type === 'EXTERNAL_TRANSPORT', 'Report type is EXTERNAL_TRANSPORT');
  assert(extRes.body.summary.total_external_trips > 0, 'Aggregates external transport trips dispatched');
  assert(extRes.body.summary.expenditure_by_currency, 'Breakdown of expenditure by currency (ETB/KES/USD)');

  // 6. Report Export (CSV Spreadsheets)
  console.log('\n--- 6. Dynamic CSV Spreadsheet Report Export ---');
  const csvVehRes = await request('/reports/export?type=vehicle_utilization&format=csv', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(csvVehRes.status === 200, 'Vehicle utilization CSV export status 200');
  assert(csvVehRes.headers.get('content-type').includes('text/csv'), 'Content-Type is text/csv');
  assert(csvVehRes.headers.get('content-disposition').includes('attachment'), 'Content-Disposition attachment set');
  assert(csvVehRes.body.includes('Plate Number') && csvVehRes.body.includes('Make'), 'CSV contains proper vehicle header row');

  const csvMoveRes = await request('/reports/export?type=staff_movement&format=csv', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(csvMoveRes.status === 200, 'Staff movement CSV export status 200');
  assert(csvMoveRes.headers.get('content-type').includes('text/csv'), 'Content-Type is text/csv');
  assert(csvMoveRes.body.includes('Request Number') && csvMoveRes.body.includes('Pickup Location'), 'CSV contains proper staff movement header row');

  // Close test server
  server.close();

  console.log('\n======================================================');
  console.log(`  PHASE 8 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8Tests().catch(err => {
  console.error('Test execution error:', err);
  if (server) server.close();
  process.exit(1);
});
