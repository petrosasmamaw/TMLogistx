import { useEffect, useCallback } from 'react';
import { AppState, Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export default function useEnsureLocationPermission(active) {
  const ensure = useCallback(async () => {
    if (!active) return;
    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.status === 'granted') return;

      const requested = await Location.requestForegroundPermissionsAsync();
      if (requested.status === 'granted') return;

      Alert.alert(
        'Location required',
        'TMLogistx needs location access for pickup, live maps, and driver tracking. Please enable location for this app.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Open settings',
            onPress: () => {
              if (Platform.OS === 'ios') Linking.openURL('app-settings:');
              else Linking.openSettings();
            }
          },
          { text: 'Try again', onPress: () => ensure() }
        ]
      );
    } catch {
      /* retry on next foreground */
    }
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;
    ensure();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') ensure();
    });
    return () => sub.remove();
  }, [active, ensure]);
}
