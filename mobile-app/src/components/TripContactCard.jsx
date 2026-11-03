import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radius } from '../theme/layout';
import { type } from '../theme/typography';

export default function TripContactCard({
  title,
  name,
  phone,
  avatarUrl,
  vehiclePlate,
  vehicleModel,
  subtitle,
}) {
  const initials = (name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const subLine = subtitle || [vehicleModel, vehiclePlate ? `Plate ${vehiclePlate}` : ''].filter(Boolean).join(' · ');

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
      <View style={styles.info}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.name}>{name || '—'}</Text>
        {subLine ? <Text style={styles.sub}>{subLine}</Text> : null}
        {vehiclePlate ? (
          <Text style={styles.plate}>{vehiclePlate}</Text>
        ) : null}
      </View>
      {phone ? (
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL(`tel:${phone}`)}
          accessibilityLabel="Call"
        >
          <Ionicons name="call-outline" size={20} color={colors.onPrimary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    marginVertical: 8,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...type.buttonOutline,
    color: colors.primary,
  },
  info: { flex: 1, minWidth: 0 },
  title: {
    ...type.badge,
    color: colors.mute,
    marginBottom: 2,
  },
  name: {
    ...type.bodySemibold,
    color: colors.ink,
  },
  sub: {
    ...type.badge,
    color: colors.mute,
    marginTop: 2,
  },
  plate: {
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.plate,
    ...type.badge,
    color: colors.ink,
  },
  callBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
