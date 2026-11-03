import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  ensureNotificationPermission,
  getNotificationPermission,
  onNotificationPermissionChange,
  requestNotificationAccess,
  notifyLocal,
} from '../services/localNotifications';

/**
 * Tracks notification permission only — prompts via system dialog when `ask()` is called,
 * not as inline page content.
 */
export default function useMobileNotifications(active) {
  const [permission, setPermission] = useState('default');

  useEffect(() => onNotificationPermissionChange(setPermission), []);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;

    const refresh = async () => {
      const status = await getNotificationPermission();
      if (!cancelled) setPermission(status);
    };

    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [active]);

  return {
    permission,
    ask: (options) => requestNotificationAccess(options),
  };
}

export { notifyLocal };
