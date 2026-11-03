import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { floating, floatingShadow, radius } from '../theme/layout';
import { type } from '../theme/typography';
import TabBarIcon from './TabBarIcon';

export default function FloatingTabBar({ tabs, activeKey, onChange }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        floatingShadow(false),
        { bottom: floating.navBottom + insets.bottom },
      ]}
    >
      {tabs.map((tab) => {
        const active = activeKey === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <TabBarIcon
              name={active ? tab.iconActive || tab.icon : tab.iconOutline || tab.icon}
              focused={active}
              size={22}
            />
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={2}
              textAlign="center"
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: floating.edgeH,
    right: floating.edgeH,
    height: floating.navHeight,
    borderRadius: radius.nav,
    backgroundColor: colors.card,
    flexDirection: 'row',
    padding: 6,
    zIndex: 950,
  },
  tab: {
    flex: 1,
    minWidth: 44,
    borderRadius: radius.navPill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    ...type.nav,
    color: colors.mute,
  },
  labelActive: {
    color: colors.primary,
  },
});
