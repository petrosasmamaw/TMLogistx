import { Platform } from 'react-native';

export const fontFamily = {
  regular: Platform.select({
    ios: 'PlusJakartaSans_500Medium',
    android: 'PlusJakartaSans_500Medium',
    default: 'PlusJakartaSans_500Medium',
  }),
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

export function textStyle(size, weight = '500', letterSpacing = 0) {
  const weightMap = {
    '500': fontFamily.medium,
    '600': fontFamily.semibold,
    '700': fontFamily.bold,
    '800': fontFamily.extrabold,
  };
  return {
    fontSize: size,
    fontFamily: weightMap[String(weight)] || fontFamily.medium,
    letterSpacing,
    lineHeight: Math.round(size * 1.3),
  };
}

export const type = {
  sheetTitle: textStyle(20, '700', -0.4),
  headline: textStyle(21, '700', -0.5),
  kpiValue: textStyle(24, '700', -0.5),
  body: textStyle(15, '500'),
  bodySemibold: textStyle(15, '600'),
  buttonPrimary: textStyle(16, '800'),
  buttonOutline: textStyle(15, '800'),
  brandWordmark: textStyle(15, '800', -0.2),
  chip: textStyle(14, '700'),
  subtitle: textStyle(13, '500'),
  section: textStyle(13, '700'),
  nav: textStyle(12, '700'),
  badge: textStyle(12, '600'),
  meta: textStyle(12, '700'),
};
