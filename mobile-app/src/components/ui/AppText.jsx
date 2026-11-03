import React from 'react';
import { Text } from 'react-native';
import { fontFamily } from '../../theme/typography';

const WEIGHT_MAP = {
  '400': fontFamily.medium,
  '500': fontFamily.medium,
  '600': fontFamily.semibold,
  '700': fontFamily.bold,
  '800': fontFamily.extrabold,
  '900': fontFamily.extrabold,
  normal: fontFamily.medium,
  bold: fontFamily.bold,
};

export function resolveFontFamily(style) {
  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {};
  const w = flat.fontWeight;
  if (w == null) return fontFamily.medium;
  return WEIGHT_MAP[String(w)] || fontFamily.medium;
}

export default function AppText({ style, ...props }) {
  const family = resolveFontFamily(style);
  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {};
  const w = flat.fontWeight;
  const normalizedWeight = w === '900' || w === 900 ? '800' : w;

  return (
    <Text
      {...props}
      style={[
        { fontFamily: family },
        style,
        normalizedWeight != null ? { fontWeight: normalizedWeight === '800' ? '800' : normalizedWeight } : null,
      ]}
    />
  );
}
