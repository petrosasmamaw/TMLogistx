import { Platform } from 'react-native';
import markerBase64 from '../utils/mapMarkerBase64';
import {
  getDriverCarIconUri,
  getDestinationMarkerIconUri,
  getStaffMarkerIconUri,
} from '../utils/mapMarkerAssets';

/**
 * PNG data-URIs embedded in the app bundle (WebView-safe on Android APK).
 */
export default function useMapMarkerIconUris() {
  if (Platform.OS === 'web') {
    return {
      car: getDriverCarIconUri(),
      staff: getStaffMarkerIconUri(),
      dest: getDestinationMarkerIconUri(),
    };
  }
  return markerBase64;
}
