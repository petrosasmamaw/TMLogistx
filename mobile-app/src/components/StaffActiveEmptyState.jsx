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
 * Staff Active tab — no trip in progress (or just completed).
 */
export default function StaffActiveEmptyState({
  variant = 'idle',
  title,
  description,
  ctaLabel,
  onPress,
}) {
  const floatY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const roadShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (variant !== 'idle') return undefined;

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2800,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      })
    );

    const roadLoop = Animated.loop(
      Animated.timing(roadShift, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      })
    );

    floatLoop.start();
    pulseLoop.start();
    roadLoop.start();
    return () => {
      floatLoop.stop();
      pulseLoop.stop();
      roadLoop.stop();
    };
  }, [variant, floatY, pulse, roadShift]);

  const carTranslateY = floatY.interpolate({
    inputRange: [0, 1],
    outputRange: [4, -8],
  });

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });

  const ringOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.35, 0.12, 0.35],
  });

  const roadTranslateX = roadShift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  const isCompleted = variant === 'completed';

  return (
    <AnimatedTripCard style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.hero}>
          {!isCompleted ? (
            <>
              <Animated.View
                style={[
                  styles.pulseRing,
                  { opacity: ringOpacity, transform: [{ scale: ringScale }] },
                ]}
              />
              <Animated.View style={{ transform: [{ translateY: carTranslateY }] }}>
                <Image
                  source={CAR_ICON}
                  style={styles.carImage}
                  resizeMode="contain"
                  accessibilityLabel="No active trip"
                />
              </Animated.View>
              <View style={styles.roadTrack}>
                <Animated.View
                  style={[styles.roadDashRow, { transform: [{ translateX: roadTranslateX }] }]}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <View key={i} style={styles.roadDash} />
                  ))}
                </Animated.View>
              </View>
            </>
          ) : (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={52} color={colors.primary} />
            </View>
          )}
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{description}</Text>

        {onPress && ctaLabel ? (
          <TouchableOpacity style={styles.cta} onPress={onPress} activeOpacity={0.88}>
            <Ionicons name="map-outline" size={18} color={colors.onPrimary} style={styles.ctaIcon} />
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </AnimatedTripCard>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  hero: {
    width: 200,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pulseRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  carImage: {
    width: 120,
    height: 72,
  },
  roadTrack: {
    position: 'absolute',
    bottom: 4,
    width: 160,
    height: 8,
    overflow: 'hidden',
    opacity: 0.55,
  },
  roadDashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 280,
  },
  roadDash: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  completedBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 22,
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
