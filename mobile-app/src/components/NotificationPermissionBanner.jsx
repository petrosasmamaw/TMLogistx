import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/layout';
import { type } from '../theme/typography';

export default function NotificationPermissionBanner({
  permission,
  onAllow,
  role,
  compact = false,
}) {
  if (permission === 'granted' || permission === 'unsupported') return null;

  const blocked = permission === 'denied';
  const what =
    role === 'DRIVER' ? 'new trip assignments' : 'driver assignment and arrival alerts';
  const message = blocked
    ? Platform.OS === 'web'
      ? `Notifications are blocked. Click the lock icon in the address bar and allow notifications to get ${what}.`
      : `Notifications are off. Turn them on in settings to get ${what}.`
    : `Allow notifications to get ${what}.`;

  return (
    <View style={[styles.banner, compact && styles.bannerCompact]}>
      <Text style={styles.text}>{message}</Text>
      {!(blocked && Platform.OS === 'web') && (
        <TouchableOpacity onPress={onAllow} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>{blocked ? 'Open settings' : 'Allow'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.input,
    backgroundColor: colors.liveSoft,
  },
  bannerCompact: {
    marginHorizontal: 0,
  },
  text: {
    flex: 1,
    ...type.subtitle,
    color: colors.liveText,
  },
  button: {
    minHeight: 44,
    minWidth: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    justifyContent: 'center',
  },
  buttonText: {
    ...type.chip,
    color: colors.ink,
  },
});
