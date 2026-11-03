
const CACHE_KEY = 'tmlogistx_map_runtime_v1';
const CACHE_MS = 60 * 60 * 1000;

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* ignore quota */
  }
}

/** Mapbox public token + style from API (Render has MAPBOX_ACCESS_TOKEN). */
export async function loadMapRuntimeConfig() {
  const cached = readCache();
  if (cached) return cached;

  const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
  const envStyle = import.meta.env.VITE_MAPBOX_STYLE || 'mapbox/streets-v12';
  if (envToken.startsWith('pk.')) {
    const data = { mapboxPublicToken: envToken, mapboxStyle: envStyle };
    writeCache(data);
    return data;
  }

  try {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const res = await fetch(`${base}/geo/client-config`);
    if (res.ok) {
      const json = await res.json();
      const data = json.data || {};
      if (data.mapboxPublicToken?.startsWith('pk.')) {
        writeCache(data);
        return data;
      }
    }
  } catch {
    /* offline — fall back to OSM tiles */
  }

  return { mapboxPublicToken: '', mapboxStyle: envStyle };
}
