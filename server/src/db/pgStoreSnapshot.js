import { syncStoreToRelational } from './relationalSync.js';
import { persistStoreNow } from './persistStore.js';

const SNAPSHOT_ID = 'main';

export async function loadSnapshotFromPg(pool) {
  try {
    const res = await pool.query(
      'SELECT payload FROM app_store_snapshots WHERE id = $1 LIMIT 1',
      [SNAPSHOT_ID]
    );
    if (!res.rows?.length) return null;
    const payload = res.rows[0].payload;
    if (typeof payload === 'string') return JSON.parse(payload);
    return payload;
  } catch (err) {
    if (err.code === '42P01') {
      console.warn('[Store] app_store_snapshots table missing — run: npm run db:init');
      return null;
    }
    throw err;
  }
}

let pgPersistTimer = null;

export function schedulePgPersist(pool, memoryStore) {
  if (!pool || !memoryStore) return;
  if (pgPersistTimer) clearTimeout(pgPersistTimer);
  pgPersistTimer = setTimeout(() => {
    saveSnapshotToPg(pool, memoryStore).catch((err) => {
      console.error('[Store] Neon persist failed:', err.message);
    });
    pgPersistTimer = null;
  }, 150);
}

export async function saveSnapshotToPg(pool, memoryStore) {
  const payload = {
    _saved_at: new Date().toISOString(),
    ...memoryStore
  };
  await pool.query(
    `INSERT INTO app_store_snapshots (id, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE
     SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [SNAPSHOT_ID, JSON.stringify(payload)]
  );
  await syncStoreToRelational(pool, memoryStore);
  persistStoreNow(memoryStore);
}
