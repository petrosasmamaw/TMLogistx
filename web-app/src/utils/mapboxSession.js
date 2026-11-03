/** Runtime Mapbox config (from Vite env or /api/geo/client-config). */
let runtimeToken = '';
let runtimeStyle = 'mapbox/streets-v12';

export function applyMapRuntimeConfig(cfg) {
  if (cfg?.mapboxPublicToken?.startsWith('pk.')) {
    runtimeToken = cfg.mapboxPublicToken;
  }
  if (cfg?.mapboxStyle) {
    runtimeStyle = cfg.mapboxStyle;
  }
}

export function getEffectiveMapboxStyle() {
  const envStyle = import.meta.env.VITE_MAPBOX_STYLE;
  return envStyle || runtimeStyle || 'mapbox/streets-v12';
}

export function getEffectiveMapboxToken() {
  const env = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
  if (env.startsWith('pk.')) return env;
  return runtimeToken.startsWith('pk.') ? runtimeToken : '';
}
