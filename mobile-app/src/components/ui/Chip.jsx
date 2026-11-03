import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/layout';
import { type } from '../../theme/typography';

export default function Chip({ label, active, onPress, style, minWidth }) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && styles.chipActive,
        minWidth != null && { minWidth },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <AppText style={[styles.label, active && styles.labelActive]}>{label}</AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.sheet,
    borderRadius: radius.chip,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  label: {
    ...type.chip,
    color: colors.ink,
  },
  labelActive: {
    color: colors.primary,
  },
});
