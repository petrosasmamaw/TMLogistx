import pg from 'pg';
import dotenv from 'dotenv';
import { initialStore } from './mockStore.js';
import {
  loadPersistedStore,
  applyPersistedStore,
  persistStoreNow,
  schedulePersistStore,
  getStoreFilePath
} from './persistStore.js';
import { loadSnapshotFromPg, saveSnapshotToPg, schedulePgPersist } from './pgStoreSnapshot.js';
import { mergeRelationalIntoStore } from './relationalSync.js';

dotenv.config();

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

let isLiveDb = false;
let pool = null;
let storeHydrated = false;
let hydratePromise = null;

const memoryStore = JSON.parse(JSON.stringify(initialStore));

const isPlaceholderUrl =
  !DATABASE_URL ||
  DATABASE_URL.includes('ep-cool-butterfly-123456') ||
  DATABASE_URL.includes('YOUR_PASSWORD');

if (!isPlaceholderUrl) {
  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    const testClient = await pool.connect();
    isLiveDb = true;
    console.log('[Neon PostgreSQL] Connected — data persists in Postgres (tables + app_store_snapshots).');
    testClient.release();
  } catch (err) {
    console.warn('[Neon PostgreSQL] Unreachable, using local file store:', err.message);
    isLiveDb = false;
  }
} else {
  console.log('[Database] No DATABASE_URL — using local file store (server/data/runtime-store.json).');
}

if (!isLiveDb) {
  const persisted = loadPersistedStore();
  if (persisted) {
    applyPersistedStore(memoryStore, persisted);
    console.log(`[Store] Restored from ${getStoreFilePath()}`);
  }
  storeHydrated = true;
}

/**
 * Load authoritative store from Neon before handling API traffic.
 */
export async function ensureStoreReady() {
  if (storeHydrated) return;
  if (!isLiveDb || !pool) {
    storeHydrated = true;
    return;
  }

  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        const fromPg = await loadSnapshotFromPg(pool);
        if (fromPg) {
          applyPersistedStore(memoryStore, fromPg);
          console.log('[Store] Loaded from Neon app_store_snapshots.');
        } else {
          const file = loadPersistedStore();
          if (file) applyPersistedStore(memoryStore, file);
          await saveSnapshotToPg(pool, memoryStore, { skipRelational: false, mirrorToDisk: false });
          console.log('[Store] Neon initialized from seed/local file. Run npm run db:import after schema changes.');
        }
        await mergeRelationalIntoStore(pool, memoryStore);
      } catch (err) {
        console.error('[Store] Neon hydrate failed:', err.message);
        const file = loadPersistedStore();
        if (file) applyPersistedStore(memoryStore, file);
      } finally {
        storeHydrated = true;
      }
    })();
  }

  await hydratePromise;
}

export async function query(text, params = []) {
  if (isLiveDb && pool) {
    return pool.query(text, params);
  }
  return handleMockQuery(text, params);
}

export function getStore() {
  return memoryStore;
}

export async function saveStore() {
  if (isLiveDb && pool) {
    await ensureStoreReady();
    await saveSnapshotToPg(pool, memoryStore);
    return;
  }
  persistStoreNow(memoryStore);
}

export function saveStoreToDisk() {
  if (isLiveDb && pool) {
    schedulePgPersist(pool, memoryStore);
    return;
  }
  persistStoreNow(memoryStore);
}

export function queueStoreSave() {
  if (isLiveDb && pool) {
    schedulePgPersist(pool, memoryStore);
  } else {
    schedulePersistStore(memoryStore);
  }
}

function handleMockQuery(text, params) {
  const sql = text.trim();
  const lower = sql.toLowerCase();

  if (lower.startsWith('select')) {
    for (const tableName of Object.keys(memoryStore)) {
      if (lower.includes(`from ${tableName}`) || lower.includes(`from "${tableName}"`)) {
        let rows = [...(memoryStore[tableName] || [])];
        if (lower.includes('where') && params.length > 0) {
          if (lower.includes('email = $1')) {
            rows = rows.filter((r) => r.email && r.email.toLowerCase() === String(params[0]).toLowerCase());
          } else if (lower.includes('id = $1')) {
            rows = rows.filter((r) => r.id === params[0]);
          } else if (lower.includes('project_id = $1')) {
            rows = rows.filter((r) => r.project_id === params[0]);
          } else if (lower.includes('country_id = $1')) {
            rows = rows.filter((r) => r.country_id === params[0]);
          }
        }
        return { rows, rowCount: rows.length };
      }
    }
    return { rows: [{ '?column?': 1 }], rowCount: 1 };
  }

  if (lower.startsWith('insert into')) {
    for (const tableName of Object.keys(memoryStore)) {
      if (lower.includes(`insert into ${tableName}`)) {
        return { rows: params.length > 0 ? [{ id: params[0] || 'gen-id-' + Date.now() }] : [], rowCount: 1 };
      }
    }
  }

  return { rows: [], rowCount: 0 };
}

export default {
  query,
  getStore,
  ensureStoreReady,
  saveStore,
  saveStoreToDisk,
  queueStoreSave,
  isLiveDb: () => isLiveDb
};
