import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';

const STEPS = [
  { key: 'ARRIVED', label: 'Arrive' },
  { key: 'IN_TRANSIT', label: 'Start' },
  { key: 'COMPLETED', label: 'End' },
];

function stepIndex(status) {
  if (status === 'COMPLETED') return 3;
  if (status === 'IN_TRANSIT' || status === 'PASSENGER_PICKED_UP') return 2;
  if (status === 'ARRIVED') return 1;
  return 0;
}

export default function DriverThreeStepStepper({ currentStatus, compact = false }) {
  const done = stepIndex(currentStatus);

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {STEPS.map((step, i) => {
        const n = i + 1;
        const isDone = done >= n;
        const isActive =
          (done === n - 1 && currentStatus !== 'COMPLETED' && n === done + 1) ||
          (done === 0 && n === 1 && ['ACCEPTED', 'HEADING_TO_PICKUP'].includes(currentStatus));

        return (
          <View key={step.key} style={styles.item}>
            {i > 0 ? (
              <View style={[styles.line, compact && styles.lineCompact, isDone && styles.lineDone]} />
            ) : null}
            <View
              style={[
                styles.dot,
                compact && styles.dotCompact,
                isDone && styles.dotDone,
                isActive && styles.dotActive,
                isActive && (compact ? styles.dotRingCompact : styles.dotRing),
              ]}
            >
              {isDone ? (
                <Ionicons name="checkmark" size={compact ? 10 : 12} color={colors.onPrimary} />
              ) : (
                <Text style={[styles.dotText, compact && styles.dotTextCompact, isActive && styles.dotTextOn]}>
                  {n}
                </Text>
              )}
            </View>
            <Text
              style={[styles.label, compact && styles.labelCompact, (isDone || isActive) && styles.labelOn]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 6,
    marginBottom: 14,
  },
  rowCompact: {
    marginVertical: 0,
    marginBottom: 0,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 1,
  },
  dotCompact: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginBottom: 3,
  },
  dotDone: {
    backgroundColor: colors.primary,
  },
  dotActive: {
    backgroundColor: colors.live,
  },
  dotRing: {
    borderWidth: 5,
    borderColor: colors.liveRing,
  },
  dotRingCompact: {
    borderWidth: 3,
    borderColor: colors.liveRing,
  },
  dotText: {
    ...type.badge,
    color: colors.mute,
  },
  dotTextCompact: {
    fontSize: 10,
  },
  dotTextOn: {
    color: colors.onPrimary,
  },
  label: {
    ...type.badge,
    color: colors.mute,
  },
  labelCompact: {
    fontSize: 10,
  },
  labelOn: {
    color: colors.ink,
  },
  line: {
    position: 'absolute',
    top: 10,
    left: '-50%',
    width: '100%',
    height: 2,
    backgroundColor: colors.line,
    zIndex: 0,
  },
  lineCompact: {
    top: 8,
  },
  lineDone: {
    backgroundColor: colors.primary,
  },
});
