import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  getNotificationPermission,
  onNotificationPermissionChange,
  requestNotificationAccess,
} from '../services/localNotifications';
import {
  ensureLocationPermissionOnly,
  getLocationPermission,
} from '../utils/tripPermissions';

/**
 * Live notification + location permission for profile toggles (staff & driver).
 */
export default function useDevicePermissions(active = true) {
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [locationPermission, setLocationPermission] = useState('default');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    const [notif, loc] = await Promise.all([
      getNotificationPermission(),
      getLocationPermission(),
    ]);
    setNotificationPermission(notif);
    setLocationPermission(loc);
  }, []);

  useEffect(() => onNotificationPermissionChange(setNotificationPermission), []);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await refresh();
    };

    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [active, refresh]);

  const requestNotifications = useCallback(async () => {
    setRefreshing(true);
    try {
      await requestNotificationAccess({ fromSettingsButton: false });
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const requestLocation = useCallback(async () => {
    setRefreshing(true);
    try {
      await ensureLocationPermissionOnly({
        purpose: 'your position on the live trip map',
        promptSettings: true,
      });
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  return {
    notificationPermission,
    locationPermission,
    notificationsGranted: notificationPermission === 'granted',
    locationGranted: locationPermission === 'granted',
    refreshing,
    refresh,
    requestNotifications,
    requestLocation,
  };
}
