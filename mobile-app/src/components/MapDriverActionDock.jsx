import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingButton from './LoadingButton';
import { NAV_TOTAL_BOTTOM, spacing } from '../theme/layout';

/** Driver status actions pinned to bottom of the map area. */
export default function MapDriverActionDock({
  showPrimary,
  stepKey,
  stepLabel,
  updatingStatus,
  pendingStep,
  stepPendingLabel,
  onPrimaryPress,
  onIncidentPress,
}) {
  const insets = useSafeAreaInsets();
  const padBottom = NAV_TOTAL_BOTTOM + Math.max(insets.bottom, spacing.sm);

  return (
    <View style={[styles.dock, { paddingBottom: padBottom }]} pointerEvents="box-none">
      <View style={styles.inner}>
        {showPrimary ? (
          <LoadingButton
            onPress={onPrimaryPress}
            loading={updatingStatus && pendingStep === stepKey}
            loadingLabel={stepPendingLabel(stepKey)}
            label={stepLabel}
            disabled={updatingStatus}
          />
        ) : null}
        <LoadingButton
          variant="secondary"
          label="Report Breakdown / Incident"
          onPress={onIncidentPress}
          style={styles.incidentBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    bottom: 0,
    zIndex: 16,
  },
  inner: {
    gap: spacing.md,
  },
  incidentBtn: { marginTop: 0 },
});
