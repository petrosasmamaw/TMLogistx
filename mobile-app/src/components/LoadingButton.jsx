import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/layout';
import { type } from '../theme/typography';

export default function LoadingButton({
  onPress,
  loading = false,
  loadingLabel,
  label,
  disabled,
  style,
  textStyle,
  variant = 'primary',
}) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  const bg = isDanger ? colors.danger : isPrimary ? colors.primary : 'transparent';
  const textColor = isPrimary || isDanger ? colors.onPrimary : colors.ink;
  const outline = variant === 'secondary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.88}
      style={[
        styles.btn,
        { backgroundColor: bg, opacity: isDisabled ? 0.45 : 1 },
        outline && styles.outline,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading && (
          <ActivityIndicator size={20} color={textColor} style={styles.spinner} />
        )}
        <Text
          style={[
            isPrimary || isDanger ? type.buttonPrimary : type.buttonOutline,
            { color: textColor },
            textStyle,
          ]}
        >
          {loading && loadingLabel ? loadingLabel : label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    minHeight: 54,
    borderRadius: radius.button,
    paddingHorizontal: spacing.sheet,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
});
