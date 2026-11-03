import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/layout';
import { type } from '../../theme/typography';

export default function KpiTile({ label, value, style }) {
  return (
    <View style={[styles.tile, style]}>
      <AppText style={styles.value}>{value}</AppText>
      <AppText style={styles.label}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.bg,
    borderRadius: radius.input,
    padding: spacing.xxl,
    flex: 1,
    minWidth: '45%',
  },
  value: { ...type.kpiValue, color: colors.ink },
  label: { ...type.badge, color: colors.mute, marginTop: 4 },
});
