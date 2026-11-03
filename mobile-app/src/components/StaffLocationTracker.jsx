import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { updateLocation } from '../store/gpsSlice';
import { ensureLocationPermissionOnly } from '../utils/tripPermissions';
import {
  getFreshDevicePositionAsync,
  watchLocationOptions,
} from '../utils/deviceLocation';

const INTERVAL_MS =
  Number(process.env.EXPO_PUBLIC_GPS_UPDATE_INTERVAL_MS) > 0
    ? Number(process.env.EXPO_PUBLIC_GPS_UPDATE_INTERVAL_MS)
    : 8000;

/** Keeps staff GPS in Redux (same store as driver) for live map pin. */
export default function StaffLocationTracker() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const watchRef = useRef(null);

  useEffect(() => {
    if (user?.role !== 'STAFF') return undefined;

    let cancelled = false;

    const applyCoords = (coords) => {
      dispatch(
        updateLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speedKmh: coords.speed != null ? Math.round(coords.speed * 3.6) : 0,
          heading: coords.heading ?? 0,
        })
      );
    };

    const start = async () => {
      const allowed = await ensureLocationPermissionOnly({
        purpose: 'your location on the live trip map',
        promptSettings: false,
      });
      if (!allowed || cancelled) return;

      if (watchRef.current?.remove) {
        watchRef.current.remove();
        watchRef.current = null;
      }

      try {
        const pos = await getFreshDevicePositionAsync();
        if (!cancelled) applyCoords(pos.coords);
      } catch {
        /* watch will retry */
      }

      watchRef.current = await Location.watchPositionAsync(
        watchLocationOptions({
          timeInterval: INTERVAL_MS,
          distanceInterval: 10,
        }),
        (loc) => {
          if (!cancelled) applyCoords(loc.coords);
        }
      );
    };

    start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
    });

    return () => {
      cancelled = true;
      sub.remove();
      if (watchRef.current?.remove) watchRef.current.remove();
    };
  }, [dispatch, user?.role, user?.id]);

  return null;
}
