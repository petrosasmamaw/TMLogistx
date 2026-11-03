import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radius, USE_NATIVE_DRIVER } from '../theme/layout';
import { type } from '../theme/typography';
import { useTranslation } from '../i18n';

const STATUS_ICONS = {
  COMPLETED: 'checkmark-circle',
  EXTERNAL_AUTHORIZED: 'car',
  IN_TRANSIT: 'navigate',
  PASSENGER_PICKED_UP: 'person',
  ARRIVED: 'location',
  HEADING_TO_PICKUP: 'car-sport',
  ACCEPTED: 'thumbs-up',
  ASSIGNED: 'person-circle',
  APPROVED: 'checkmark-done',
  REJECTED: 'close-circle',
  CANCELLED: 'ban',
  PENDING: 'time',
};

const LIVE_STATUSES = new Set([
  'PENDING',
  'HEADING_TO_PICKUP',
  'ARRIVED',
  'IN_TRANSIT',
  'PASSENGER_PICKED_UP',
  'ASSIGNED',
  'ACCEPTED',
  'EXTERNAL_AUTHORIZED',
]);

export const StatusBadge = ({ status, compact = false }) => {
  const { t } = useTranslation();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!LIVE_STATUSES.has(String(status || '').toUpperCase())) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 600, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  const s = String(status || 'PENDING').toUpperCase();
  const labelKey = `status_${s}`;
  const translated = t(labelKey);
  const label = translated !== labelKey ? translated : t('status_PENDING');

  let bg = colors.primarySoft;
  let text = colors.primary;
  let live = LIVE_STATUSES.has(s);

  if (s === 'REJECTED' || s === 'CANCELLED') {
    bg = colors.dangerSoft;
    text = colors.danger;
    live = false;
  } else if (live) {
    bg = colors.liveSoft;
    text = colors.liveText;
  }

  const icon = STATUS_ICONS[s] || STATUS_ICONS.PENDING;

  return (
    <View style={[styles.badge, compact && styles.badgeCompact, { backgroundColor: bg }]}>
      {live ? (
        <Animated.View style={[styles.dot, compact && styles.dotCompact, { opacity: pulse, backgroundColor: text }]} />
      ) : (
        <Ionicons name={icon} size={compact ? 12 : 14} color={text} />
      )}
      <Text style={[styles.badgeText, compact && styles.badgeTextCompact, { color: text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 6,
    alignSelf: 'flex-start',
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    maxWidth: '100%',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotCompact: {
    width: 6,
    height: 6,
  },
  badgeText: {
    ...type.meta,
  },
  badgeTextCompact: {
    fontSize: 10,
  },
});

export default StatusBadge;
