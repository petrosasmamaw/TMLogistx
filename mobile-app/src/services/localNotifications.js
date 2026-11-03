import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { openAppSettings, openNotificationSettings } from '../utils/openDeviceSettings';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';

const ANDROID_CHANNEL_ID = 'trip-updates';
const IS_WEB = Platform.OS === 'web';
const SETTINGS_PROMPT_INTERVAL_MS = 5 * 60 * 1000;
const DEDUPE_TTL_MS = 10 * 60 * 1000;

let handlerReady = false;
let channelReady = false;
let lastSettingsPrompt = 0;
const sentKeys = new Map();
const permissionListeners = new Set();

function ensureHandler() {
  if (IS_WEB || handlerReady) return;
  try {
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerReady = true;
  } catch {
    /* Expo Go may lack some native pieces; local schedule still works when available */
  }
}

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
  ensureHandler();
  await setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Trip updates',
    importance: AndroidImportance.MAX,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#0b7a5a',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
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
    ensureHandler();
    const { status, canAskAgain } = await getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied' && canAskAgain === false) return 'denied';
    return 'default';
  } catch {
    return 'unsupported';
  }
}

function promptOpenSettings(force = false) {
  if (IS_WEB) return;
  const now = Date.now();
  if (!force && now - lastSettingsPrompt < SETTINGS_PROMPT_INTERVAL_MS) return;
  lastSettingsPrompt = now;
  Alert.alert(
    'Turn on notifications',
    'Notifications are off. Enable them to get trip assignments, driver arrivals and trip updates.',
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Open settings',
        onPress: () => {
          void openNotificationSettings();
        },
      },
    ]
  );
}

async function requestAndroidPostNotifications() {
  if (Platform.OS !== 'android') return true;
  const apiLevel =
    typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  if (!apiLevel || apiLevel < 33) return true;
  try {
    const perm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    const already = await PermissionsAndroid.check(perm);
    if (already) return true;
    const result = await PermissionsAndroid.request(perm, {
      title: 'Allow notifications',
      message: 'Get trip assignments, driver arrival, and trip update alerts.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    });
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

function permissionFromExpoResult(result) {
  if (result?.status === 'granted') return 'granted';
  if (result?.status === 'denied' && result?.canAskAgain === false) return 'denied';
  return 'default';
}

/** System dialog when possible; settings when blocked. */
export async function requestNotificationAccess({ fromSettingsButton = false } = {}) {
  if (IS_WEB) {
    return ensureNotificationPermission({ promptSettings: false });
  }

  ensureHandler();
  try {
    await ensureAndroidChannel();
  } catch {
    /* Expo Go may fail channel setup; permission dialog can still work */
  }

  let existing;
  try {
    existing = await getPermissionsAsync();
  } catch {
    emitPermission('unsupported');
    Alert.alert(
      'Notifications unavailable',
      'This build cannot request notifications. Use a dev build or enable notifications for Expo Go in system settings.'
    );
    return false;
  }

  if (existing.status === 'granted') {
    emitPermission('granted');
    return true;
  }

  const blocked = existing.status === 'denied' && existing.canAskAgain === false;
  if (blocked || fromSettingsButton) {
    await openNotificationSettings();
    const after = await getNotificationPermission();
    emitPermission(after);
    return after === 'granted';
  }

  await requestAndroidPostNotifications();

  try {
    const requested = await requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    const granted = requested.status === 'granted';
    emitPermission(permissionFromExpoResult(requested));
    if (!granted && requested.canAskAgain === false) {
      promptOpenSettings(true);
    }
    return granted;
  } catch {
    const after = await getNotificationPermission();
    emitPermission(after);
    return after === 'granted';
  }
}

export { openNotificationSettings };

export async function ensureNotificationPermission({
  promptSettings = true,
  forceSettingsPrompt = false,
  askLocationToo = false,
  locationPurpose = 'live trip updates on the map',
} = {}) {
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
    ensureHandler();
    try {
      await ensureAndroidChannel();
    } catch {
      /* continue */
    }
    const existing = await getPermissionsAsync();
    if (existing.status === 'granted') {
      emitPermission('granted');
      return true;
    }
    if (existing.canAskAgain !== false) {
      await requestAndroidPostNotifications();
      const requested = await requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      if (requested.status === 'granted') {
        emitPermission('granted');
        return true;
      }
      emitPermission(permissionFromExpoResult(requested));
    } else {
      emitPermission('denied');
    }
    if (promptSettings) promptOpenSettings(forceSettingsPrompt);
    if (askLocationToo) {
      const { ensureLocationAndNotifications } = await import('../utils/tripPermissions.js');
      await ensureLocationAndNotifications(locationPurpose);
    }
    return false;
  } catch {
    return false;
  }
}

async function ensureNotificationThenLocation(locationPurpose) {
  const { ensureLocationAndNotifications } = await import('../utils/tripPermissions.js');
  await ensureLocationAndNotifications(locationPurpose);
}

export async function notifyLocal(title, body) {
  if (IS_WEB) {
    if (!webSupported() || window.Notification.permission !== 'granted') return false;
    try {
      const n = new window.Notification(title, {
        body,
        tag: `tmlogistx-${Date.now()}`,
        icon: '/favicon.ico',
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
    ensureHandler();
    const { status } = await getPermissionsAsync();
    if (status !== 'granted') return false;
    await ensureAndroidChannel();
    await scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}

export async function notifyOnce(key, title, body, options = {}) {
  const { locationPurpose = 'trip alerts and your location on the map' } = options;
  const perm = await getNotificationPermission();
  if (perm !== 'granted') {
    await ensureNotificationThenLocation(locationPurpose);
  }

  if (!key) return notifyLocal(title, body);
  const now = Date.now();
  for (const [k, ts] of sentKeys) {
    if (now - ts > DEDUPE_TTL_MS) sentKeys.delete(k);
  }
  if (sentKeys.has(key)) return false;
  sentKeys.set(key, now);
  return notifyLocal(title, body);
}
