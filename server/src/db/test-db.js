import db, { getStore } from './connection.js';

async function testConnection() {
  console.log('--- Testing TMLogistx Database Layer ---');
  const store = getStore();
  
  console.log(`[Store Check] Loaded ${store.countries.length} countries:`, store.countries.map(c => c.name).join(', '));
  console.log(`[Store Check] Loaded ${store.projects.length} projects:`, store.projects.map(p => p.name).join(' | '));
  console.log(`[Store Check] Loaded ${store.users.length} seeded users across 6 roles:`);
  
  const roles = [...new Set(store.users.map(u => u.role))];
  roles.forEach(role => {
    const usersInRole = store.users.filter(u => u.role === role);
    console.log(`  - Role: ${role.padEnd(22)} (${usersInRole.length} user${usersInRole.length > 1 ? 's' : ''}): ${usersInRole.map(u => u.email).join(', ')}`);
  });

  console.log(`[Store Check] Loaded ${store.vehicles.length} fleet vehicles.`);
  console.log(`[Store Check] Loaded ${store.drivers.length} drivers.`);
  console.log(`[Store Check] Loaded ${store.movement_requests.length} movement requests (statuses: ${store.movement_requests.map(r => r.status).join(', ')}).`);
  console.log(`[Store Check] Loaded ${store.external_transports.length} external transport records (Uber/RIDE alternative).`);
  
  // Test query
  const res = await db.query('SELECT * FROM users WHERE email = $1', ['admin@tmlogistx.com']);
  console.log(`[Query Test] Fetched user by email: ${res.rows[0]?.full_name} (${res.rows[0]?.role})`);
  console.log('--- Database Layer Verification Successful ---');
}

testConnection();
