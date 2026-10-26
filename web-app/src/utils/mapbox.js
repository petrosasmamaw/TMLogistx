/**
 * Mapbox Maps API helpers (Geocoding v5 + Directions v5 + raster tiles for Leaflet).
 * @see https://docs.mapbox.com/api/
 */

const TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
const STYLE = import.meta.env.VITE_MAPBOX_STYLE || 'mapbox/streets-v12';

export function getMapboxAccessToken() {
  return TOKEN;
}

export function getMapboxStyleId() {
  return STYLE;
}

/** Leaflet TileLayer props for Mapbox raster tiles (512px). */
export function getMapboxLeafletTileConfig() {
  if (!TOKEN) return null;
  return {
    url: `https://api.mapbox.com/styles/v1/${STYLE}/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`,
    attribution:
      '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 22
  };
}

function authQuery() {
  return `access_token=${encodeURIComponent(TOKEN)}`;
}

export async function mapboxForwardGeocode(query, { limit = 8, types = 'place,locality,region' } = {}) {
  if (!TOKEN || !query?.trim()) return [];
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
  if (!TOKEN) return null;
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
  if (!TOKEN) return null;
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
