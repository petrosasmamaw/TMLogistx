import React from 'react';
import { TextInput, Platform } from 'react-native';
import { fontFamily } from '../../theme/typography';
import { colors } from '../../theme/colors';

export default function AppTextInput({ style, ...props }) {
  return (
    <TextInput
      {...props}
      keyboardAppearance="light"
      placeholderTextColor={props.placeholderTextColor || colors.mute}
      style={[{ fontFamily: fontFamily.medium, color: colors.ink }, style]}
    />
  );
}
