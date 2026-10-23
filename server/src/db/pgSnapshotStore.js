import { query } from './connection.js';

const SNAPSHOT_ID = 'main';

export async function loadAppSnapshotFromPostgres() {
  const result = await query(
    'SELECT payload FROM tmlogistx_app_snapshot WHERE id = $1',
    [SNAPSHOT_ID]
  );
  if (!result.rows?.length) return null;
  const payload = result.rows[0].payload;
  return typeof payload === 'string' ? JSON.parse(payload) : payload;
}

export async function saveAppSnapshotToPostgres(store) {
  const { _saved_at, ...payload } = store;
  await query(
    `INSERT INTO tmlogistx_app_snapshot (id, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE
     SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [SNAPSHOT_ID, JSON.stringify(payload)]
  );
}
