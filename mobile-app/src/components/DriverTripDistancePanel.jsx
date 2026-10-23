import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  startDriveTracking,
  appendDriveRoutePoint,
  endDriveTracking,
  updateLocation
} from '../store/gpsSlice';
import { estimateMapRouteKm } from '../utils/distance';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';

/**
 * Resolves distance payload for trip completion (GPS path, map estimate, or manual).
 */
export function buildDistanceCompletionPayload(driveSession, manualMode, manualKmText, trip) {
  const manualVal = parseFloat(String(manualKmText).replace(',', '.'));
  const gpsKm = driveSession.gpsTrackedKm || 0;
  const mapFromSession = driveSession.mapEstimatedKm;
  const pickupLat = trip?.pickup_latitude ?? trip?.pickup_lat;
  const pickupLng = trip?.pickup_longitude ?? trip?.pickup_lng;
  const destLat = trip?.destination_latitude ?? trip?.destination_lat;
  const destLng = trip?.destination_longitude ?? trip?.destination_lng;
  const mapFromTrip =
    pickupLat != null && destLat != null
      ? estimateMapRouteKm(pickupLat, pickupLng, destLat, destLng)
      : null;
  const mapKm = mapFromSession ?? mapFromTrip ?? gpsKm;

  if (manualMode && !Number.isNaN(manualVal) && manualVal > 0) {
    return {
      distance_source: 'MANUAL',
      manual_distance_km: manualVal,
      gps_tracked_distance_km: gpsKm,
      map_estimated_distance_km: mapKm,
      actual_distance_km: manualVal,
      drive_start_lat: driveSession.startLat,
      drive_start_lng: driveSession.startLng,
      drive_end_lat: driveSession.endLat,
      drive_end_lng: driveSession.endLng
    };
  }

  const useGps = driveSession.isEnded && gpsKm > 0.1;
  const finalKm = useGps ? gpsKm : mapKm;
  return {
    distance_source: useGps ? 'GPS_TRACKED' : 'MAP_ESTIMATE',
    gps_tracked_distance_km: gpsKm,
    map_estimated_distance_km: mapKm,
    manual_distance_km: null,
    actual_distance_km: finalKm,
    drive_start_lat: driveSession.startLat,
    drive_start_lng: driveSession.startLng,
    drive_end_lat: driveSession.endLat,
    drive_end_lng: driveSession.endLng
  };
}

export default function DriverTripDistancePanel({ trip, onDistanceReady }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const gps = useSelector((state) => state.gps.currentLocation);
  const driveSession = useSelector((state) => state.gps.driveSession);

  const [manualMode, setManualMode] = useState(false);
  const [manualKm, setManualKm] = useState('');
  const locationWatchRef = useRef(null);

  useEffect(() => {
    const payload = buildDistanceCompletionPayload(driveSession, manualMode, manualKm, trip);
    onDistanceReady?.(payload);
  }, [driveSession, manualMode, manualKm, trip, onDistanceReady]);

  useEffect(() => {
    return () => {
      if (locationWatchRef.current?.remove) {
        locationWatchRef.current.remove();
      }
    };
  }, []);

  const readCurrentCoords = async () => {
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        };
      }
    } catch {
      // expo-location optional / unavailable
    }
    return {
      latitude: gps.latitude,
      longitude: gps.longitude,
      accuracy: gps.accuracy
    };
  };

  const startWatching = async () => {
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 25,
          timeInterval: 5000
        },
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          dispatch(updateLocation({ latitude, longitude, accuracy }));
          dispatch(appendDriveRoutePoint({ latitude, longitude }));
        }
      );
    } catch {
      // Redux GPS / simulated updates only
    }
  };

  const handleStartDrive = async () => {
    const coords = await readCurrentCoords();
    dispatch(startDriveTracking(coords));
    dispatch(updateLocation(coords));
    await startWatching();
    Alert.alert(t('driveDistanceStartedTitle'), t('driveDistanceStartedMsg'));
  };

  const handleEndDrive = async () => {
    if (locationWatchRef.current?.remove) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }
    const coords = await readCurrentCoords();
    dispatch(endDriveTracking(coords));
    dispatch(updateLocation(coords));
    if (!manualMode && driveSession.gpsTrackedKm < 0.2) {
      setManualKm(String(driveSession.mapEstimatedKm || trip?.distance_km || ''));
    }
    Alert.alert(t('driveDistanceEndedTitle'), t('driveDistanceEndedMsg'));
  };

  const displayGps = driveSession.gpsTrackedKm?.toFixed(2) ?? '0.00';
  const displayMap =
    driveSession.mapEstimatedKm != null
      ? driveSession.mapEstimatedKm.toFixed(2)
      : '—';

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t('driveDistanceTitle')}</Text>
      <Text style={styles.sub}>{t('driveDistanceSubtitle')}</Text>

      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>{t('driveDistanceGpsPath')}</Text>
          <Text style={styles.metricValue}>{displayGps} km</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>{t('driveDistanceMapEstimate')}</Text>
          <Text style={styles.metricValue}>{displayMap} km</Text>
        </View>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, driveSession.isTracking && styles.btnActive]}
          onPress={handleStartDrive}
          disabled={driveSession.isTracking}
        >
          <Text style={styles.btnText}>▶ {t('driveDistanceStart')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnEnd, !driveSession.isTracking && styles.btnDisabled]}
          onPress={handleEndDrive}
          disabled={!driveSession.isTracking}
        >
          <Text style={styles.btnText}>■ {t('driveDistanceEnd')}</Text>
        </TouchableOpacity>
      </View>

      {driveSession.isTracking && (
        <Text style={styles.liveHint}>{t('driveDistanceTrackingLive')}</Text>
      )}

      <View style={styles.manualRow}>
        <Text style={styles.manualLabel}>{t('driveDistanceManualMode')}</Text>
        <Switch
          value={manualMode}
          onValueChange={setManualMode}
          trackColor={{ false: colors.borderPrimary, true: colors.amberMuted }}
          thumbColor={manualMode ? colors.amber : colors.textMuted}
        />
      </View>

      {manualMode && (
        <View style={styles.manualInputWrap}>
          <Text style={styles.manualHint}>{t('driveDistanceManualHint')}</Text>
          <TextInput
            style={styles.manualInput}
            value={manualKm}
            onChangeText={setManualKm}
            placeholder={t('driveDistanceManualPlaceholder')}
            placeholderTextColor={colors.textMuted}
            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 16
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderPrimary
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  metricValue: {
    color: colors.cyanLight,
    fontSize: 18,
    fontWeight: '800'
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8
  },
  btn: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cyan
  },
  btnActive: {
    backgroundColor: colors.amberMuted,
    borderColor: colors.amber
  },
  btnEnd: {
    borderColor: colors.success
  },
  btnDisabled: {
    opacity: 0.45
  },
  btnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800'
  },
  liveHint: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center'
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary
  },
  manualLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8
  },
  manualHint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 6
  },
  manualInputWrap: {
    marginTop: 8
  },
  manualInput: {
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  }
});
