import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';
import { ensureNotificationPermission } from '../services/localNotifications';
import { openAppSettings, openLocationSettings } from './openDeviceSettings';

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export async function getLocationPermission() {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status === 'granted') return 'granted';
    if (perm.status === 'denied') return 'denied';
    return 'default';
  } catch {
    return 'unsupported';
  }
}

function promptLocationSettings() {
  if (Platform.OS === 'web') return;
  Alert.alert(
    'Turn on location',
    'Location is off. Open settings and allow location for live maps and trip tracking.',
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Open settings',
        onPress: () => {
          void openAppSettings();
        },
      },
    ]
  );
}

async function ensureLocationServicesOn() {
  try {
    const on = await Location.hasServicesEnabledAsync();
    if (on) return true;
    if (Platform.OS === 'web') return true;
    Alert.alert(
      'Turn on location services',
      'Device location (GPS) is off. Turn it on to show your position on the map.',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Open settings', onPress: () => void openLocationSettings() },
      ]
    );
    return false;
  } catch {
    return true;
  }
}

/** Request location only (profile toggle — does not chain notification prompt). */
export async function ensureLocationPermissionOnly({
  purpose = 'your position on the live trip map',
  promptSettings = true,
} = {}) {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status === 'granted') {
      return ensureLocationServicesOn();
    }
    if (perm.canAskAgain !== false) {
      perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        return ensureLocationServicesOn();
      }
    }
    if (promptSettings) promptLocationSettings();
    else {
      Alert.alert(
        'Location needed',
        `Allow location when your device asks, so we can show ${purpose}.`
      );
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Ask for notifications and location every time this runs while either is missing
 * (system dialog when allowed; settings hint when blocked on native).
 */
export async function ensureLocationAndNotifications(
  purpose = 'your pickup, live map, and trip alerts',
  { promptNotifications = false } = {}
) {
  await ensureNotificationPermission({
    promptSettings: promptNotifications,
    forceSettingsPrompt: false,
  });
  return ensureLocationPermissionOnly({ purpose, promptSettings: true });
}
