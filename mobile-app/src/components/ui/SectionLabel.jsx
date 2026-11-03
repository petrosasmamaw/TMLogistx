import React from 'react';
import { StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors } from '../../theme/colors';
import { type } from '../../theme/typography';
import { spacing } from '../../theme/layout';

export default function SectionLabel({ children, style }) {
  return <AppText style={[styles.label, style]}>{children}</AppText>;
}

const styles = StyleSheet.create({
  label: {
    ...type.section,
    color: colors.mute,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
});
