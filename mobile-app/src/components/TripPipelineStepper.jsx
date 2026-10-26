import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
const PIPELINE_STAGES = [
  { index: 1, label: 'Requested' },
  { index: 2, label: 'Accepted' },
  { index: 3, label: 'Arrived' },
  { index: 4, label: 'Started' },
  { index: 5, label: 'Ended' },
];

export function staffTripStageIndex(status) {
  const s = String(status || 'PENDING').toUpperCase();
  if (s === 'COMPLETED') return 5;
  if (s === 'IN_TRANSIT' || s === 'PASSENGER_PICKED_UP') return 4;
  if (s === 'ARRIVED') return 3;
  if (['ACCEPTED', 'ASSIGNED', 'HEADING_TO_PICKUP'].includes(s)) return 2;
  if (s === 'PENDING' || s === 'EXTERNAL_AUTHORIZED') return 1;
  return 1;
}

export const TripPipelineStepper = ({ currentStatus }) => {
  const currentIndex = staffTripStageIndex(currentStatus);

  return (
    <View style={styles.container}>
      <View style={styles.trackLine}>
        <View
          style={[
            styles.trackLineProgress,
            { width: `${Math.min(100, Math.max(0, ((currentIndex - 1) / 4) * 100))}%` }
          ]}
        />
      </View>

      <View style={styles.stepsRow}>
        {PIPELINE_STAGES.map((stage) => {
          const isDone = currentIndex > stage.index;
          const isActive = currentIndex === stage.index;
          const label = stage.label;

          return (
            <View key={stage.index} style={styles.stepItem}>
              <View
                style={[
                  styles.stepNode,
                  isDone && styles.stepNodeDone,
                  isActive && styles.stepNodeActive,
                ]}
              >
                <Text
                  style={[
                    styles.stepNodeText,
                    (isDone || isActive) && styles.stepNodeTextActive,
                  ]}
                >
                  {isDone ? 'OK' : stage.index}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                  isDone && styles.stepLabelDone,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    position: 'relative',
    marginVertical: 4,
  },
  trackLine: {
    position: 'absolute',
    top: 28,
    left: '10%',
    right: '10%',
    height: 3,
    backgroundColor: colors.bgTertiary,
    zIndex: 1,
  },
  trackLineProgress: {
    height: 3,
    backgroundColor: colors.amber,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgTertiary,
    borderWidth: 2,
    borderColor: colors.borderSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepNodeDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepNodeActive: {
    backgroundColor: colors.amber,
    borderColor: colors.amberLight,
  },
  stepNodeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  stepNodeTextActive: {
    color: '#000',
  },
  stepLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.amber,
    fontWeight: '700',
  },
  stepLabelDone: {
    color: colors.textSecondary,
  },
});

export default TripPipelineStepper;
