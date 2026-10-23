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

async function seedDatabase() {
  console.log('====================================================');
  console.log('TMLogistx Database Seeding (Countries, Projects, 6 Roles)');
  console.log('====================================================');

  if (!DATABASE_URL || DATABASE_URL.includes('ep-cool-butterfly-123456')) {
    console.log('[Notice] Demo DATABASE_URL detected in server/.env.');
    console.log('The in-memory development store is already pre-loaded with complete seed data for all 6 roles!');
    console.log('To seed a live Neon DB, replace DATABASE_URL in server/.env and re-run.');
    return;
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('[Connecting] Connecting to Neon PostgreSQL...');
    await client.connect();
    console.log('[Connected] Applying seed.sql data...');

    const seedPath = path.join(__dirname, 'seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    await client.query(seedSql);
    console.log('[Success] Seed records inserted successfully across all tables!');
  } catch (err) {
    console.error('[Error] Seeding failed:', err.message);
  } finally {
    await client.end();
  }
}

seedDatabase();
