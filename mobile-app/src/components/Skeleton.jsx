import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export function Skeleton({ style, width, height, borderRadius = 8 }) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { opacity, width, height, borderRadius },
        style
      ]}
    />
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton height={14} width="40%" style={styles.mb} />
          <Skeleton height={12} width="85%" style={styles.mb} />
          <Skeleton height={12} width="60%" />
        </View>
      ))}
    </View>
  );
}

export function ScreenBootSkeleton() {
  return (
    <View style={styles.boot}>
      <View style={styles.bootHeader}>
        <Skeleton width={38} height={38} borderRadius={10} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Skeleton height={16} width="55%" style={styles.mb} />
          <Skeleton height={11} width="40%" />
        </View>
      </View>
      <ListSkeleton rows={5} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.borderPrimary
  },
  mb: {
    marginBottom: 8
  },
  list: {
    padding: 16,
    gap: 12
  },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    backgroundColor: colors.bgPrimary
  },
  boot: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingTop: 48
  },
  bootHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary
  }
});

export default Skeleton;
