import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'runtime-store.json');

let persistTimer = null;
let persistDisabled = process.env.PERSIST_STORE === 'false';

export function getStoreFilePath() {
  return STORE_FILE;
}

/**
 * Merge saved JSON into the live in-memory store (arrays/objects from disk win).
 */
export function applyPersistedStore(memoryStore, saved) {
  if (!saved || typeof saved !== 'object') return false;

  for (const key of Object.keys(memoryStore)) {
    if (saved[key] !== undefined && saved[key] !== null) {
      memoryStore[key] = saved[key];
    }
  }
  for (const key of Object.keys(saved)) {
    if (memoryStore[key] === undefined) {
      memoryStore[key] = saved[key];
    }
  }
  return true;
}

export function loadPersistedStore() {
  if (persistDisabled) return null;
  try {
    if (!fs.existsSync(STORE_FILE)) return null;
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    console.log(`[Store] Loaded persisted data from ${STORE_FILE}`);
    return parsed;
  } catch (err) {
    console.warn('[Store] Could not load persisted store, using seed data:', err.message);
    return null;
  }
}

export function persistStoreNow(memoryStore) {
  if (persistDisabled || !memoryStore) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = {
      _saved_at: new Date().toISOString(),
      ...memoryStore
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('[Store] Failed to persist:', err.message);
  }
}

/** Debounced save after API mutations (survives nodemon restarts). */
export function schedulePersistStore(memoryStore) {
  if (persistDisabled || !memoryStore) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistStoreNow(memoryStore);
    persistTimer = null;
  }, 400);
}
