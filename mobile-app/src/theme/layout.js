import { Platform } from 'react-native';

/** Expo web has no native animated module — use JS driver to avoid console warnings. */
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export const radius = {
  pill: 999,
  sheet: 26,
  nav: 24,
  navPill: 18,
  button: 17,
  card: 18,
  input: 16,
  chip: 14,
  logo: 8,
  plate: 6,
  grabber: 4,
};

export const spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 14,
  sheet: 16,
  screen: 18,
};

export const floating = {
  edgeH: 10,
  topBar: 12,
  navBottom: 12,
  navHeight: 62,
  navGap: 10,
  sheetBottom: 84,
};

export function floatingShadow(isDark = false) {
  return Platform.select({
    ios: {
      shadowColor: isDark ? '#000' : '#0f1f19',
      shadowOpacity: isDark ? 0.5 : 0.16,
      shadowRadius: 17,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 10 },
    default: {},
  });
}

export const NAV_TOTAL_BOTTOM = floating.navHeight + floating.navBottom + floating.navGap;
