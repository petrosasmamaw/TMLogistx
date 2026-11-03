/**
 * Mapbox helpers — matches mobile-app/src/utils/mapbox.js tile + route behavior.
 */
import { apiRequest } from '../api/client.js';
import { getEffectiveMapboxStyle, getEffectiveMapboxToken } from './mapboxSession.js';

export function getMapboxAccessToken() {
  return getEffectiveMapboxToken();
}

export function getMapboxStyleId() {
  return getEffectiveMapboxStyle();
}

/** Same Leaflet layer as mobile TripLiveMap (512 @2x, streets-v12). */
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

async function fetchRouteViaServer(lat1, lon1, lat2, lon2) {
  try {
    const q = new URLSearchParams({
      from_lat: String(lat1),
      from_lng: String(lon1),
      to_lat: String(lat2),
      to_lng: String(lon2),
    });
    const res = await apiRequest(`/geo/driving-route?${q.toString()}`);
    return res.data || null;
  } catch {
    return null;
  }
}

async function fetchRouteViaMapbox(lat1, lon1, lat2, lon2, token) {
  const path = `${lon1},${lat1};${lon2},${lat2}`;
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

export async function mapboxDrivingRoute(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null)) return null;
  const token = getEffectiveMapboxToken();
  if (token) {
    const direct = await fetchRouteViaMapbox(lat1, lon1, lat2, lon2, token);
    if (direct) return direct;
  }
  return fetchRouteViaServer(lat1, lon1, lat2, lon2);
}

export async function mapboxForwardGeocode(query, { limit = 8, types = 'place,locality,region' } = {}) {
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
