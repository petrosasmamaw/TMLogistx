import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './ui/AppText';
import { colors } from '../theme/colors';
import { NAV_TOTAL_BOTTOM, floatingShadow, radius, spacing } from '../theme/layout';

/**
 * Floating controls while staff picks start/end on the live map (UI only).
 */
export default function MapPickControls({
  kind = 'pickup',
  onSelect,
  onMyLocation,
  onCancel,
  selecting = false,
  coordHint = '',
}) {
  const insets = useSafeAreaInsets();
  const title = kind === 'destination' ? 'Choose destination' : 'Choose start point';
  const pinColor = kind === 'destination' ? colors.danger : colors.primary;
  const topPad = insets.top + 56;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.hintCard, floatingShadow(false), { marginTop: topPad }]}>
        <View style={[styles.pinBadge, { backgroundColor: pinColor }]}>
          <Ionicons name="location" size={18} color="#fff" />
        </View>
        <View style={styles.hintTextCol}>
          <AppText style={styles.hintTitle}>{title}</AppText>
          <AppText style={styles.hintSub}>Drag the pin or tap the map, then confirm.</AppText>
          {coordHint ? <AppText style={styles.coordHint}>{coordHint}</AppText> : null}
        </View>
      </View>

      <View style={[styles.actionsRow, { paddingBottom: NAV_TOTAL_BOTTOM + Math.max(insets.bottom, spacing.sm) }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={onCancel} accessibilityLabel="Cancel map pick">
          <Ionicons name="close" size={22} color={colors.ink} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconBtn, styles.locateBtn]}
          onPress={onMyLocation}
          accessibilityLabel="Move pin to my location"
        >
          <Ionicons name="navigate" size={22} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectBtn,
            kind === 'destination' && styles.selectBtnDest,
            selecting && styles.selectBtnDisabled,
          ]}
          onPress={onSelect}
          disabled={selecting}
          activeOpacity={0.88}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <AppText style={styles.selectBtnText}>{selecting ? 'Saving…' : 'Select location'}</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    zIndex: 20,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sheet,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' },
      default: {},
    }),
  },
  pinBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintTextCol: { flex: 1 },
  hintTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 },
  hintSub: { fontSize: 12, color: colors.mute, marginTop: 2, lineHeight: 16 },
  coordHint: {
    fontSize: 11,
    color: colors.mute,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...floatingShadow(false),
  },
  locateBtn: {
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  selectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    height: 48,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    ...floatingShadow(false),
  },
  selectBtnDest: {
    backgroundColor: colors.danger,
  },
  selectBtnDisabled: { opacity: 0.7 },
  selectBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
