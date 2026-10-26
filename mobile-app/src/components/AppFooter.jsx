import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function AppFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.text}>TMLogistx · Staff Movement & Fleet Management</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary,
    backgroundColor: colors.bgSecondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center'
  },
  text: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500'
  }
});
