import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  ensureWebNotificationPermission,
  canUseWebNotifications,
  webNotificationPermission,
  onNotificationPermissionChange
} from '../utils/webNotifications.js';

const MOVEMENT_ROLES = [
  'LOGISTICS_COORDINATOR',
  'MOVEMENT_CENTER',
  'MOVEMENT_OFFICER',
  'MASTER_PERSON'
];

/**
 * Keep asking for browser notification permission until granted or permanently blocked.
 * First request must follow a click (browser rule).
 */
export default function usePortalNotifications() {
  const { role, isAuthenticated } = useSelector((state) => state.auth);
  const [permission, setPermission] = useState(() => webNotificationPermission());

  useEffect(() => {
    return onNotificationPermissionChange(setPermission);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !MOVEMENT_ROLES.includes(role)) return undefined;
    if (!canUseWebNotifications()) return undefined;

    const ask = () => {
      if (Notification.permission === 'default') {
        ensureWebNotificationPermission();
      }
    };

    window.addEventListener('click', ask, true);
    window.addEventListener('keydown', ask, true);
    return () => {
      window.removeEventListener('click', ask, true);
      window.removeEventListener('keydown', ask, true);
    };
  }, [isAuthenticated, role]);

  return { permission, ask: ensureWebNotificationPermission };
}
