/**
 * Wipe Neon + local runtime store and seed a single SYSTEM_ADMIN for fresh testing.
 * Usage: npm run db:reset
 *
 * Default admin: admin@gmail.com / 12345678
 * Override: RESET_ADMIN_EMAIL, RESET_ADMIN_PASSWORD in server/.env
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { saveSnapshotToPg } from './pgStoreSnapshot.js';
import { persistStoreNow, getStoreFilePath } from './persistStore.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_EMAIL = (process.env.RESET_ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.RESET_ADMIN_PASSWORD || '12345678';
const ADMIN_NAME = process.env.RESET_ADMIN_NAME || 'Super Admin';

const TABLES_TO_TRUNCATE = [
  'policy_acceptances',
  'audit_logs',
  'gps_logs',
  'fuel_logs',
  'personal_fuel_recoveries',
  'vehicle_expenses',
  'external_transports',
  'trip_assignments',
  'movement_requests',
  'vehicle_schedules',
  'vehicle_accidents',
  'drivers',
  'vehicles',
  'master_person_projects',
  'project_sites',
  'users',
  'projects',
  'countries',
  'policies',
  'app_store_snapshots'
];

async function buildFreshStore() {
  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const now = new Date().toISOString();

  return {
    countries: [],
    projects: [],
    project_sites: [],
    users: [
      {
        id: 'usr-super-admin',
        email: ADMIN_EMAIL,
        password_hash,
        full_name: ADMIN_NAME,
        phone_number: null,
        role: 'SYSTEM_ADMIN',
        country_id: null,
        project_id: null,
        site_id: null,
        language_preference: 'en',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ],
    master_person_projects: [],
    vehicles: [],
    drivers: [],
    vehicle_schedules: [],
    movement_requests: [],
    trip_assignments: [],
    external_transports: [],
    vehicle_expenses: [],
    audit_logs: [],
    gps_logs: [],
    vehicle_accidents: [],
    fuel_logs: [],
    personal_fuel_recoveries: [],
    policies: [],
    policy_acceptances: []
  };
}

async function truncateRelationalTables(client) {
  for (const table of TABLES_TO_TRUNCATE) {
    try {
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      console.log(`[db:reset] Truncated ${table}`);
    } catch (err) {
      if (err.code === '42P01') {
        console.log(`[db:reset] Skip ${table} (not created — run npm run db:init)`);
      } else {
        console.warn(`[db:reset] ${table}: ${err.message}`);
      }
    }
  }
}

async function run() {
  const DATABASE_URL = process.env.DATABASE_URL;
  const freshStore = await buildFreshStore();

  console.log('====================================================');
  console.log('TMLogistx — FULL DATABASE RESET');
  console.log('====================================================');

  persistStoreNow(freshStore);
  console.log(`[db:reset] Wrote local file: ${getStoreFilePath()}`);

  if (!DATABASE_URL || DATABASE_URL.includes('YOUR_PASSWORD')) {
    console.log('[db:reset] No DATABASE_URL — only local runtime-store.json was reset.');
    console.log(`[db:reset] Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log('[db:reset] Restart the API server (npm run dev) before testing.');
    return;
  }

  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2
  });

  console.log('[db:reset] Connected to PostgreSQL.');

  const truncateClient = await pool.connect();
  try {
    await truncateRelationalTables(truncateClient);
  } finally {
    truncateClient.release();
  }

  await saveSnapshotToPg(pool, freshStore);
  console.log('[db:reset] Saved empty snapshot + super admin to app_store_snapshots.');

  await pool.end();

  console.log('');
  console.log('Done. All previous data removed.');
  console.log(`Super admin: ${ADMIN_EMAIL}`);
  console.log(`Password:    ${ADMIN_PASSWORD}`);
  console.log('Restart the API server (npm run dev), then sign in on the web portal.');
}

run().catch((err) => {
  console.error('[db:reset] Failed:', err.message);
  process.exit(1);
});
