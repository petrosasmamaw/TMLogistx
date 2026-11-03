import { Image, Platform } from 'react-native';

let nativeCarSource;
let nativeStaffSource;
let nativeDestSource;
try {
  nativeCarSource = require('../../assets/car.png');
} catch {
  nativeCarSource = null;
}
try {
  nativeStaffSource = require('../../assets/staff-marker.png');
} catch {
  nativeStaffSource = null;
}
try {
  nativeDestSource = require('../../assets/destination-marker.png');
} catch {
  nativeDestSource = null;
}

function resolveNativeUri(source) {
  if (!source) return '';
  try {
    const resolved = Image.resolveAssetSource(source);
    return resolved?.uri || '';
  } catch {
    return '';
  }
}

function webStaticUri(filename) {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/${filename}`;
  }
  return `/${filename}`;
}

/** Resolved URI for driver car marker (WebView + web iframe). */
export function getDriverCarIconUri() {
  if (Platform.OS === 'web') {
    return webStaticUri('car.png');
  }
  return resolveNativeUri(nativeCarSource);
}

/** Staff / user position on map. */
export function getStaffMarkerIconUri() {
  if (Platform.OS === 'web') {
    return webStaticUri('staff-marker.png');
  }
  return resolveNativeUri(nativeStaffSource);
}

/** Destination pin on map and destination pick mode. */
export function getDestinationMarkerIconUri() {
  if (Platform.OS === 'web') {
    return webStaticUri('destination-marker.png');
  }
  return resolveNativeUri(nativeDestSource);
}
