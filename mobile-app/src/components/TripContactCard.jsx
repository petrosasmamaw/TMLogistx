import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Staff ↔ driver contact card with optional vehicle line for staff view.
 */
export default function TripContactCard({
  title,
  name,
  phone,
  avatarUrl,
  vehiclePlate,
  vehicleModel,
  subtitle
}) {
  if (!name && !phone) return null;

  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.row}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.name}>{name || '—'}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
          {(vehiclePlate || vehicleModel) && (
            <Text style={styles.vehicle}>
              {[vehiclePlate, vehicleModel].filter(Boolean).join(' · ')}
            </Text>
          )}
          {phone ? (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${phone}`)} style={styles.phoneRow}>
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <Text style={styles.phone}>{phone}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.muted}>Phone not on file</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    backgroundColor: colors.bgSecondary
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarLetter: { fontSize: 22, fontWeight: '800', color: colors.primary },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  vehicle: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 4 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  phone: { fontSize: 13, fontWeight: '600', color: colors.primary },
  muted: { fontSize: 12, color: colors.textMuted, marginTop: 6 }
});
