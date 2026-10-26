/**
 * Server-side Mapbox Geocoding + Directions (same APIs as web client).
 */
import { config } from '../config/index.js';

function token() {
  return config.mapboxAccessToken;
}

function authQuery() {
  return `access_token=${encodeURIComponent(token())}`;
}

export async function mapboxDrivingRoute(fromLat, fromLng, toLat, toLng) {
  const t = token();
  if (!t || !fromLat || !fromLng || !toLat || !toLng) return null;
  const path = `${fromLng},${fromLat};${toLng},${toLat}`;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${path}?` +
    `${authQuery()}&geometries=geojson&overview=full`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) return null;
  return {
    distanceKm: parseFloat((route.distance / 1000).toFixed(1)),
    durationMins: Math.ceil(route.duration / 60),
    etaDate: new Date(Date.now() + route.duration * 1000),
    provider: 'MAPBOX_DIRECTIONS',
    geometry: route.geometry
  };
}

export async function mapboxGeocodeSearch(addressText) {
  const t = token();
  if (!t || !addressText?.trim()) return null;
  const q = encodeURIComponent(addressText.trim());
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?` +
    `${authQuery()}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const f = data.features?.[0];
  if (!f) return null;
  const [lng, lat] = f.center;
  return {
    formatted: f.place_name,
    latitude: lat,
    longitude: lng,
    country: f.context?.find((c) => c.id?.startsWith('country'))?.text,
    city: f.context?.find((c) => c.id?.startsWith('place'))?.text
  };
}
