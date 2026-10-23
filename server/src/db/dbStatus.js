/**
 * Show where application data is stored (Neon tables + snapshot + local file).
 * Usage: npm run db:status
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_FILE = path.resolve(__dirname, '../../data/runtime-store.json');

async function run() {
  const DATABASE_URL = process.env.DATABASE_URL;
  console.log('--- TMLogistx data status ---\n');

  if (fs.existsSync(RUNTIME_FILE)) {
    try {
      const local = JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf8'));
      console.log(`Local file: ${RUNTIME_FILE}`);
      console.log(`  saved_at: ${local._saved_at || 'unknown'}`);
      console.log(`  users: ${local.users?.length ?? 0}`);
      console.log(`  movement_requests: ${local.movement_requests?.length ?? 0}`);
      console.log(`  trip_assignments: ${local.trip_assignments?.length ?? 0}\n`);
    } catch (e) {
      console.log(`Local file unreadable: ${e.message}\n`);
    }
  } else {
    console.log('Local file: (none)\n');
  }

  if (!DATABASE_URL || DATABASE_URL.includes('YOUR_PASSWORD')) {
    console.log('DATABASE_URL not set — only local file is used when server runs offline.');
    return;
  }

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    const snap = await client.query(
      `SELECT updated_at, jsonb_array_length(COALESCE(payload->'users','[]'::jsonb)) AS user_count,
              jsonb_array_length(COALESCE(payload->'movement_requests','[]'::jsonb)) AS request_count
       FROM app_store_snapshots WHERE id = 'main'`
    );
    if (snap.rows.length) {
      const r = snap.rows[0];
      console.log('Neon table: app_store_snapshots (id=main)');
      console.log(`  updated_at: ${r.updated_at}`);
      console.log(`  users in snapshot: ${r.user_count}`);
      console.log(`  movement_requests in snapshot: ${r.request_count}\n`);
    } else {
      console.log('Neon: no app_store_snapshots row yet (start server or npm run db:import)\n');
    }
  } catch (e) {
    console.log(`app_store_snapshots: ${e.message}\n`);
  }

  for (const table of ['users', 'movement_requests', 'trip_assignments', 'drivers', 'vehicles']) {
    try {
      const res = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
      console.log(`Neon table ${table}: ${res.rows[0].n} rows`);
    } catch (e) {
      console.log(`Neon table ${table}: ${e.message}`);
    }
  }

  await client.end();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
