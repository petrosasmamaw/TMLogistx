/**
 * Smoke tests for manual-location navigation rules (run: node mobile-app/scripts/test-trip-location-rules.mjs)
 */
import assert from 'node:assert/strict';

const HEADING_DEST = new Set(['IN_TRANSIT', 'PASSENGER_PICKED_UP']);
const ENDED = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);

function normalizeLocationSource(src) {
  const s = String(src || '').toLowerCase();
  if (s === 'map' || s === 'gps' || s === 'manual') return s;
  return 'manual';
}

function tripHasPickupCoords(trip) {
  const lat = trip?.pickup_latitude ?? trip?.pickup_lat;
  const lng = trip?.pickup_longitude ?? trip?.pickup_lng;
  return lat != null && lng != null;
}

function tripHasDestCoords(trip) {
  const lat = trip?.destination_latitude ?? trip?.destination_lat;
  const lng = trip?.destination_longitude ?? trip?.destination_lng;
  return lat != null && lng != null;
}

function isPickupManual(trip) {
  if (normalizeLocationSource(trip?.pickup_location_source) === 'manual') return true;
  return !tripHasPickupCoords(trip);
}

function isDestManual(trip) {
  if (normalizeLocationSource(trip?.destination_location_source) === 'manual') return true;
  return !tripHasDestCoords(trip);
}

function requiresRouteDistanceCounter(trip) {
  if (trip?.external_authorized || trip?.external_provider) return false;
  return isPickupManual(trip) || isDestManual(trip);
}

function shouldShowLiveNavToPickup(trip, status) {
  const s = String(status || '').toUpperCase();
  if (ENDED.has(s) || HEADING_DEST.has(s) || s === 'ARRIVED') return false;
  if (!tripHasPickupCoords(trip) || isPickupManual(trip)) return false;
  return true;
}

function shouldShowLiveNavToDest(trip, status) {
  const s = String(status || '').toUpperCase();
  if (ENDED.has(s) || !HEADING_DEST.has(s)) return false;
  if (!tripHasDestCoords(trip) || isDestManual(trip)) return false;
  return true;
}

const coords = {
  pickup_latitude: 9.01,
  pickup_longitude: 38.75,
  destination_latitude: 9.05,
  destination_longitude: 38.8,
};

assert.equal(
  shouldShowLiveNavToPickup({ ...coords, pickup_location_source: 'manual', destination_location_source: 'map' }, 'ACCEPTED'),
  false
);
assert.equal(
  shouldShowLiveNavToDest({ ...coords, pickup_location_source: 'manual', destination_location_source: 'map' }, 'IN_TRANSIT'),
  true
);
assert.equal(
  shouldShowLiveNavToPickup({ ...coords, pickup_location_source: 'map', destination_location_source: 'manual' }, 'HEADING_TO_PICKUP'),
  true
);
assert.equal(
  shouldShowLiveNavToDest({ ...coords, pickup_location_source: 'map', destination_location_source: 'manual' }, 'IN_TRANSIT'),
  false
);
assert.equal(requiresRouteDistanceCounter({ pickup_location_source: 'map', destination_location_source: 'map', ...coords }), false);
assert.equal(requiresRouteDistanceCounter({ pickup_location_source: 'manual', destination_location_source: 'map' }), true);

console.log('trip-location-rules: ok');
