// TMLogistx v2 — Ride-Map design tokens (light default)

const light = {
  bg: '#e9eeea',
  mapFallback: '#dfe7e2',
  card: '#ffffff',
  ink: '#0f1f19',
  mute: '#66766e',
  line: '#e3e9e5',
  primary: '#0b7a5a',
  primarySoft: '#e4f3ec',
  live: '#f5a524',
  liveSoft: 'rgba(245,165,36,0.18)',
  liveText: '#b87400',
  liveRing: 'rgba(245,165,36,0.28)',
  danger: '#d64545',
  dangerSoft: 'rgba(214,69,69,0.12)',
  userBlue: '#2d6cdf',
  onPrimary: '#ffffff',
};

const dark = {
  bg: '#070d0b',
  mapFallback: '#0f1f19',
  card: '#14201b',
  ink: '#eaf3ee',
  mute: '#93a79c',
  line: '#243229',
  primary: '#2fbf8f',
  primarySoft: '#173229',
  live: light.live,
  liveSoft: light.liveSoft,
  liveText: light.liveText,
  liveRing: light.liveRing,
  danger: light.danger,
  userBlue: light.userBlue,
  onPrimary: light.onPrimary,
};

export function getThemeColors(scheme = 'light') {
  const t = scheme === 'dark' ? dark : light;
  return {
    ...t,
    // Legacy aliases — keep screens working
    bgPrimary: t.bg,
    bgSecondary: t.card,
    bgTertiary: t.bg,
    bgInput: t.bg,
    bgHover: t.line,
    primaryLight: t.primary,
    primaryDark: t.primary,
    primaryMuted: t.primarySoft,
    amber: t.live,
    amberLight: t.live,
    amberDark: t.liveText,
    amberMuted: t.liveSoft,
    cyan: t.primary,
    cyanLight: t.primary,
    cyanMuted: t.primarySoft,
    success: t.primary,
    successMuted: t.primarySoft,
    warning: t.liveText,
    warningMuted: t.liveSoft,
    dangerMuted: 'rgba(214,69,69,.12)',
    info: t.primary,
    infoMuted: t.primarySoft,
    purple: t.live,
    purpleMuted: t.liveSoft,
    textPrimary: t.ink,
    textSecondary: t.mute,
    textMuted: t.mute,
    textInverse: t.onPrimary,
    borderPrimary: t.line,
    borderSecondary: t.line,
    borderHighlight: t.primary,
  };
}

export const colors = getThemeColors('light');

export const shadows = {
  floating: {
    shadowColor: '#0f1f19',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 17,
    elevation: 10,
  },
  sm: {
    shadowColor: '#0f1f19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#0f1f19',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 17,
    elevation: 10,
  },
  glow: {
    shadowColor: '#0b7a5a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
};
