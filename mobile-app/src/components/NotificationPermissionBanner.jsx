import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';

export default function NotificationPermissionBanner({ permission, onAllow, role }) {
  if (permission === 'granted' || permission === 'unsupported') return null;

  const blocked = permission === 'denied';
  const what =
    role === 'DRIVER'
      ? 'new trip assignments'
      : 'driver assignment and arrival alerts';
  const message = blocked
    ? Platform.OS === 'web'
      ? `Notifications are blocked. Click the lock icon in the address bar and allow notifications to get ${what}.`
      : `Notifications are off. Turn them on in settings to get ${what}.`
    : `Allow notifications to get ${what}.`;

  return (
    <View style={styles.banner}>
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
    gap: 10,
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: colors.warningMuted
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: '#78350f'
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.warning
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700'
  }
});
