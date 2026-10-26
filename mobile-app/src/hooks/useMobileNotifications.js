import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  ensureNotificationPermission,
  getNotificationPermission,
  onNotificationPermissionChange,
  notifyLocal
} from '../services/localNotifications';

/**
 * Ask on login and whenever the app returns to the foreground until granted.
 * Browsers only allow the prompt after a user gesture, so web also asks on first tap.
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
      return status;
    };

    const ask = async () => {
      const status = await refresh();
      if (status === 'granted' || status === 'unsupported') return;
      await ensureNotificationPermission({ promptSettings: true });
      refresh();
    };

    ask();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') ask();
    });

    let removeGesture = () => {};
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onGesture = () => {
        if (window.Notification?.permission === 'default') {
          ensureNotificationPermission().then(refresh);
        }
      };
      window.addEventListener('click', onGesture, true);
      window.addEventListener('keydown', onGesture, true);
      removeGesture = () => {
        window.removeEventListener('click', onGesture, true);
        window.removeEventListener('keydown', onGesture, true);
      };
    }

    return () => {
      cancelled = true;
      sub.remove();
      removeGesture();
    };
  }, [active]);

  return {
    permission,
    ask: () => ensureNotificationPermission({ promptSettings: true })
  };
}

export { notifyLocal };
