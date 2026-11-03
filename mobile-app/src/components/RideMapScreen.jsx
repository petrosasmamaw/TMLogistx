import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from './BottomSheet';
import { colors } from '../theme/colors';
import { radius, spacing, NAV_TOTAL_BOTTOM } from '../theme/layout';

/**
 * Map-first trip flows: large map on top, full-width content panel below (not a floating modal).
 */
export default function RideMapScreen({
  map,
  layout = 'split',
  mapFlex = 0.42,
  banner = null,
  contentKey,
  children,
  scroll = true,
  sheetVariant = 'normal',
  mapOverlayTop = null,
  mapOverlayBottom = null,
  hidePanel = false,
}) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const headerClearance = 56 + insets.top;
  const mapHeight = Math.max(240, Math.round(winH * mapFlex));
  /** Map draws under the floating header (no solid band behind logo ↔ profile). */
  const mapSlotHeight = mapHeight + headerClearance;
  const bottomPad = NAV_TOTAL_BOTTOM + insets.bottom + spacing.sm;

  const mapBlock = (
    <View
      style={
        layout === 'overlay'
          ? styles.mapLayer
          : [styles.mapSlot, { height: mapSlotHeight }]
      }
      pointerEvents="box-none"
    >
      {map}
      <View style={styles.mapOverlayLayer} pointerEvents="box-none">
        {mapOverlayTop}
        {mapOverlayBottom}
      </View>
    </View>
  );

  if (layout === 'overlay') {
    return (
      <View style={[styles.root, styles.rootOverlay]}>
        {mapBlock}
        {!hidePanel ? (
          <BottomSheet
            variant={sheetVariant}
            banner={banner}
            contentKey={contentKey}
            scroll={scroll}
          >
            {children}
          </BottomSheet>
        ) : null}
      </View>
    );
  }

  const panelBody = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.panelScroll, { paddingBottom: bottomPad }]}
    >
      {banner}
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.panelScroll, styles.panelFill, { paddingBottom: bottomPad }]}>
      {banner}
      {children}
    </View>
  );

  return (
    <View style={styles.root} key={contentKey}>
      {mapBlock}
      <View style={styles.panel}>{panelBody}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  rootOverlay: {
    minHeight: 0,
  },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    minHeight: 280,
    overflow: 'hidden',
    zIndex: 0,
  },
  mapOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  mapSlot: {
    width: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  panel: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    marginTop: -12,
    overflow: 'hidden',
  },
  panelScroll: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.screen,
    flexGrow: 1,
  },
  panelFill: {
    flex: 1,
  },
});
