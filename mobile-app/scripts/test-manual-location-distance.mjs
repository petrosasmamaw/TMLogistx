/**
 * Manual address + GPS distance counter verification.
 * Run: node scripts/test-manual-location-distance.mjs
 */
import assert from 'node:assert/strict';
import { configureStore } from '@reduxjs/toolkit';
import gpsReducer, {
  startDriveTracking,
  appendDriveRoutePoint,
  endDriveTracking,
} from '../src/store/gpsSlice.js';
import { sumPathDistanceKm } from '../src/utils/distance.js';
import {
  isPickupManual,
  isDestManual,
  requiresRouteDistanceCounter,
  shouldShowLiveNavToPickup,
  shouldShowLiveNavToDest,
  shouldShowMovementCenterPickupPin,
  shouldShowMovementCenterDestPin,
} from '../src/utils/tripLocationRules.js';
import { buildDistanceCompletionPayload } from '../src/utils/tripDistancePayload.js';

const coords = {
  pickup_latitude: 9.01,
  pickup_longitude: 38.75,
  destination_latitude: 9.05,
  destination_longitude: 38.8,
};

console.log('--- Manual location rules ---');

const manualStartMapDest = {
  pickup_location: 'Black Lion Hospital',
  pickup_location_source: 'manual',
  destination_location: 'Bole',
  destination_location_source: 'map',
  destination_latitude: 9.05,
  destination_longitude: 38.8,
};
assert.equal(isPickupManual(manualStartMapDest), true);
assert.equal(isDestManual(manualStartMapDest), false);
assert.equal(shouldShowMovementCenterPickupPin(manualStartMapDest), false);
assert.equal(shouldShowMovementCenterDestPin(manualStartMapDest), true);
assert.equal(shouldShowLiveNavToPickup(manualStartMapDest, 'ACCEPTED'), false);
assert.equal(shouldShowLiveNavToDest(manualStartMapDest, 'IN_TRANSIT'), true);
assert.equal(requiresRouteDistanceCounter(manualStartMapDest), true);

const mapStartManualDest = {
  ...coords,
  pickup_location_source: 'map',
  destination_location: 'Client office (call for gate)',
  destination_location_source: 'manual',
  destination_latitude: null,
  destination_longitude: null,
};
assert.equal(shouldShowMovementCenterPickupPin(mapStartManualDest), true);
assert.equal(shouldShowMovementCenterDestPin(mapStartManualDest), false);
assert.equal(shouldShowLiveNavToPickup(mapStartManualDest, 'HEADING_TO_PICKUP'), true);
assert.equal(shouldShowLiveNavToDest(mapStartManualDest, 'IN_TRANSIT'), false);

const bothManual = {
  pickup_location: 'Near stadium',
  pickup_location_source: 'manual',
  destination_location: 'Hospital ward 3',
  destination_location_source: 'manual',
};
assert.equal(shouldShowMovementCenterPickupPin(bothManual), false);
assert.equal(shouldShowMovementCenterDestPin(bothManual), false);
assert.equal(shouldShowLiveNavToPickup(bothManual, 'ACCEPTED'), false);
assert.equal(shouldShowLiveNavToDest(bothManual, 'IN_TRANSIT'), false);

const fullyMapped = { ...coords, pickup_location_source: 'map', destination_location_source: 'map' };
assert.equal(requiresRouteDistanceCounter(fullyMapped), false);
assert.equal(shouldShowLiveNavToPickup(fullyMapped, 'ACCEPTED'), true);
assert.equal(shouldShowLiveNavToDest(fullyMapped, 'IN_TRANSIT'), true);

console.log('--- GPS path / distance counter ---');

const path = [
  { latitude: 9.01, longitude: 38.75 },
  { latitude: 9.012, longitude: 38.752 },
  { latitude: 9.018, longitude: 38.76 },
  { latitude: 9.025, longitude: 38.77 },
];
const pathKm = sumPathDistanceKm(path);
assert.ok(pathKm > 1.5 && pathKm < 4, `path km plausible: ${pathKm}`);

const store = configureStore({ reducer: { gps: gpsReducer } });
store.dispatch(startDriveTracking({ latitude: 9.01, longitude: 38.75 }));
for (let i = 1; i < path.length; i++) {
  store.dispatch(appendDriveRoutePoint(path[i]));
}
store.dispatch(endDriveTracking(path[path.length - 1]));
const session = store.getState().gps.driveSession;
assert.equal(session.isEnded, true);
assert.ok(session.gpsTrackedKm > 1, `redux gpsTrackedKm ${session.gpsTrackedKm}`);

const payload = buildDistanceCompletionPayload(session, false, '', manualStartMapDest);
assert.equal(payload.distance_source, 'GPS_TRACKED');
assert.ok(payload.actual_distance_km > 0.05);
assert.equal(payload.manual_distance_km, null);

const manualOverride = buildDistanceCompletionPayload(session, true, '12.5', manualStartMapDest);
assert.equal(manualOverride.distance_source, 'MANUAL');
assert.equal(manualOverride.actual_distance_km, 12.5);

const mapOnlyPayload = buildDistanceCompletionPayload(
  { isEnded: true, gpsTrackedKm: 0, mapEstimatedKm: 8.2, startLat: 9, startLng: 38, endLat: 9.1, endLng: 38.1 },
  false,
  '',
  fullyMapped
);
assert.equal(mapOnlyPayload.distance_source, 'MAP_ESTIMATE');
assert.equal(mapOnlyPayload.actual_distance_km, 8.2);

console.log('manual-location-distance: all ok');
