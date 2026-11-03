import React, { useEffect, useImperativeHandle, forwardRef, useState, useRef } from 'react';
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
import useDriveDistanceCounter from '../hooks/useDriveDistanceCounter';
import { buildDistanceCompletionPayload } from '../utils/tripDistancePayload';
import { requiresRouteDistanceCounter } from '../utils/tripLocationRules';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import store from '../store';

export { buildDistanceCompletionPayload } from '../utils/tripDistancePayload';

const DriverTripDistancePanel = forwardRef(function DriverTripDistancePanel(
  { trip, onDistanceReady, autoStart = true },
  ref
) {
  const { t } = useTranslation();
  const [manualMode, setManualMode] = useState(false);
  const [manualKm, setManualKm] = useState('');

  const showCounter = requiresRouteDistanceCounter(trip);
  const counter = useDriveDistanceCounter(showCounter ? trip?.id : null);
  const { driveSession, startCounter, endCounter, resetCounter } = counter;
  const autoStartedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    endCounter,
    resetCounter,
    stopWatch: counter.stopWatch,
  }));

  useEffect(() => {
    autoStartedRef.current = false;
  }, [trip?.id]);

  useEffect(() => {
    if (!showCounter || !autoStart || !trip) return undefined;
    const st = String(trip.status || '').toUpperCase();
    if (st !== 'IN_TRANSIT' && st !== 'PASSENGER_PICKED_UP') return undefined;
    if (driveSession.isTracking || driveSession.isEnded || autoStartedRef.current) return undefined;
    autoStartedRef.current = true;
    void startCounter(true);
    return undefined;
  }, [
    trip?.status,
    trip?.id,
    showCounter,
    autoStart,
    driveSession.isTracking,
    driveSession.isEnded,
    startCounter,
  ]);

  useEffect(() => {
    const payload = buildDistanceCompletionPayload(driveSession, manualMode, manualKm, trip);
    onDistanceReady?.(payload);
  }, [driveSession, manualMode, manualKm, trip, onDistanceReady]);

  const handleStartDrive = async (silent = false) => {
    try {
      await startCounter(true);
      if (!silent) {
        Alert.alert(t('driveDistanceStartedTitle'), t('driveDistanceStartedMsg'));
      }
    } catch (err) {
      Alert.alert('Location', err.message || 'Could not start distance counter');
    }
  };

  const handleEndDrive = async (silent = false) => {
    await endCounter();
    const session = store.getState().gps.driveSession;
    if (!manualMode && session.gpsTrackedKm < 0.2) {
      setManualKm(String(session.mapEstimatedKm || trip?.distance_km || ''));
    }
    if (!silent) {
      Alert.alert(t('driveDistanceEndedTitle'), t('driveDistanceEndedMsg'));
    }
  };

  if (!showCounter) {
    return null;
  }

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
          onPress={() => handleStartDrive(false)}
          disabled={driveSession.isTracking}
        >
          <View style={styles.btnIconRow}>
            <Ionicons name="play" size={16} color={colors.ink} />
            <Text style={styles.btnText}>{t('driveDistanceStart')}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnEnd, !driveSession.isTracking && styles.btnDisabled]}
          onPress={() => handleEndDrive(false)}
          disabled={!driveSession.isTracking}
        >
          <View style={styles.btnIconRow}>
            <Ionicons name="stop" size={16} color={colors.ink} />
            <Text style={styles.btnText}>{t('driveDistanceEnd')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {driveSession.isTracking && (
        <View style={styles.liveCounter}>
          <Text style={styles.liveCounterLabel}>Live trip distance</Text>
          <Text style={styles.liveCounterValue}>{displayGps} km</Text>
        </View>
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
});

export default DriverTripDistancePanel;

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
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  btnIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  liveCounter: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.amberMuted,
    borderWidth: 1,
    borderColor: colors.amber,
    alignItems: 'center',
  },
  liveCounterLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  liveCounterValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
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