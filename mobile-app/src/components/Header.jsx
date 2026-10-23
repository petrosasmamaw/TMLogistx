import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import { logoutUser } from '../store/authSlice';

export const Header = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { t, language, toggleLanguage } = useTranslation();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.brandingSection}>
        <View style={styles.logoBadge}>
          <Ionicons name="bus" size={20} color="#fff" />
        </View>
        <View style={styles.brandText}>
          <Text style={styles.brandTitle}>{t('appTitle')}</Text>
          <Text style={styles.brandSubtitle} numberOfLines={1}>
            {user?.full_name || (language === 'am' ? 'የተሽከርካሪ እና ሰራተኛ እንቅስቃሴ' : 'Fleet & Movement')}
          </Text>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage} activeOpacity={0.8}>
          <Ionicons name="language-outline" size={16} color={colors.primary} />
          <Text style={styles.langBtnText}>{language === 'en' ? 'አማርኛ' : 'EN'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => dispatch(logoutUser())}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.primary} />
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
    paddingTop: 48,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.bgTertiary,
  },
  langBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primaryMuted,
  },
});

export default Header;
