import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DRIVER_LOCATION_TASK = 'tmlogistx-driver-location';

const GPS_KEYS = {
  vehicle: 'tmlogistx_gps_vehicle_id',
  trip: 'tmlogistx_gps_trip_id',
  token: 'tmlogistx_token'
};

function apiBase() {
  const fromEnv =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL
      ? process.env.EXPO_PUBLIC_API_BASE_URL.trim().replace(/\/$/, '')
      : '';
  return fromEnv || 'https://tmlogistx.onrender.com/api';
}

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = data?.locations;
  const loc = locations?.[0];
  if (!loc?.coords) return;

  try {
    const token = await AsyncStorage.getItem(GPS_KEYS.token);
    if (!token) return;
    const vehicleId = await AsyncStorage.getItem(GPS_KEYS.vehicle);
    const tripId = await AsyncStorage.getItem(GPS_KEYS.trip);
    const body = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      speed: loc.coords.speed ?? 0,
      heading: loc.coords.heading ?? 0
    };
    if (vehicleId) body.vehicle_id = vehicleId;
    if (tripId) body.trip_assignment_id = tripId;

    await fetch(`${apiBase()}/tracking/gps`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch {
    /* background ping best-effort */
  }
});

export async function persistGpsContext({ vehicleId, tripAssignmentId }) {
  if (vehicleId) {
    await AsyncStorage.setItem(GPS_KEYS.vehicle, vehicleId);
  } else {
    await AsyncStorage.removeItem(GPS_KEYS.vehicle);
  }
  if (tripAssignmentId) {
    await AsyncStorage.setItem(GPS_KEYS.trip, tripAssignmentId);
  } else {
    await AsyncStorage.removeItem(GPS_KEYS.trip);
  }
}

export async function persistAuthTokenForGps(token) {
  if (token) await AsyncStorage.setItem(GPS_KEYS.token, token);
  else await AsyncStorage.removeItem(GPS_KEYS.token);
}
