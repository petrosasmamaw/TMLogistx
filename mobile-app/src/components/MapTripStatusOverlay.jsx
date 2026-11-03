import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusBadge from './StatusBadge';
import TripPipelineStepper from './TripPipelineStepper';
import DriverThreeStepStepper from './DriverThreeStepStepper';
import AppText from './ui/AppText';
import { colors } from '../theme/colors';
import { floatingShadow, radius, spacing } from '../theme/layout';

/** Staff: compact status + pipeline at top of the map. */
export function MapStaffStatusOverlay({ status, requestLabel }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topWrap, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
      <View style={[styles.glassBar, floatingShadow(false)]}>
        <View style={styles.topRow}>
          <View style={styles.titleCol}>
            {requestLabel ? (
              <AppText style={styles.requestId} numberOfLines={1}>
                {requestLabel}
              </AppText>
            ) : null}
            <AppText style={styles.liveLabel}>Live trip</AppText>
          </View>
          <StatusBadge status={status} />
        </View>
        <TripPipelineStepper currentStatus={status} />
      </View>
    </View>
  );
}

/** Driver: compact step progress strip at top of map (actions live under the map). */
export function MapDriverProgressOverlay({ status, requestLabel }) {
  return (
    <View style={styles.driverTopWrap} pointerEvents="box-none">
      <View style={[styles.driverGlassBar, floatingShadow(false)]}>
        <View style={styles.driverTopRow}>
          {requestLabel ? (
            <AppText style={styles.driverRequestId} numberOfLines={1}>
              {requestLabel}
            </AppText>
          ) : (
            <View style={styles.titleCol} />
          )}
          <View style={styles.badgeShrink}>
            <StatusBadge status={status} compact />
          </View>
        </View>
        <DriverThreeStepStepper currentStatus={status} compact />
      </View>
    </View>
  );
}

/** Staff Uber / external ride: live position + distance on map. */
export function MapExternalRideOverlay({ provider, gpsKm, isTracking, requestLabel }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.externalWrap, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
      <View style={[styles.glassBar, floatingShadow(false)]}>
        <View style={styles.topRow}>
          <View style={styles.titleCol}>
            {requestLabel ? (
              <AppText style={styles.requestId} numberOfLines={1}>
                {requestLabel}
              </AppText>
            ) : null}
            <AppText style={styles.liveLabel}>{provider || 'Uber / RIDE'} · your location on map</AppText>
          </View>
          {isTracking ? (
            <View style={styles.kmPill}>
              <AppText style={styles.kmPillText}>{Number(gpsKm || 0).toFixed(2)} km</AppText>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: 0,
    zIndex: 15,
  },
  glassBar: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.92)' : colors.card,
    borderRadius: radius.card,
    paddingHorizontal: spacing.sheet,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  titleCol: { flex: 1 },
  requestId: { fontSize: 13, fontWeight: '800', color: colors.ink },
  liveLabel: { fontSize: 11, fontWeight: '600', color: colors.mute, marginTop: 2 },
  driverTopWrap: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    top: spacing.sm,
    zIndex: 15,
  },
  driverGlassBar: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.94)' : colors.card,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  driverTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  driverRequestId: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink,
  },
  badgeShrink: {
    flexShrink: 0,
    maxWidth: '46%',
  },
  externalWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: 0,
    zIndex: 15,
  },
  kmPill: {
    backgroundColor: colors.amberMuted,
    borderRadius: radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.amber,
  },
  kmPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
});
