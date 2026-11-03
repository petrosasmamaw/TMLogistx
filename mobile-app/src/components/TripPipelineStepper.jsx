import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';

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
      <View style={styles.stepsRow}>
        {PIPELINE_STAGES.map((stage, i) => {
          const isDone = currentIndex > stage.index;
          const isActive = currentIndex === stage.index;
          const showConnector = i > 0;

          return (
            <View key={stage.index} style={styles.stepItem}>
              {showConnector ? (
                <View
                  style={[
                    styles.connector,
                    (isDone || isActive) && styles.connectorDone,
                  ]}
                />
              ) : null}
              <View
                style={[
                  styles.stepNode,
                  isDone && styles.stepNodeDone,
                  isActive && styles.stepNodeActive,
                  isActive && styles.stepNodeActiveRing,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.stepNodeText, isActive && styles.stepNodeTextActive]}>
                    {stage.index}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                  isDone && styles.stepLabelDone,
                ]}
                numberOfLines={1}
              >
                {stage.label}
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
    marginVertical: 6,
    marginBottom: 14,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    top: 10,
    left: '-50%',
    right: '50%',
    height: 2,
    backgroundColor: colors.line,
    zIndex: 0,
  },
  connectorDone: {
    backgroundColor: colors.primary,
  },
  stepNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 1,
  },
  stepNodeDone: {
    backgroundColor: colors.primary,
  },
  stepNodeActive: {
    backgroundColor: colors.live,
  },
  stepNodeActiveRing: {
    borderWidth: 5,
    borderColor: colors.liveRing,
  },
  stepNodeText: {
    ...type.badge,
    color: colors.mute,
  },
  stepNodeTextActive: {
    color: colors.onPrimary,
  },
  stepLabel: {
    ...type.badge,
    color: colors.mute,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.ink,
  },
  stepLabelDone: {
    color: colors.ink,
  },
});

export default TripPipelineStepper;
