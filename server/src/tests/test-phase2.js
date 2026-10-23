import http from 'http';
import app from '../app.js';
import { getStore } from '../db/connection.js';

let server;
const PORT = 5599; // Isolated test port

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

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('🧪 Starting TMLogistx Phase 2 Automated Test Suite');
  console.log('   (Centralized API, Multi-Role Auth, RBAC & Isolation)');
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
    // Test 1: Health Check
    console.log('\n--- 1. API Health Check ---');
    const healthRes = await request({ method: 'GET', path: '/api/health' });
    assert(healthRes.status === 200, 'Health endpoint responds with 200 OK');
    assert(healthRes.body.status === 'online', 'Health status is online');
    assert(healthRes.body.rolesSupported.length === 6, 'All 6 user roles registered in health check');

    // Test 2: Multi-Role Authentication
    console.log('\n--- 2. Multi-Role Authentication & JWT Issuance ---');
    const rolesToTest = [
      { role: 'SYSTEM_ADMIN', email: 'admin@tmlogistx.com' },
      { role: 'MASTER_PERSON', email: 'master.a@tmlogistx.com' },
      { role: 'LOGISTICS_COORDINATOR', email: 'logistics.a@tmlogistx.com' },
      { role: 'MOVEMENT_OFFICER', email: 'movement.a@tmlogistx.com' },
      { role: 'STAFF', email: 'staff1@tmlogistx.com' },
      { role: 'DRIVER', email: 'driver1@tmlogistx.com' }
    ];

    const tokens = {};

    for (const item of rolesToTest) {
      const loginRes = await request(
        { method: 'POST', path: '/api/auth/login' },
        { email: item.email, password: 'Password@123' }
      );
      assert(loginRes.status === 200, `Login successful for ${item.role} (${item.email})`);
      assert(loginRes.body.token != null, `JWT token generated for ${item.role}`);
      assert(loginRes.body.user.role === item.role, `Token payload role matches ${item.role}`);
      tokens[item.role] = loginRes.body.token;
    }

    // Test 3: Invalid credentials
    console.log('\n--- 3. Invalid Credentials Handling ---');
    const failRes = await request(
      { method: 'POST', path: '/api/auth/login' },
      { email: 'admin@tmlogistx.com', password: 'WrongPassword' }
    );
    assert(failRes.status === 401, 'Invalid password returns 401 Unauthorized');

    // Test 4: Profile & Scope Retrieval
    console.log('\n--- 4. Profile & Scope Retrieval (/api/auth/me) ---');
    const meRes = await request({
      method: 'GET',
      path: '/api/auth/me',
      headers: { Authorization: `Bearer ${tokens['MASTER_PERSON']}` }
    });
    assert(meRes.status === 200, 'Master Person can fetch profile with JWT');
    assert(meRes.body.user.project != null, 'Master Person profile includes assigned project metadata');
    assert(meRes.body.user.authorizedProjects.length >= 1, 'Master Person profile lists authorized project scope');

    // Test 5: RBAC Authorization Guards
    console.log('\n--- 5. RBAC Authorization & Security Guards ---');
    // Staff attempting to create country -> Forbidden (403)
    const staffCountryRes = await request(
      {
        method: 'POST',
        path: '/api/countries',
        headers: { Authorization: `Bearer ${tokens['STAFF']}` }
      },
      { name: 'Djibouti', code: 'DJ' }
    );
    assert(staffCountryRes.status === 403, 'Staff is blocked with 403 Forbidden from creating countries');

    // Master Person attempting to create country -> Forbidden (403)
    const masterCountryRes = await request(
      {
        method: 'POST',
        path: '/api/countries',
        headers: { Authorization: `Bearer ${tokens['MASTER_PERSON']}` }
      },
      { name: 'Djibouti', code: 'DJ' }
    );
    assert(masterCountryRes.status === 403, 'Master Person is blocked with 403 Forbidden from creating countries');

    // System Admin creating a country -> Success (201)
    const adminCountryRes = await request(
      {
        method: 'POST',
        path: '/api/countries',
        headers: { Authorization: `Bearer ${tokens['SYSTEM_ADMIN']}` }
      },
      { name: 'Djibouti', code: 'DJ', currency: 'DJF' }
    );
    assert(adminCountryRes.status === 201, 'System Admin can create new countries (201 Created)');
    assert(adminCountryRes.body.data.code === 'DJ', 'Country code is formatted and stored');

    // Test 6: Multi-Tenant Project Isolation
    console.log('\n--- 6. Multi-Tenant Project Isolation & Visibility ---');
    // System Admin sees all projects
    const adminProjectsRes = await request({
      method: 'GET',
      path: '/api/projects',
      headers: { Authorization: `Bearer ${tokens['SYSTEM_ADMIN']}` }
    });
    assert(adminProjectsRes.status === 200, 'System Admin can query all projects');
    assert(adminProjectsRes.body.count >= 3, 'System Admin sees all projects across Ethiopia and Kenya');

    // Master Person A sees only Project A
    const masterProjectsRes = await request({
      method: 'GET',
      path: '/api/projects',
      headers: { Authorization: `Bearer ${tokens['MASTER_PERSON']}` }
    });
    assert(masterProjectsRes.status === 200, 'Master Person A can query projects');
    assert(
      masterProjectsRes.body.data.every(p => p.id === 'proj-eth-a'),
      'Master Person A is strictly isolated to Project A (cannot see Project B or C)'
    );

    // Test 7: User Management Hierarchy
    console.log('\n--- 7. Hierarchical User Onboarding ---');
    // Master Person A creates a staff member for Project A -> 201 Created
    const createStaffRes = await request(
      {
        method: 'POST',
        path: '/api/users',
        headers: { Authorization: `Bearer ${tokens['MASTER_PERSON']}` }
      },
      {
        email: 'nurse.yordanos@tmlogistx.com',
        password: 'Password@123',
        full_name: 'Yordanos Assefa (Outreach Nurse)',
        role: 'STAFF',
        project_id: 'proj-eth-a'
      }
    );
    assert(createStaffRes.status === 201, 'Master Person A can create Staff in their authorized Project A');

    // Master Person A attempts to create a user in Project B -> 403 Forbidden
    const crossProjectRes = await request(
      {
        method: 'POST',
        path: '/api/users',
        headers: { Authorization: `Bearer ${tokens['MASTER_PERSON']}` }
      },
      {
        email: 'illegal.user@tmlogistx.com',
        password: 'Password@123',
        full_name: 'Illegal User',
        role: 'STAFF',
        project_id: 'proj-eth-b' // Unauthorized for Master Person A!
      }
    );
    assert(crossProjectRes.status === 403, 'Master Person A cannot create users in unauthorized Project B (403 Forbidden)');

    // Master Person A attempts to create a System Admin -> 403 Forbidden
    const illegalAdminRes = await request(
      {
        method: 'POST',
        path: '/api/users',
        headers: { Authorization: `Bearer ${tokens['MASTER_PERSON']}` }
      },
      {
        email: 'fake.admin@tmlogistx.com',
        password: 'Password@123',
        full_name: 'Fake Admin',
        role: 'SYSTEM_ADMIN',
        project_id: 'proj-eth-a'
      }
    );
    assert(illegalAdminRes.status === 403, 'Master Person cannot escalate privileges or create SYSTEM_ADMIN (403 Forbidden)');

    // Test 8: Audit Trail Logging
    console.log('\n--- 8. Audit Trail Verification ---');
    const store = getStore();
    assert(store.audit_logs.length >= 8, 'Audit logs automatically recorded logins, country creation, and user creation');
    const loginAudits = store.audit_logs.filter(a => a.action === 'USER_LOGIN');
    assert(loginAudits.length >= 6, 'Audit logs recorded authentication events for each role');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} PHASE 2 TESTS PASSED PERFECTLY!`);
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runPhase2Tests().catch(err => {
  console.error('Test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
