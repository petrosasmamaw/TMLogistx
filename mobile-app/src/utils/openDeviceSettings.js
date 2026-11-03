import { Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import * as IntentLauncher from 'expo-intent-launcher';

const APP_NOTIFICATION_SETTINGS = 'android.settings.APP_NOTIFICATION_SETTINGS';

/** App info screen (permissions, notifications entry on most Android versions). */
export async function openAppSettings() {
  if (Platform.OS === 'web') return false;
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
      return true;
    }
    if (typeof Linking.openSettings === 'function') {
      await Linking.openSettings();
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    await Linking.openURL('app-settings:');
    return true;
  } catch {
    return false;
  }
}

/** Android notification channel screen; iOS → app settings. */
export async function openNotificationSettings() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'ios') {
    return openAppSettings();
  }
  const pkg = Application.applicationId;
  if (pkg) {
    try {
      await IntentLauncher.startActivityAsync(APP_NOTIFICATION_SETTINGS, {
        data: `package:${pkg}`,
        extra: {
          'android.provider.extra.APP_PACKAGE': pkg,
        },
      });
      return true;
    } catch {
      /* Expo Go / OEM quirks — try without data URI */
    }
    try {
      await IntentLauncher.startActivityAsync(APP_NOTIFICATION_SETTINGS, {
        extra: {
          'android.provider.extra.APP_PACKAGE': pkg,
        },
      });
      return true;
    } catch {
      /* fall through */
    }
  }
  return openAppSettings();
}

export async function openLocationSettings() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'ios') {
    return openAppSettings();
  }
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
    );
    return true;
  } catch {
    return openAppSettings();
  }
}
