import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
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

export const StatusBadge = ({ status }) => {
  const { t } = useTranslation();

  const getStatusConfig = (s) => {
    switch (s) {
      case 'COMPLETED':
        return {
          bg: colors.successMuted,
          border: colors.success,
          text: colors.success,
          icon: STATUS_ICONS.COMPLETED,
          label: t('status_COMPLETED'),
        };
      case 'EXTERNAL_AUTHORIZED':
        return {
          bg: colors.infoMuted,
          border: colors.primary,
          text: colors.primary,
          icon: STATUS_ICONS.EXTERNAL_AUTHORIZED,
          label: t('status_EXTERNAL_AUTHORIZED') || 'External ride',
        };
      case 'IN_TRANSIT':
      case 'PASSENGER_PICKED_UP':
        return {
          bg: colors.amberMuted,
          border: colors.amber,
          text: colors.amber,
          icon: s === 'IN_TRANSIT' ? STATUS_ICONS.IN_TRANSIT : STATUS_ICONS.PASSENGER_PICKED_UP,
          label: s === 'IN_TRANSIT' ? t('status_IN_TRANSIT') : t('status_PASSENGER_PICKED_UP'),
        };
      case 'ARRIVED':
        return {
          bg: colors.cyanMuted,
          border: colors.cyan,
          text: colors.cyan,
          icon: STATUS_ICONS.ARRIVED,
          label: t('status_ARRIVED'),
        };
      case 'HEADING_TO_PICKUP':
        return {
          bg: colors.purpleMuted,
          border: colors.purple,
          text: colors.purple,
          icon: STATUS_ICONS.HEADING_TO_PICKUP,
          label: t('status_HEADING_TO_PICKUP'),
        };
      case 'ACCEPTED':
        return {
          bg: colors.infoMuted,
          border: colors.info,
          text: colors.info,
          icon: STATUS_ICONS.ACCEPTED,
          label: t('status_ACCEPTED'),
        };
      case 'ASSIGNED':
      case 'APPROVED':
        return {
          bg: colors.infoMuted,
          border: colors.info,
          text: colors.info,
          icon: s === 'ASSIGNED' ? STATUS_ICONS.ASSIGNED : STATUS_ICONS.APPROVED,
          label: s === 'ASSIGNED' ? t('status_ASSIGNED') : t('status_APPROVED'),
        };
      case 'REJECTED':
      case 'CANCELLED':
        return {
          bg: colors.dangerMuted,
          border: colors.danger,
          text: colors.danger,
          icon: s === 'REJECTED' ? STATUS_ICONS.REJECTED : STATUS_ICONS.CANCELLED,
          label: s === 'REJECTED' ? t('status_REJECTED') : t('status_CANCELLED'),
        };
      case 'PENDING':
      default:
        return {
          bg: colors.bgTertiary,
          border: colors.borderPrimary,
          text: colors.textSecondary,
          icon: STATUS_ICONS.PENDING,
          label: t('status_PENDING'),
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Ionicons name={config.icon} size={12} color={config.text} />
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 5,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default StatusBadge;
