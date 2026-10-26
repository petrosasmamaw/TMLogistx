const TOKEN =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
    ? process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
    : '';

const STYLE =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_MAPBOX_STYLE
    ? process.env.EXPO_PUBLIC_MAPBOX_STYLE
    : 'mapbox/streets-v12';

export function getMapboxAccessToken() {
  return TOKEN;
}

export function getMapboxStyleId() {
  return STYLE;
}

/** Leaflet TileLayer options for Mapbox raster tiles (512px). */
export function getMapboxLeafletTileOptions() {
  if (!TOKEN) return null;
  return {
    url: `https://api.mapbox.com/styles/v1/${STYLE}/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`,
    attribution: '© Mapbox © OpenStreetMap',
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 22
  };
}

function authQuery() {
  return `access_token=${encodeURIComponent(TOKEN)}`;
}

export async function mapboxReverseGeocode(lat, lng) {
  if (!TOKEN) return null;
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
      `${authQuery()}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.features?.[0]?.place_name || null;
  } catch {
    return null;
  }
}

/** Fastest driving route (Mapbox Directions driving profile). */
export async function mapboxDrivingRoute(lat1, lon1, lat2, lon2) {
  if (!TOKEN || lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  try {
    const path = `${lon1},${lat1};${lon2},${lat2}`;
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${path}?` +
      `${authQuery()}&geometries=geojson&overview=full&alternatives=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route?.geometry?.coordinates?.length) return null;
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    return {
      coordinates,
      distanceKm: (route.distance / 1000).toFixed(1),
      timeMins: Math.max(1, Math.round(route.duration / 60))
    };
  } catch {
    return null;
  }
}

export async function mapboxForwardGeocode(query, { limit = 1 } = {}) {
  if (!TOKEN || !query?.trim()) return null;
  try {
    const q = encodeURIComponent(query.trim());
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?` +
      `${authQuery()}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const f = data.features?.[0];
    if (!f) return null;
    return {
      lat: f.center[1],
      lng: f.center[0],
      label: f.place_name || query.trim()
    };
  } catch {
    return null;
  }
}
