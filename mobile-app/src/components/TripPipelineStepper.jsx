import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';

const PIPELINE_STAGES = [
  { key: 'ASSIGNED', index: 1, labelEn: 'Assigned', labelAm: 'ተመድቧል' },
  { key: 'HEADING_TO_PICKUP', index: 2, labelEn: 'En Route', labelAm: 'በመንገድ ላይ' },
  { key: 'ARRIVED', index: 3, labelEn: 'Arrived', labelAm: 'ደርሷል' },
  { key: 'IN_TRANSIT', index: 4, labelEn: 'In Transit', labelAm: 'ጉዞ ላይ' },
  { key: 'COMPLETED', index: 5, labelEn: 'Complete', labelAm: 'ተጠናቋል' },
];

export const TripPipelineStepper = ({ currentStatus }) => {
  const { language } = useTranslation();

  const getStageIndex = (status) => {
    switch (status) {
      case 'COMPLETED': return 5;
      case 'IN_TRANSIT':
      case 'PASSENGER_PICKED_UP': return 4;
      case 'ARRIVED': return 3;
      case 'HEADING_TO_PICKUP': return 2;
      case 'ACCEPTED':
      case 'ASSIGNED': return 1;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(currentStatus);

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
          const label = language === 'am' ? stage.labelAm : stage.labelEn;

          return (
            <View key={stage.key} style={styles.stepItem}>
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
                  {isDone ? '✓' : stage.index}
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
