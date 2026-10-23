import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const STEPS = [
  { key: 'ARRIVED', label: 'Arrive' },
  { key: 'IN_TRANSIT', label: 'Start' },
  { key: 'COMPLETED', label: 'End' }
];

function stepIndex(status) {
  if (status === 'COMPLETED') return 3;
  if (status === 'IN_TRANSIT' || status === 'PASSENGER_PICKED_UP') return 2;
  if (status === 'ARRIVED') return 1;
  return 0;
}

export default function DriverThreeStepStepper({ currentStatus }) {
  const done = stepIndex(currentStatus);

  return (
    <View style={styles.row}>
      {STEPS.map((step, i) => {
        const n = i + 1;
        const isDone = done >= n;
        const isActive = done === n - 1 && currentStatus !== 'COMPLETED' && n === done + 1;
        const active = isActive || (done === 0 && n === 1 && ['ACCEPTED', 'ASSIGNED'].includes(currentStatus));
        return (
          <View key={step.key} style={styles.item}>
            <View style={[styles.dot, isDone && styles.dotDone, active && styles.dotActive]}>
              <Text style={[styles.dotText, (isDone || active) && styles.dotTextOn]}>
                {isDone ? '✓' : n}
              </Text>
            </View>
            <Text style={[styles.label, (isDone || active) && styles.labelOn]}>{step.label}</Text>
            {i < STEPS.length - 1 && <View style={[styles.line, isDone && styles.lineDone]} />}
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
    paddingVertical: 8
  },
  item: {
    flex: 1,
    alignItems: 'center',
    position: 'relative'
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  dotActive: {
    backgroundColor: colors.amber,
    borderColor: colors.amberLight
  },
  dotText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted
  },
  dotTextOn: {
    color: '#000'
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted
  },
  labelOn: {
    color: colors.textPrimary,
    fontWeight: '800'
  },
  line: {
    position: 'absolute',
    top: 16,
    left: '58%',
    width: '84%',
    height: 2,
    backgroundColor: colors.borderPrimary,
    zIndex: -1
  },
  lineDone: {
    backgroundColor: colors.success
  }
});
