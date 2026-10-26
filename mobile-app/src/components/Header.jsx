import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import { logoutUser } from '../store/authSlice';
import BrandLogo from './BrandLogo';

export const Header = ({ onOpenProfile }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { t } = useTranslation();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.brandingSection}>
        <BrandLogo size={38} />
        <View style={styles.brandText}>
          <Text style={styles.brandTitle}>{t('appTitle')}</Text>
          <Text style={styles.brandSubtitle} numberOfLines={1}>
            {user?.full_name || 'Fleet & Movement'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onOpenProfile}
          activeOpacity={0.8}
          accessibilityLabel="Profile"
        >
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.headerAvatar} />
          ) : (
            <Ionicons name="person-circle-outline" size={26} color={colors.primary} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => dispatch(logoutUser())}
          activeOpacity={0.8}
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  brandingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0
  },
  brandText: {
    flex: 1,
    minWidth: 0
  },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700'
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500'
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 4 },
  headerAvatar: { width: 30, height: 30, borderRadius: 15 },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primaryMuted
  }
});

export default Header;
