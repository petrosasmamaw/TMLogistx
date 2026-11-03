import React from 'react';
import { View, Text, Switch, StyleSheet, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/layout';
import { type } from '../../theme/typography';

export default function PermissionSwitchRow({
  title,
  subtitle,
  value,
  disabled = false,
  onToggle,
}) {
  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onToggle}
        trackColor={{ false: colors.line, true: colors.primarySoft }}
        thumbColor={value ? colors.primary : colors.card}
        ios_backgroundColor={colors.line}
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{ checked: value, disabled }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    padding: spacing.xl,
    borderRadius: radius.input,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  textBlock: { flex: 1, minWidth: 0 },
  title: { ...type.bodySemibold, color: colors.ink },
  subtitle: {
    ...type.subtitle,
    color: colors.mute,
    marginTop: 4,
    ...(Platform.OS === 'web' ? { maxWidth: '100%' } : null),
  },
});
