import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ScrollView } from 'react-native';
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

/** Driver assigned-trip cards */
export function DriverTripListSkeleton({ rows = 3 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.tripCard}>
          <Skeleton height={12} width="35%" style={styles.mb} />
          <Skeleton height={16} width="70%" style={styles.mb} />
          <View style={styles.routeSkel}>
            <Skeleton width={10} height={10} borderRadius={5} />
            <Skeleton height={12} width="80%" style={{ marginLeft: 8 }} />
          </View>
          <View style={[styles.routeSkel, { marginTop: 8 }]}>
            <Skeleton width={10} height={10} borderRadius={5} />
            <Skeleton height={12} width="75%" style={{ marginLeft: 8 }} />
          </View>
          <View style={styles.btnRow}>
            <Skeleton height={40} style={{ flex: 1, borderRadius: 10 }} />
            <Skeleton height={40} width={90} borderRadius={10} style={{ marginLeft: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Staff active ride + map placeholder */
export function ActiveRideSkeleton() {
  return (
    <ScrollView style={styles.activeWrap} contentContainerStyle={styles.activeContent}>
      <View style={styles.card}>
        <Skeleton height={18} width="50%" style={styles.mb} />
        <Skeleton height={12} width="30%" />
      </View>
      <View style={styles.card}>
        <Skeleton height={14} width="40%" style={styles.mb} />
        <View style={styles.stepperRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} width={28} height={28} borderRadius={14} />
          ))}
        </View>
      </View>
      <MapSkeleton height={200} />
      <View style={styles.card}>
        <Skeleton height={14} width="60%" style={styles.mb} />
        <Skeleton height={12} width="90%" />
      </View>
    </ScrollView>
  );
}

export function MapSkeleton({ height = 180 }) {
  return (
    <View style={[styles.mapSkel, { height }]}>
      <Skeleton style={StyleSheet.absoluteFill} borderRadius={14} />
    </View>
  );
}

export function DriverActiveTripSkeleton() {
  return (
    <ScrollView style={styles.activeWrap} contentContainerStyle={styles.activeContent}>
      <View style={styles.card}>
        <Skeleton height={18} width="45%" style={styles.mb} />
        <Skeleton height={12} width="55%" />
      </View>
      <View style={styles.card}>
        <Skeleton height={14} width="35%" style={styles.mb} />
        <View style={styles.stepperRow}>
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} width={32} height={32} borderRadius={16} />
          ))}
        </View>
      </View>
      <MapSkeleton height={200} />
      <Skeleton height={48} width="100%" borderRadius={12} />
    </ScrollView>
  );
}

export function StatsGridSkeleton() {
  return (
    <View style={styles.kpiGrid}>
      {[1, 2, 3, 4].map((n) => (
        <View key={n} style={styles.kpiCard}>
          <Skeleton height={22} width="50%" style={styles.mb} />
          <Skeleton height={10} width="70%" />
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
  tripCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.bgSecondary
  },
  routeSkel: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 14
  },
  activeWrap: {
    flex: 1,
    backgroundColor: colors.bgPrimary
  },
  activeContent: {
    padding: 16,
    gap: 10
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4
  },
  mapSkel: {
    borderRadius: 14,
    overflow: 'hidden',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderSecondary
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16
  },
  kpiCard: {
    width: '47%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    backgroundColor: colors.bgSecondary
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
