/**
 * Apply schema + import local runtime-store.json (or seed) into Neon app_store_snapshots.
 * Usage: npm run db:import
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import { initialStore } from './mockStore.js';
import { applyPersistedStore } from './persistStore.js';
import { saveSnapshotToPg } from './pgStoreSnapshot.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_FILE = path.resolve(__dirname, '../../data/runtime-store.json');

async function run() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL || DATABASE_URL.includes('YOUR_PASSWORD')) {
    console.error('Set DATABASE_URL in server/.env first.');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('[db:import] Connected to PostgreSQL.');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const extPath = path.join(__dirname, 'schema-extensions.sql');
  await client.query(fs.readFileSync(schemaPath, 'utf8'));
  console.log('[db:import] schema.sql applied.');
  await client.query(fs.readFileSync(extPath, 'utf8'));
  console.log('[db:import] schema-extensions.sql applied.');

  const memoryStore = JSON.parse(JSON.stringify(initialStore));
  if (fs.existsSync(RUNTIME_FILE)) {
    const saved = JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf8'));
    applyPersistedStore(memoryStore, saved);
    console.log(`[db:import] Merged ${RUNTIME_FILE}`);
  } else {
    console.log('[db:import] No runtime-store.json — uploading seed data only.');
  }

  await saveSnapshotToPg(client, memoryStore);
  console.log('[db:import] Snapshot saved to app_store_snapshots (id=main).');
  console.log(
    `[db:import] Users: ${memoryStore.users?.length ?? 0}, Projects: ${memoryStore.projects?.length ?? 0}, Sites: ${memoryStore.project_sites?.length ?? 0}`
  );

  await client.end();
}

run().catch((err) => {
  console.error('[db:import] Failed:', err.message);
  process.exit(1);
});
