import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { floating, floatingShadow, radius } from '../theme/layout';
import { useTranslation } from '../i18n';

export default function DriverSosButton({ onPress }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        floatingShadow(false),
        { top: 68 + insets.top },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityLabel={t('tabAccident') || 'Accident'}
    >
      <Ionicons name="warning-outline" size={24} color={colors.onPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: floating.topBar,
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 900,
  },
});
