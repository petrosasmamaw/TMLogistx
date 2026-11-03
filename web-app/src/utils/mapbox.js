/**
 * Mapbox helpers — aligned with mobile-app/src/utils/mapbox.js (512 @2x tiles + driving routes).
 */
import { apiRequest } from '../api/client.js';
import { loadMapRuntimeConfig } from './mapRuntime.js';
import { getEffectiveMapboxStyle, getEffectiveMapboxToken } from './mapboxSession.js';

export function getMapboxAccessToken() {
  return getEffectiveMapboxToken();
}

export function getMapboxStyleId() {
  return getEffectiveMapboxStyle();
}

/** Same Leaflet layer as mobile TripLiveMap WebView map. */
export function buildMapboxLeafletTileConfig(token, style = getEffectiveMapboxStyle()) {
  if (!token?.startsWith('pk.')) return null;
  return {
    url: `https://api.mapbox.com/styles/v1/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`,
    attribution: '© Mapbox © OpenStreetMap',
    tileSize: 512,
    zoomOffset: -1,
    minZoom: 0,
    maxZoom: 22,
    maxNativeZoom: 22,
    keepBuffer: 6,
    updateWhenIdle: true,
    updateWhenZooming: false,
  };
}

export function getMapboxLeafletTileConfig() {
  return buildMapboxLeafletTileConfig(getEffectiveMapboxToken(), getEffectiveMapboxStyle());
}

function authQuery(token) {
  return `access_token=${encodeURIComponent(token)}`;
}

function asCoords(lat1, lon1, lat2, lon2) {
  const a = Number(lat1);
  const b = Number(lon1);
  const c = Number(lat2);
  const d = Number(lon2);
  if (![a, b, c, d].every(Number.isFinite)) return null;
  return { a, b, c, d };
}

export async function fetchDrivingRouteFromApi(lat1, lon1, lat2, lon2) {
  const coords = asCoords(lat1, lon1, lat2, lon2);
  if (!coords) return null;
  try {
    const q = new URLSearchParams({
      from_lat: String(coords.a),
      from_lng: String(coords.b),
      to_lat: String(coords.c),
      to_lng: String(coords.d),
    });
    const res = await apiRequest(`/geo/driving-route?${q.toString()}`);
    const data = res.data;
    if (data?.coordinates?.length >= 2) return data;
  } catch {
    /* try Mapbox direct next */
  }
  return null;
}

async function fetchRouteViaMapbox(lat1, lon1, lat2, lon2, token) {
  const coords = asCoords(lat1, lon1, lat2, lon2);
  if (!coords) return null;
  const path = `${coords.b},${coords.a};${coords.d},${coords.c}`;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${path}?` +
    `${authQuery(token)}&geometries=geojson&overview=full&alternatives=false`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates?.length) return null;
  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: (route.distance / 1000).toFixed(1),
    timeMins: Math.max(1, Math.round(route.duration / 60)),
  };
}

/** Fastest driving path (road network). Server API first — same token as Render mobile API. */
export async function mapboxDrivingRoute(lat1, lon1, lat2, lon2) {
  await loadMapRuntimeConfig();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const fromApi = await fetchDrivingRouteFromApi(lat1, lon1, lat2, lon2);
    if (fromApi?.coordinates?.length >= 2) return fromApi;

    const token = getEffectiveMapboxToken();
    if (token) {
      const direct = await fetchRouteViaMapbox(lat1, lon1, lat2, lon2, token);
      if (direct?.coordinates?.length >= 2) return direct;
    }

    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  return null;
}

export async function mapboxForwardGeocode(query, { limit = 8, types = 'place,locality,region' } = {}) {
  await loadMapRuntimeConfig();
  const token = getEffectiveMapboxToken();
  if (!token || !query?.trim()) return [];
  const q = encodeURIComponent(query.trim());
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?` +
    `${authQuery(token)}&autocomplete=true&limit=${limit}&types=${encodeURIComponent(types)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || []).map((f) => ({
    id: f.id,
    lat: f.center[1],
    lon: f.center[0],
    label: f.place_name,
  }));
}

export async function mapboxReverseGeocode(lat, lng) {
  await loadMapRuntimeConfig();
  const token = getEffectiveMapboxToken();
  if (!token) return null;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
    `${authQuery(token)}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.features?.[0]?.place_name || null;
}
