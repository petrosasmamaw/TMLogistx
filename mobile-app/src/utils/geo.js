export function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null || Number.isNaN(Number(v)))) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/** Best available distance (km) for a trip row — history, KPIs, labels. */
export function resolveTripDistanceKm(trip) {
  if (!trip) return null;
  const pick = (v) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const fromFields =
    pick(trip.actual_distance_km) ??
    pick(trip.distance_km) ??
    pick(trip.external_distance_km) ??
    pick(trip.map_estimated_distance_km) ??
    pick(trip.estimated_distance_km) ??
    pick(trip.assignment?.actual_distance_km) ??
    pick(trip.assignment?.estimated_distance_km);

  if (fromFields != null) return parseFloat(fromFields.toFixed(2));

  const mapOnly = resolveMapDistanceKm(trip);
  if (mapOnly != null) return mapOnly;

  return haversineKm(
    trip.pickup_latitude ?? trip.pickup_lat,
    trip.pickup_longitude ?? trip.pickup_lng,
    trip.destination_latitude ?? trip.destination_lat,
    trip.destination_longitude ?? trip.destination_lng
  );
}

/** Distance shown only when pickup & destination were both chosen on map (not GPS/manual). */
export function resolveMapDistanceKm(trip) {
  const pickupSrc = trip?.pickup_location_source;
  const destSrc = trip?.destination_location_source;
  if (pickupSrc === 'map' && destSrc === 'map') {
    if (trip.map_estimated_distance_km != null) return trip.map_estimated_distance_km;
    return haversineKm(
      trip.pickup_latitude ?? trip.pickup_lat,
      trip.pickup_longitude ?? trip.pickup_lng,
      trip.destination_latitude ?? trip.destination_lat,
      trip.destination_longitude ?? trip.destination_lng
    );
  }
  return null;
}

export function formatDistanceDisplay(trip) {
  const km = resolveMapDistanceKm(trip);
  if (km == null) return '—';
  return `${km} km`;
}

import { getMapboxAccessToken, mapboxForwardGeocode, mapboxReverseGeocode } from './mapbox.js';

export async function reverseGeocode(lat, lng) {
  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  if (!getMapboxAccessToken()) return fallback;
  const label = await mapboxReverseGeocode(lat, lng);
  return label || fallback;
}

export async function geocodeAddress(text) {
  if (!text?.trim() || !getMapboxAccessToken()) return null;
  return mapboxForwardGeocode(text, { limit: 1 });
}
