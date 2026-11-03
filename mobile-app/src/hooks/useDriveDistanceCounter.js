import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  appendDriveRoutePoint,
  endDriveTracking,
  resetDriveTracking,
  startDriveTracking,
  updateLocation,
} from '../store/gpsSlice';
import {
  getFreshDevicePositionAsync,
  watchLocationOptions,
} from '../utils/deviceLocation';

/**
 * GPS odometer for driver fleet trips and staff Uber/external rides.
 */
export default function useDriveDistanceCounter(sessionKey) {
  const dispatch = useDispatch();
  const gps = useSelector((state) => state.gps.currentLocation);
  const driveSession = useSelector((state) => state.gps.driveSession);
  const watchRef = useRef(null);

  const stopWatch = useCallback(() => {
    if (watchRef.current?.remove) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  }, []);

  const readCurrentCoords = useCallback(async () => {
    try {
      const pos = await getFreshDevicePositionAsync();
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    } catch {
      /* fall through */
    }
    return {
      latitude: gps.latitude,
      longitude: gps.longitude,
      accuracy: gps.accuracy,
    };
  }, [gps.latitude, gps.longitude, gps.accuracy]);

  const startWatch = useCallback(async () => {
    stopWatch();
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      watchRef.current = await Location.watchPositionAsync(
        watchLocationOptions({
          distanceInterval: 12,
          timeInterval: 4000,
        }),
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          dispatch(updateLocation({ latitude, longitude, accuracy }));
          dispatch(appendDriveRoutePoint({ latitude, longitude }));
        }
      );
    } catch {
      /* GPS updates may still arrive via StaffLocationTracker / driver broadcaster */
    }
  }, [dispatch, stopWatch]);

  const startCounter = useCallback(
    async (silent = false) => {
      const coords = await readCurrentCoords();
      if (coords.latitude == null || coords.longitude == null) {
        throw new Error('Location unavailable — enable GPS to start the distance counter.');
      }
      dispatch(startDriveTracking(coords));
      dispatch(updateLocation(coords));
      await startWatch();
      return coords;
    },
    [dispatch, readCurrentCoords, startWatch]
  );

  const endCounter = useCallback(async () => {
    stopWatch();
    const coords = await readCurrentCoords();
    dispatch(endDriveTracking(coords));
    dispatch(updateLocation(coords));
    return coords;
  }, [dispatch, readCurrentCoords, stopWatch]);

  const resetCounter = useCallback(() => {
    stopWatch();
    dispatch(resetDriveTracking());
  }, [dispatch, stopWatch]);

  useEffect(() => {
    if (!sessionKey) {
      return () => stopWatch();
    }
    resetCounter();
    return () => stopWatch();
  }, [sessionKey, resetCounter, stopWatch]);

  useEffect(() => {
    if (driveSession.isEnded) {
      stopWatch();
    }
  }, [driveSession.isEnded, stopWatch]);

  return {
    driveSession,
    gpsKm: driveSession.gpsTrackedKm ?? 0,
    isTracking: driveSession.isTracking,
    isEnded: driveSession.isEnded,
    startCounter,
    endCounter,
    resetCounter,
    stopWatch,
  };
}
