import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

async function initDatabase() {
  console.log('====================================================');
  console.log('TMLogistx Database Schema Initialization');
  console.log('====================================================');

  if (!DATABASE_URL || DATABASE_URL.includes('ep-cool-butterfly-123456')) {
    console.log('[Notice] Demo DATABASE_URL detected in server/.env.');
    console.log('The system will use the pre-seeded in-memory store for immediate local development.');
    console.log('To initialize tables on a live Neon DB, replace DATABASE_URL in server/.env and re-run.');
    return;
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('[Connecting] Connecting to Neon PostgreSQL...');
    await client.connect();
    console.log('[Connected] Applying schema.sql DDL...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schemaSql);

    const extPath = path.join(__dirname, 'schema-extensions.sql');
    if (fs.existsSync(extPath)) {
      await client.query(fs.readFileSync(extPath, 'utf8'));
      console.log('[Success] schema-extensions.sql applied (sites, snapshots, extra columns).');
    }

    console.log('[Success] Relational schema ready. Run: npm run db:import');
  } catch (err) {
    console.error('[Error] Failed to initialize schema on database:', err.message);
  } finally {
    await client.end();
  }
}

initDatabase();
