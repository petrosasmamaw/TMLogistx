import { createSlice } from '@reduxjs/toolkit';
import { estimateMapRouteKm, sumPathDistanceKm } from '../utils/distance.js';

const gpsSlice = createSlice({
  name: 'gps',
  initialState: {
    currentLocation: {
      latitude: null,
      longitude: null,
      accuracy: null,
      speedKmh: 0,
      heading: 0
    },
    hasLiveFix: false,
    isBroadcasting: true,
    lastPingTimestamp: Date.now(),
    history: [],
    /** Live drive session for trip distance (start → end, GPS path + map estimate). */
    driveSession: {
      isTracking: false,
      isEnded: false,
      startedAt: null,
      endedAt: null,
      startLat: null,
      startLng: null,
      endLat: null,
      endLng: null,
      routePoints: [],
      gpsTrackedKm: 0,
      mapEstimatedKm: null
    }
  },
  reducers: {
    updateLocation: (state, action) => {
      state.currentLocation = { ...state.currentLocation, ...action.payload };
      if (action.payload?.latitude != null && action.payload?.longitude != null) {
        state.hasLiveFix = true;
      }
      state.lastPingTimestamp = Date.now();
      state.history.push({ ...state.currentLocation, timestamp: Date.now() });
      if (state.history.length > 30) state.history.shift();
    },
    toggleBroadcasting: (state) => {
      state.isBroadcasting = !state.isBroadcasting;
    },
    simulateStep: (state) => {
      // Simulate realistic road motion towards pickup/destination
      const deltaLat = (Math.random() - 0.48) * 0.001;
      const deltaLng = (Math.random() - 0.48) * 0.001;
      state.currentLocation.latitude += deltaLat;
      state.currentLocation.longitude += deltaLng;
      state.currentLocation.speedKmh = Math.floor(35 + Math.random() * 25);
      state.lastPingTimestamp = Date.now();
    },
    startDriveTracking: (state, action) => {
      const { latitude, longitude } = action.payload;
      state.driveSession = {
        isTracking: true,
        isEnded: false,
        startedAt: Date.now(),
        endedAt: null,
        startLat: latitude,
        startLng: longitude,
        endLat: null,
        endLng: null,
        routePoints: [{ latitude, longitude, timestamp: Date.now() }],
        gpsTrackedKm: 0,
        mapEstimatedKm: null
      };
    },
    appendDriveRoutePoint: (state, action) => {
      if (!state.driveSession.isTracking || state.driveSession.isEnded) return;
      const { latitude, longitude } = action.payload;
      const last = state.driveSession.routePoints[state.driveSession.routePoints.length - 1];
      const minMove = 0.00005;
      if (
        last &&
        Math.abs(last.latitude - latitude) < minMove &&
        Math.abs(last.longitude - longitude) < minMove
      ) {
        return;
      }
      state.driveSession.routePoints.push({ latitude, longitude, timestamp: Date.now() });
      state.driveSession.gpsTrackedKm = sumPathDistanceKm(state.driveSession.routePoints);
    },
    endDriveTracking: (state, action) => {
      const { latitude, longitude } = action.payload;
      state.driveSession.isTracking = false;
      state.driveSession.isEnded = true;
      state.driveSession.endedAt = Date.now();
      state.driveSession.endLat = latitude;
      state.driveSession.endLng = longitude;
      if (state.driveSession.routePoints.length) {
        state.driveSession.routePoints.push({ latitude, longitude, timestamp: Date.now() });
        state.driveSession.gpsTrackedKm = sumPathDistanceKm(state.driveSession.routePoints);
      }
      if (state.driveSession.startLat != null) {
        state.driveSession.mapEstimatedKm = estimateMapRouteKm(
          state.driveSession.startLat,
          state.driveSession.startLng,
          latitude,
          longitude
        );
      }
    },
    resetDriveTracking: (state) => {
      state.driveSession = {
        isTracking: false,
        isEnded: false,
        startedAt: null,
        endedAt: null,
        startLat: null,
        startLng: null,
        endLat: null,
        endLng: null,
        routePoints: [],
        gpsTrackedKm: 0,
        mapEstimatedKm: null
      };
    }
  }
});

export const {
  updateLocation,
  toggleBroadcasting,
  simulateStep,
  startDriveTracking,
  appendDriveRoutePoint,
  endDriveTracking,
  resetDriveTracking
} = gpsSlice.actions;
export default gpsSlice.reducer;
