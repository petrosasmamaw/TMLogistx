import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { USE_NATIVE_DRIVER, radius, spacing } from '../theme/layout';
import AnimatedTripCard from './AnimatedTripCard';

const CAR_ICON = require('../../assets/empty-state-car.png');

/**
 * Driver — no assignments / standby for dispatch.
 */
export default function DriverStandbyEmptyState({
  title,
  description,
  ctaLabel,
  onPress,
  showStandbyBadge = true,
}) {
  const floatY = useRef(new Animated.Value(0)).current;
  const radar = useRef(new Animated.Value(0)).current;
  const radar2 = useRef(new Animated.Value(0)).current;
  const liveDot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    const radarLoop = Animated.loop(
      Animated.timing(radar, {
        toValue: 1,
        duration: 2400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      })
    );

    const radar2Loop = Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(radar2, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(radar2, { toValue: 0, duration: 0, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );

    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDot, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(liveDot, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    floatLoop.start();
    radarLoop.start();
    radar2Loop.start();
    dotLoop.start();
    return () => {
      floatLoop.stop();
      radarLoop.stop();
      radar2Loop.stop();
      dotLoop.stop();
    };
  }, [floatY, radar, radar2, liveDot]);

  const carTranslateY = floatY.interpolate({
    inputRange: [0, 1],
    outputRange: [3, -6],
  });

  const ringScale = radar.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1.35],
  });

  const ringOpacity = radar.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.45, 0],
  });

  const ring2Scale = radar2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1.35],
  });

  const ring2Opacity = radar2.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.3, 0],
  });

  const dotOpacity = liveDot.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  return (
    <AnimatedTripCard style={styles.wrap}>
      <View style={styles.card}>
        {showStandbyBadge ? (
          <View style={styles.standbyPill}>
            <Animated.View style={[styles.liveDot, { opacity: dotOpacity }]} />
            <Text style={styles.standbyText}>On standby</Text>
          </View>
        ) : null}

        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.radarRing,
              { opacity: ringOpacity, transform: [{ scale: ringScale }] },
            ]}
          />
          <Animated.View
            style={[
              styles.radarRing,
              styles.radarRingInner,
              { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] },
            ]}
          />
          <View style={styles.carPlate}>
            <Animated.View style={{ transform: [{ translateY: carTranslateY }] }}>
              <Image
                source={CAR_ICON}
                style={styles.carImage}
                resizeMode="contain"
                accessibilityLabel="Standby for dispatch"
              />
            </Animated.View>
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{description}</Text>

        {onPress && ctaLabel ? (
          <TouchableOpacity style={styles.cta} onPress={onPress} activeOpacity={0.88}>
            <Ionicons name="list-outline" size={18} color={colors.onPrimary} style={styles.ctaIcon} />
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.hintRow}>
            <Ionicons name="notifications-outline" size={16} color={colors.textMuted} />
            <Text style={styles.hintText}>New tickets appear here automatically</Text>
          </View>
        )}
      </View>
    </AnimatedTripCard>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  standbyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.liveSoft,
    marginBottom: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.amber,
  },
  standbyText: {
    color: colors.liveText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  hero: {
    width: 220,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  radarRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.amber,
  },
  radarRingInner: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  carPlate: {
    width: 132,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  carImage: {
    width: 108,
    height: 64,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  desc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 18,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  hintText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: radius.button,
    minWidth: '88%',
  },
  ctaIcon: {
    marginRight: 8,
  },
  ctaText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
});
