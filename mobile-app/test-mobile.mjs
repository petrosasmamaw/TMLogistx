// Comprehensive Phase 7 Verification Test for TMLogistx Mobile App
// Tests: Redux Store, Bilingual i18n parity (EN/AM), Workflow D transitions, and API client resilience

import { configureStore } from '@reduxjs/toolkit';
import authReducer, { switchDemoProfile, DEMO_PROFILES } from './src/store/authSlice.js';
import tripReducer, { addRequest, updateTripStatus, acceptTrip, rejectTrip } from './src/store/tripSlice.js';
import gpsReducer, { updateLocation, simulateStep } from './src/store/gpsSlice.js';
import { en } from './src/i18n/en.js';
import { am } from './src/i18n/am.js';
import apiClient from './src/api/client.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✕ [FAIL] ${testName}`);
    failed++;
  }
}

async function runMobileVerification() {
  console.log('\n======================================================');
  console.log('       TMLOGISTX PHASE 7: MOBILE APP VERIFICATION     ');
  console.log('======================================================\n');

  // 1. Bilingual i18n Dictionary Parity Test
  console.log('--- 1. Bilingual Localization (EN / አማርኛ) Parity ---');
  const enKeys = Object.keys(en);
  const amKeys = Object.keys(am);
  assert(enKeys.length > 30, `English dictionary loaded with ${enKeys.length} terms`);
  assert(amKeys.length > 30, `Amharic dictionary loaded with ${amKeys.length} terms`);

  let missingAmharic = [];
  for (const k of enKeys) {
    if (!am[k]) missingAmharic.push(k);
  }
  assert(missingAmharic.length === 0, `100% Dictionary parity (missing Amharic keys: ${missingAmharic.length})`);
  assert(am.appTitle === 'ቲኤም ሎጂስቲክስ', 'Amharic branding matches: ' + am.appTitle);
  assert(am.role_DRIVER === 'የተሽከርካሪ አሽከርካሪ', 'Driver role in Amharic: ' + am.role_DRIVER);
  assert(am.stepperComplete.includes('ጉዞውን ጨርስ'), 'Workflow completion in Amharic verified');

  // 2. Redux Store Configuration & State Architecture
  console.log('\n--- 2. Mobile Redux Store & Slice Operations ---');
  const store = configureStore({
    reducer: {
      auth: authReducer,
      trips: tripReducer,
      gps: gpsReducer
    }
  });

  const initialState = store.getState();
  assert(initialState.auth.isAuthenticated === true, 'Auth slice initialized with default demo session');
  assert(initialState.trips.requests.length >= 2, `Trips slice initialized with ${initialState.trips.requests.length} mock trips`);
  assert(initialState.gps.currentLocation.latitude === 8.9950, 'GPS telematics initialized at Addis Ababa coordinates');

  // 3. Demo Role Switching
  console.log('\n--- 3. 1-Tap Quick Demo Role Switching ---');
  store.dispatch(switchDemoProfile('user-drv-01'));
  let state = store.getState();
  assert(state.auth.user.role === 'DRIVER', 'Switched to Driver: ' + state.auth.user.full_name);
  assert(state.auth.user.vehicle_plate === 'AA-3-98214', 'Driver vehicle plate bound: ' + state.auth.user.vehicle_plate);

  store.dispatch(switchDemoProfile('user-staff-01'));
  state = store.getState();
  assert(state.auth.user.role === 'STAFF_MEMBER', 'Switched to Staff: ' + state.auth.user.full_name);

  // 4. Staff Movement Booking (Workflow B)
  console.log('\n--- 4. Staff Movement Request Creation (Workflow B) ---');
  store.dispatch(addRequest({
    pickup_location: 'African Union Compound',
    destination_location: 'Bole Int Airport',
    passenger_count: 3,
    purpose: 'Diplomatic Mission',
    pickup_datetime: new Date().toISOString()
  }));

  state = store.getState();
  assert(state.trips.requests.length >= 3, 'New staff request added to trip store');
  assert(state.trips.activeTrip.destination_location === 'Bole Int Airport', 'Active trip set to newly submitted request');

  // 5. Driver Workflow D Execution Pipeline
  console.log('\n--- 5. Driver Workflow D Stepper Progression ---');
  const tripId = state.trips.activeTrip.id;

  // Step 1: Heading to pickup
  store.dispatch(updateTripStatus({ tripId, status: 'HEADING_TO_PICKUP' }));
  assert(store.getState().trips.activeTrip.status === 'HEADING_TO_PICKUP', 'Status transitioned to HEADING_TO_PICKUP');

  // Step 2: Arrived at pickup
  store.dispatch(updateTripStatus({ tripId, status: 'ARRIVED' }));
  assert(store.getState().trips.activeTrip.status === 'ARRIVED', 'Status transitioned to ARRIVED');

  // Step 3: Passenger boarded & in transit
  store.dispatch(updateTripStatus({ tripId, status: 'IN_TRANSIT' }));
  assert(store.getState().trips.activeTrip.status === 'IN_TRANSIT', 'Status transitioned to IN_TRANSIT');

  // Step 4: Trip completed
  store.dispatch(updateTripStatus({ tripId, status: 'COMPLETED' }));
  assert(store.getState().trips.activeTrip.status === 'COMPLETED', 'Status transitioned to COMPLETED');

  // 6. GPS Telematics Simulation
  console.log('\n--- 6. GPS Telematics & Motion Simulation ---');
  const prevLat = store.getState().gps.currentLocation.latitude;
  store.dispatch(simulateStep());
  const newLat = store.getState().gps.currentLocation.latitude;
  assert(prevLat !== newLat, `GPS coordinates updated realistically: ${prevLat.toFixed(5)} -> ${newLat.toFixed(5)}`);
  assert(store.getState().gps.currentLocation.speedKmh >= 35, `Simulated vehicle speed: ${store.getState().gps.currentLocation.speedKmh} km/h`);

  // 7. API Client Resilience & Fallback Tests
  console.log('\n--- 7. API Client Endpoint & Fallback Reliability ---');
  const loginRes = await apiClient.login('driver.abebe@tmlogistx.com', 'Password@123');
  assert(loginRes.token && loginRes.user.role === 'DRIVER', 'API client login returns authentic driver session');

  const reqRes = await apiClient.getMyRequests();
  assert(reqRes.requests && reqRes.requests.length > 0, 'API client getMyRequests returned trip records');

  const statusRes = await apiClient.updateTripStatus('req-eth-001', 'ARRIVED');
  assert(statusRes.success === true, 'API client updateTripStatus acknowledged successfully');

  const gpsRes = await apiClient.sendGpsPing({ vehicle_id: 'veh-eth-01', latitude: 8.9950, longitude: 38.7800 });
  assert(gpsRes.success === true, 'API client sendGpsPing acknowledged successfully');

  const incRes = await apiClient.reportIncident({
    trip_id: 'req-eth-001',
    vehicle_id: 'veh-eth-01',
    incident_type: 'FLAT_TIRE',
    severity: 'LOW',
    description: 'Driver changing tire, 10 min delay'
  });
  assert(incRes.success === true, 'API client reportIncident acknowledged successfully');

  console.log('\n======================================================');
  console.log(`  PHASE 7 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMobileVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
