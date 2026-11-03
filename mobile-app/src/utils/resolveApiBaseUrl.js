import { Platform } from 'react-native';
import Constants from 'expo-constants';

const LOCAL_HOST_RE = /localhost|127\.0\.0\.1/i;

/** PC LAN IP from Expo Metro (same host the phone uses to load the JS bundle). */
export function getExpoDevMachineHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;
  if (!hostUri || typeof hostUri !== 'string') return null;
  const host = hostUri.split(':')[0]?.trim();
  if (!host || LOCAL_HOST_RE.test(host)) return null;
  return host;
}

/** On a physical device, localhost in .env must point at the dev PC, not the phone. */
export function rewriteLocalhostForDevice(url) {
  if (!url || Platform.OS === 'web') return url?.trim().replace(/\/$/, '') || url;
  const trimmed = url.trim().replace(/\/$/, '');
  if (!LOCAL_HOST_RE.test(trimmed)) return trimmed;
  const devHost = getExpoDevMachineHost();
  if (!devHost) return trimmed;
  return trimmed.replace(LOCAL_HOST_RE, devHost);
}

export function resolveApiBaseUrl() {
  const fromEnv =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL
      ? process.env.EXPO_PUBLIC_API_BASE_URL.trim()
      : '';

  if (Platform.OS === 'web') {
    if (fromEnv && !fromEnv.includes('10.0.2.2')) {
      return fromEnv.replace(/\/$/, '');
    }
    return 'http://localhost:5000/api';
  }

  if (fromEnv) {
    return rewriteLocalhostForDevice(fromEnv);
  }

  const devHost = getExpoDevMachineHost();
  if (devHost) {
    return `http://${devHost}:5000/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return 'http://localhost:5000/api';
}

export function resolveSocketBaseUrl() {
  const fromSocket = (process.env.EXPO_PUBLIC_SOCKET_URL || '').replace(/\/$/, '');
  if (fromSocket) {
    return rewriteLocalhostForDevice(fromSocket);
  }
  const api = resolveApiBaseUrl();
  return api.replace(/\/api\/?$/i, '');
}
