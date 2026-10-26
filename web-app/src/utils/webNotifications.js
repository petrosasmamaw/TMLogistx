/** Browser notifications for movement / logistics portal. */

const PERMISSION_EVENT = 'tmlogistx:notif-permission';

function emitPermission() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(PERMISSION_EVENT, { detail: { permission: webNotificationPermission() } })
  );
}

export function onNotificationPermissionChange(handler) {
  if (typeof window === 'undefined') return () => {};
  const fn = (e) => handler(e.detail?.permission || webNotificationPermission());
  window.addEventListener(PERMISSION_EVENT, fn);
  return () => window.removeEventListener(PERMISSION_EVENT, fn);
}

export function canUseWebNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function webNotificationPermission() {
  if (!canUseWebNotifications()) return 'unsupported';
  return Notification.permission;
}

export async function ensureWebNotificationPermission() {
  if (!canUseWebNotifications()) return false;
  if (Notification.permission === 'granted') {
    emitPermission();
    return true;
  }
  if (Notification.permission === 'denied') {
    emitPermission();
    return false;
  }
  try {
    const result = await Notification.requestPermission();
    emitPermission();
    return result === 'granted';
  } catch {
    emitPermission();
    return false;
  }
}

export async function showWebNotification(title, body) {
  if (!canUseWebNotifications()) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `tmlogistx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      requireInteraction: false
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

export { PERMISSION_EVENT };
