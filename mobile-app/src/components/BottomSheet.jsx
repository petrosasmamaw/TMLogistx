import React, { useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { floating, floatingShadow, radius, spacing, USE_NATIVE_DRIVER } from '../theme/layout';

export default function BottomSheet({
  children,
  variant = 'normal',
  banner = null,
  contentKey,
  scroll = true,
  style,
}) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const reduce = await AccessibilityInfo.isReduceMotionEnabled();
      if (cancelled) return;
      if (reduce) {
        fade.setValue(1);
        slide.setValue(0);
        return;
      }
      fade.setValue(0);
      slide.setValue(24);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(slide, { toValue: 0, duration: 280, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [contentKey, fade, slide]);

  const bottomPad = floating.sheetBottom + insets.bottom;
  const tallTop = 66 + insets.top;

  const sheetStyle =
    variant === 'tall'
      ? {
          top: tallTop,
          bottom: bottomPad,
          maxHeight: undefined,
        }
      : variant === 'compact'
        ? {
            bottom: bottomPad,
            maxHeight: Math.min(winH * 0.34, 248),
          }
        : {
            bottom: bottomPad,
            maxHeight: winH * 0.62,
          };

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
      {banner}
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.scrollContent, styles.scrollFill]}>
      {banner}
      {children}
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.sheet,
        floatingShadow(false),
        sheetStyle,
        { opacity: fade, transform: [{ translateY: slide }] },
        style,
      ]}
    >
      <View style={styles.grabber} />
      {body}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: floating.edgeH,
    right: floating.edgeH,
    backgroundColor: colors.card,
    borderRadius: radius.sheet,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.screen,
    overflow: 'hidden',
    zIndex: 900,
    ...Platform.select({ web: { maxHeight: '62vh' }, default: {} }),
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: radius.grabber,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  scrollFill: {
    flex: 1,
  },
});
