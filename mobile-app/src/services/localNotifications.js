import { Alert, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const ANDROID_CHANNEL_ID = 'trip-updates';
const IS_WEB = Platform.OS === 'web';
const SETTINGS_PROMPT_INTERVAL_MS = 5 * 60 * 1000;
const DEDUPE_TTL_MS = 10 * 60 * 1000;

if (!IS_WEB) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });
}

let channelReady = false;
let lastSettingsPrompt = 0;
const sentKeys = new Map();
const permissionListeners = new Set();

function emitPermission(status) {
  permissionListeners.forEach((fn) => {
    try {
      fn(status);
    } catch {
      /* listener errors must not break notifications */
    }
  });
}

export function onNotificationPermissionChange(fn) {
  permissionListeners.add(fn);
  return () => permissionListeners.delete(fn);
}

function webSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Trip updates',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#2563eb',
    sound: 'default',
    enableVibrate: true,
    showBadge: true
  });
  channelReady = true;
}

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export async function getNotificationPermission() {
  if (IS_WEB) {
    if (!webSupported()) return 'unsupported';
    return window.Notification.permission;
  }
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied' && canAskAgain === false) return 'denied';
    return status === 'denied' ? 'denied' : 'default';
  } catch {
    return 'unsupported';
  }
}

function promptOpenSettings() {
  if (IS_WEB) return;
  const now = Date.now();
  if (now - lastSettingsPrompt < SETTINGS_PROMPT_INTERVAL_MS) return;
  lastSettingsPrompt = now;
  Alert.alert(
    'Turn on notifications',
    'Notifications are off. Enable them to get trip assignments, driver arrivals and trip updates.',
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Open settings',
        onPress: () => {
          if (Platform.OS === 'ios') Linking.openURL('app-settings:');
          else Linking.openSettings();
        }
      }
    ]
  );
}

/**
 * Ask the OS / browser for permission. When already blocked, points the user to settings
 * (native only; browsers need the site-settings banner instead).
 */
export async function ensureNotificationPermission({ promptSettings = true } = {}) {
  if (IS_WEB) {
    if (!webSupported()) return false;
    const current = window.Notification.permission;
    if (current === 'granted') {
      emitPermission('granted');
      return true;
    }
    if (current === 'denied') {
      emitPermission('denied');
      return false;
    }
    try {
      const result = await window.Notification.requestPermission();
      emitPermission(result);
      return result === 'granted';
    } catch {
      emitPermission(window.Notification.permission);
      return false;
    }
  }

  try {
    await ensureAndroidChannel();
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') {
      emitPermission('granted');
      return true;
    }
    if (existing.canAskAgain !== false) {
      const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true }
      });
      if (requested.status === 'granted') {
        emitPermission('granted');
        return true;
      }
    }
    emitPermission('denied');
    if (promptSettings) promptOpenSettings();
    return false;
  } catch {
    return false;
  }
}

/** Show a notification now. Never opens permission dialogs (safe to call from socket handlers). */
export async function notifyLocal(title, body) {
  if (IS_WEB) {
    if (!webSupported() || window.Notification.permission !== 'granted') return false;
    try {
      const n = new window.Notification(title, {
        body,
        tag: `tmlogistx-${Date.now()}`,
        icon: '/favicon.ico'
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

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return false;
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {})
      },
      trigger: null
    });
    return true;
  } catch {
    return false;
  }
}

/** Same event from socket + list refresh (or project room + user room) only notifies once. */
export function notifyOnce(key, title, body) {
  if (!key) return notifyLocal(title, body);
  const now = Date.now();
  for (const [k, ts] of sentKeys) {
    if (now - ts > DEDUPE_TTL_MS) sentKeys.delete(k);
  }
  if (sentKeys.has(key)) return Promise.resolve(false);
  sentKeys.set(key, now);
  return notifyLocal(title, body);
}
