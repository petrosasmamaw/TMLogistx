/**
 * Mapbox Maps API helpers (Geocoding v5 + Directions v5 + raster tiles for Leaflet).
 * @see https://docs.mapbox.com/api/
 */

const ENV_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
const ENV_STYLE = import.meta.env.VITE_MAPBOX_STYLE || 'mapbox/streets-v12';

export function getMapboxAccessToken() {
  return ENV_TOKEN;
}

export function getMapboxStyleId() {
  return ENV_STYLE;
}

/**
 * High-quality Mapbox raster tiles tuned for slower connections (256px, fewer buffers).
 */
export function buildMapboxLeafletTileConfig(token, style = ENV_STYLE) {
  if (!token?.startsWith('pk.')) return null;
  return {
    url: `https://api.mapbox.com/styles/v1/${style}/tiles/256/{z}/{x}/{y}?access_token=${token}`,
    attribution:
      '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    tileSize: 256,
    minZoom: 0,
    maxZoom: 18,
    maxNativeZoom: 19,
    keepBuffer: 2,
    updateWhenIdle: true,
    updateWhenZooming: false,
  };
}

/** Leaflet TileLayer props when VITE token is set at build time. */
export function getMapboxLeafletTileConfig() {
  return buildMapboxLeafletTileConfig(ENV_TOKEN, ENV_STYLE);
}

function authQuery(token = ENV_TOKEN) {
  return `access_token=${encodeURIComponent(token)}`;
}

export async function mapboxForwardGeocode(query, { limit = 8, types = 'place,locality,region' } = {}) {
  const token = ENV_TOKEN;
  if (!token || !query?.trim()) return [];
  const q = encodeURIComponent(query.trim());
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?` +
    `${authQuery()}&autocomplete=true&limit=${limit}&types=${encodeURIComponent(types)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || []).map((f) => ({
    id: f.id,
    lat: f.center[1],
    lon: f.center[0],
    label: f.place_name
  }));
}

export async function mapboxReverseGeocode(lat, lng) {
  if (!ENV_TOKEN) return null;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
    `${authQuery()}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const f = data.features?.[0];
  return f?.place_name || null;
}

/** @returns {{ coordinates: [lat,lng][], distanceKm: string, timeMins: number } | null} */
export async function mapboxDrivingRoute(lat1, lon1, lat2, lon2) {
  if (!ENV_TOKEN) return null;
  const path = `${lon1},${lat1};${lon2},${lat2}`;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${path}?` +
    `${authQuery()}&geometries=geojson&overview=full`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates?.length) return null;
  const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return {
    coordinates,
    distanceKm: (route.distance / 1000).toFixed(1),
    timeMins: Math.round(route.duration / 60)
  };
}
