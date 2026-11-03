import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/layout';
import { type } from '../../theme/typography';

export default function InfoRow({
  dot = 'pickup',
  caption,
  value,
  placeholder,
  onChangeText,
  editable = false,
  trailing = null,
  multiline = false,
  keyboardType,
  secureTextEntry,
  style,
  onPress,
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  const dotColor = dot === 'destination' ? colors.danger : colors.primary;

  const inner = editable ? (
    <TextInput
      style={[styles.input, multiline && styles.inputMulti]}
      keyboardAppearance="light"
      value={value}
      placeholder={placeholder}
      placeholderTextColor={colors.mute}
      onChangeText={onChangeText}
      multiline={multiline}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
    />
  ) : (
    <Text style={styles.value} numberOfLines={2}>
      {value || placeholder || '—'}
    </Text>
  );

  return (
    <Wrapper
      style={[styles.row, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={styles.textBlock}>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        {inner}
      </View>
      {trailing}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    padding: spacing.xl,
    borderRadius: radius.input,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  textBlock: { flex: 1, minWidth: 0 },
  caption: { ...type.badge, color: colors.mute, marginBottom: 2 },
  value: { ...type.bodySemibold, color: colors.ink },
  input: {
    ...type.bodySemibold,
    color: colors.ink,
    padding: 0,
    flex: 1,
  },
  inputMulti: { minHeight: 48, textAlignVertical: 'top' },
});
