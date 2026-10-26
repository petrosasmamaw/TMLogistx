import React, { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { updateLocation } from '../store/gpsSlice';

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
          heading: coords.heading ?? 0
        })
      );
    };

    const start = async () => {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== 'granted') {
        Alert.alert(
          'Location',
          'Allow location so your position shows correctly on the live trip map.'
        );
        return;
      }

      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        if (!cancelled) applyCoords(pos.coords);
      } catch {
        /* watch will retry */
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: INTERVAL_MS,
          distanceInterval: 15
        },
        (loc) => {
          if (!cancelled) applyCoords(loc.coords);
        }
      );
    };

    start();

    return () => {
      cancelled = true;
      if (watchRef.current?.remove) watchRef.current.remove();
    };
  }, [dispatch, user?.role, user?.id]);

  return null;
}
