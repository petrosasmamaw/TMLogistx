import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

export default function LoadingButton({
  onPress,
  loading = false,
  loadingLabel,
  label,
  disabled,
  style,
  textStyle,
  variant = 'primary'
}) {
  const isDisabled = disabled || loading;
  const bg = variant === 'primary' ? colors.primary : colors.bgTertiary;
  const textColor = variant === 'primary' ? '#fff' : colors.textPrimary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[styles.btn, { backgroundColor: bg, opacity: isDisabled ? 0.65 : 1 }, style]}
    >
      <View style={styles.row}>
        {loading && <ActivityIndicator size="small" color={textColor} style={styles.spinner} />}
        <Text style={[styles.text, { color: textColor }, textStyle]}>
          {loading && loadingLabel ? loadingLabel : label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  spinner: {
    marginRight: 8
  },
  text: {
    fontSize: 15,
    fontWeight: '800'
  }
});
