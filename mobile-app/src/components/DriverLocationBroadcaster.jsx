import React, { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import apiClient from '../api/client';
import { store } from '../store';
import { updateLocation } from '../store/gpsSlice';
import {
  DRIVER_LOCATION_TASK,
  persistGpsContext
} from '../location/driverLocationTask';

const INTERVAL_MS =
  Number(process.env.EXPO_PUBLIC_GPS_UPDATE_INTERVAL_MS) > 0
    ? Number(process.env.EXPO_PUBLIC_GPS_UPDATE_INTERVAL_MS)
    : 10000;

const ACTIVE_ASSIGNMENT_STATUSES = [
  'ASSIGNED',
  'ACCEPTED',
  'HEADING_TO_PICKUP',
  'ARRIVED',
  'PASSENGER_PICKED_UP',
  'IN_TRANSIT'
];

function resolveGpsTargetsFromStore() {
  const trips = store.getState().trips;
  const activeTrip = trips.activeTrip;
  let vehicleId =
    activeTrip?.vehicle_id ||
    activeTrip?.assigned_vehicle_id ||
    activeTrip?.vehicle?.id ||
    null;
  let tripAssignmentId = activeTrip?.assignment_id || activeTrip?.id || null;

  const rows = trips.assignedTrips || [];
  const active = rows.find((a) => ACTIVE_ASSIGNMENT_STATUSES.includes(a.status));
  if (active) {
    tripAssignmentId = active.assignment_id || active.id;
    vehicleId = active.vehicle_id || active.assigned_vehicle_id || vehicleId;
  }
  return { vehicleId, tripAssignmentId };
}

async function resolveGpsTargets() {
  const fromStore = resolveGpsTargetsFromStore();
  if (fromStore.vehicleId && fromStore.tripAssignmentId) {
    return fromStore;
  }
  let vehicleId = fromStore.vehicleId;
  let tripAssignmentId = fromStore.tripAssignmentId;
  try {
    const ctx = await apiClient.getDriverAccidentContext();
    vehicleId = vehicleId || ctx?.data?.default_vehicle_id || ctx?.data?.default_vehicle?.id || null;
  } catch {
    /* optional */
  }
  return { vehicleId, tripAssignmentId };
}

export default function DriverLocationBroadcaster() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const watchRef = useRef(null);
  const targetsRef = useRef({ vehicleId: null, tripAssignmentId: null });

  useEffect(() => {
    if (user?.role !== 'DRIVER') return undefined;

    let cancelled = false;
    let intervalId = null;

    const sendPing = async (coords) => {
      const { vehicleId, tripAssignmentId } = targetsRef.current;
      dispatch(
        updateLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speedKmh: coords.speed != null ? Math.round(coords.speed * 3.6) : 0,
          heading: coords.heading ?? 0
        })
      );
      try {
        await apiClient.sendGpsPing({
          vehicle_id: vehicleId || undefined,
          trip_assignment_id: tripAssignmentId || undefined,
          latitude: coords.latitude,
          longitude: coords.longitude,
          speed: coords.speed ?? 0,
          heading: coords.heading ?? 0
        });
      } catch {
        /* retry on next tick */
      }
    };

    const start = async () => {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== 'granted') {
        Alert.alert(
          'Location required',
          'Allow location so dispatch can see your live position on the fleet map.'
        );
        return;
      }

      const bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.status !== 'granted' && Platform.OS !== 'web') {
        Alert.alert(
          'Background location',
          'For live map updates while driving, allow background location in settings.'
        );
      }

      targetsRef.current = await resolveGpsTargets();
      await persistGpsContext(targetsRef.current);

      const refreshTargets = async () => {
        const local = resolveGpsTargetsFromStore();
        if (local.vehicleId || local.tripAssignmentId) {
          targetsRef.current = local;
          await persistGpsContext(local);
          return;
        }
        targetsRef.current = await resolveGpsTargets();
        await persistGpsContext(targetsRef.current);
      };
      intervalId = setInterval(refreshTargets, 120000);

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: INTERVAL_MS,
          distanceInterval: 20
        },
        (loc) => {
          if (!cancelled) sendPing(loc.coords);
        }
      );

      if (Platform.OS !== 'web' && bg.status === 'granted') {
        const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
        if (!started) {
          await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: INTERVAL_MS,
            distanceInterval: 25,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: 'TMLogistx',
              notificationBody: 'Sharing live location with dispatch'
            }
          });
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (watchRef.current?.remove) watchRef.current.remove();
      Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK).then((started) => {
        if (started) Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
      });
    };
  }, [dispatch, user?.role, user?.id]);

  return null;
}
