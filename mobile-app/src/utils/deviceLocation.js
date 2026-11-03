import * as Location from 'expo-location';
import { Platform } from 'react-native';

/** Do not accept OS/browser cached fixes (avoids old school / WiFi guesses). */
const DEFAULT_MAX_AGE_MS = 0;
const WEB_TIMEOUT_MS = 22000;
const NATIVE_TIMEOUT_MS = 18000;
const RETRY_DELAY_MS = 800;
/** Worse than ~750m is usually IP/WiFi positioning, not GPS. */
export const POOR_ACCURACY_M = 750;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCoords(raw) {
  return {
    latitude: raw.latitude,
    longitude: raw.longitude,
    accuracy: raw.accuracy ?? null,
    altitude: raw.altitude ?? null,
    heading: raw.heading ?? 0,
    speed: raw.speed ?? 0,
  };
}

function getWebPosition({ maxAgeMs, timeoutMs }) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          coords: normalizeCoords(pos.coords),
          timestamp: pos.timestamp ?? Date.now(),
        }),
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        maximumAge: maxAgeMs ?? DEFAULT_MAX_AGE_MS,
        timeout: timeoutMs ?? WEB_TIMEOUT_MS,
      }
    );
  });
}

function withTimeout(promise, ms, label = 'Location') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

async function readNativePosition(options = {}) {
  const timeoutMs = options.timeoutMs ?? NATIVE_TIMEOUT_MS;
  if (Platform.OS === 'android') {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      /* optional */
    }
  }

  const readOnce = (accuracy) =>
    withTimeout(
      Location.getCurrentPositionAsync({ accuracy }),
      timeoutMs,
      'GPS fix'
    );

  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 120000 });
    if (last?.coords?.latitude != null && last?.coords?.longitude != null) {
      const age = Date.now() - (last.timestamp ?? 0);
      if (age < 90000) {
        return {
          coords: normalizeCoords(last.coords),
          timestamp: last.timestamp ?? Date.now(),
        };
      }
    }
  } catch {
    /* continue with fresh read */
  }

  try {
    const loc = await readOnce(Location.Accuracy.Balanced);
    return {
      coords: normalizeCoords(loc.coords),
      timestamp: loc.timestamp ?? Date.now(),
    };
  } catch {
    const loc = await readOnce(Location.Accuracy.Low);
    return {
      coords: normalizeCoords(loc.coords),
      timestamp: loc.timestamp ?? Date.now(),
    };
  }
}

/**
 * Fresh device position (GPS-first). Retries once when accuracy is very poor.
 * Returns expo-like `{ coords, timestamp }`.
 */
export async function getFreshDevicePositionAsync(options = {}) {
  const {
    maxAgeMs = DEFAULT_MAX_AGE_MS,
    timeoutMs = Platform.OS === 'web' ? WEB_TIMEOUT_MS : NATIVE_TIMEOUT_MS,
    retryIfPoor = true,
  } = options;

  const read = async () => {
    if (Platform.OS === 'web') {
      return getWebPosition({ maxAgeMs, timeoutMs });
    }
    return readNativePosition({ timeoutMs });
  };

  let fix = await read();
  if (
    retryIfPoor &&
    fix.coords.accuracy != null &&
    fix.coords.accuracy > POOR_ACCURACY_M
  ) {
    await sleep(RETRY_DELAY_MS);
    fix = await read();
  }
  return fix;
}

export function watchLocationOptions(overrides = {}) {
  return {
    accuracy: Location.Accuracy.Highest,
    timeInterval: overrides.timeInterval ?? 8000,
    distanceInterval: overrides.distanceInterval ?? 8,
    ...overrides,
  };
}

export function isReliableFix(coords) {
  if (!coords || coords.latitude == null || coords.longitude == null) return false;
  if (coords.accuracy == null) return true;
  return coords.accuracy <= POOR_ACCURACY_M;
}

export function formatAccuracyHint(accuracy) {
  if (accuracy == null) return '';
  if (accuracy <= 35) return ' · GPS';
  if (accuracy <= 150) return ` · ~${Math.round(accuracy)} m`;
  return ` · low accuracy (~${Math.round(accuracy)} m)`;
}

/** Map center fallback only — never use as a live user pin. */
export const ETHIOPIA_MAP_CENTER = { lat: 9.0192, lng: 38.7525 };

export async function tryFreshCoordsForMapSeed(existingLat, existingLng, options = {}) {
  const { allowCachedHint = true } = options;
  if (allowCachedHint && existingLat != null && existingLng != null) {
    return { lat: existingLat, lng: existingLng };
  }
  try {
    const pos = await getFreshDevicePositionAsync();
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    if (existingLat != null && existingLng != null) {
      return { lat: existingLat, lng: existingLng };
    }
    return { lat: ETHIOPIA_MAP_CENTER.lat, lng: ETHIOPIA_MAP_CENTER.lng };
  }
}
