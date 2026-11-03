import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { floating, spacing, NAV_TOTAL_BOTTOM } from '../theme/layout';

/**
 * Full-page tab content — no map, no floating sheet.
 */
export default function PageShell({
  children,
  banner = null,
  scroll = true,
  contentKey,
  style,
}) {
  const insets = useSafeAreaInsets();
  const topPad = 56 + insets.top;
  const bottomPad = NAV_TOTAL_BOTTOM + insets.bottom + spacing.md;

  const body = (
    <>
      {banner}
      {children}
    </>
  );

  return (
    <View style={[styles.root, style]} key={contentKey}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: bottomPad }]}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.fill, { paddingTop: topPad, paddingBottom: bottomPad }]}>
          {body}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scroll: {
    paddingHorizontal: spacing.screen,
    flexGrow: 1,
  },
  fill: {
    flex: 1,
    paddingHorizontal: spacing.screen,
  },
});
