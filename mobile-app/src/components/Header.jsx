import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import BrandLogo from './BrandLogo';
import { floating, floatingShadow, radius } from '../theme/layout';
import { type } from '../theme/typography';

export const Header = ({ onOpenProfile }) => {
  const { user } = useSelector((state) => state.auth);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const initials = (user?.full_name || 'U')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[styles.row, { top: floating.topBar + insets.top }]}
      pointerEvents="box-none"
    >
      <View style={[styles.brandPill, floatingShadow(false)]}>
        <BrandLogo width={34} height={26} />
        <Text style={styles.wordmark}>{t('appTitle')}</Text>
      </View>

      <TouchableOpacity
        style={[styles.avatarBtn, floatingShadow(false)]}
        onPress={onOpenProfile}
        activeOpacity={0.85}
        accessibilityLabel="Profile"
      >
        {user?.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.initials}>{initials}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: floating.topBar,
    right: floating.topBar,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    zIndex: 900,
    backgroundColor: 'transparent',
  },
  brandPill: {
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
    maxWidth: '72%',
  },
  wordmark: {
    ...type.brandWordmark,
    color: colors.ink,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 44,
    height: 44,
  },
  initials: {
    ...type.buttonOutline,
    color: colors.primary,
  },
});

export default Header;
