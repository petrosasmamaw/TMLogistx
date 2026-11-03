import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveTrip } from '../store/tripSlice';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import { ListSkeleton, StatsGridSkeleton } from '../components/Skeleton';
import Chip from '../components/ui/Chip';
import { spacing } from '../theme/layout';
import { resolveTripDistanceKm } from '../utils/geo';

const terminalStatuses = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);

export const RideHistoryScreen = ({ onSelectTrip }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const requests = useSelector((state) => state.trips.requests);
  const loading = useSelector((state) => state.trips.loading);
  const showSkeleton = loading && requests.length === 0;
  const [filter, setFilter] = useState('ALL');

  const stats = useMemo(() => {
    const completed = requests.filter((r) => r.status === 'COMPLETED');
    const active = requests.filter((r) => r.status && !terminalStatuses.has(r.status));
    const totalKm = completed.reduce((sum, r) => sum + (resolveTripDistanceKm(r) || 0), 0);
    return {
      total: requests.length,
      completed: completed.length,
      active: active.length,
      totalKm: Math.round(totalKm * 10) / 10
    };
  }, [requests]);

  const filtered = requests.filter((r) => {
    if (filter === 'COMPLETED') return r.status === 'COMPLETED';
    if (filter === 'ACTIVE') return r.status && !terminalStatuses.has(r.status);
    return true;
  });

  const countFor = (f) => {
    if (f === 'ALL') return requests.length;
    if (f === 'COMPLETED') return requests.filter((r) => r.status === 'COMPLETED').length;
    return requests.filter((r) => r.status && !terminalStatuses.has(r.status)).length;
  };

  const handleCardPress = (trip) => {
    dispatch(setActiveTrip(trip));
    if (onSelectTrip) onSelectTrip(trip);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('historyTitle')}</Text>
        <Text style={styles.subtitle}>{t('historySubtitle')}</Text>
      </View>

      {showSkeleton ? (
        <>
          <StatsGridSkeleton />
          <ListSkeleton rows={4} />
        </>
      ) : null}

      {!showSkeleton ? (
        <>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiVal}>{stats.total}</Text>
              <Text style={styles.kpiLabel}>TOTAL REQUESTS</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiVal, { color: colors.success }]}>{stats.completed}</Text>
              <Text style={styles.kpiLabel}>COMPLETED</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiVal, { color: colors.amber }]}>{stats.active}</Text>
              <Text style={styles.kpiLabel}>ACTIVE NOW</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiVal, { color: colors.cyanLight }]}>{stats.totalKm} km</Text>
              <Text style={styles.kpiLabel}>TOTAL DISTANCE</Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            {['ALL', 'ACTIVE', 'COMPLETED'].map((f) => (
              <Chip
                key={f}
                label={`${f} (${countFor(f)})`}
                active={filter === f}
                onPress={() => setFilter(f)}
                style={styles.filterChip}
              />
            ))}
          </View>

          <Text style={styles.logSectionTitle}>MOVEMENT REQUESTS LOG</Text>
          <View style={styles.logList}>
            {filtered.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t('noHistory')}</Text>
              </View>
            ) : (
              filtered.map((trip) => {
                const km = resolveTripDistanceKm(trip);
                const metaParts = [];
                if (trip.pickup_datetime) {
                  metaParts.push(new Date(trip.pickup_datetime).toLocaleDateString());
                }
                if (trip.assigned_driver_name) metaParts.push(trip.assigned_driver_name);
                if (trip.assigned_vehicle_plate) metaParts.push(trip.assigned_vehicle_plate);

                return (
                  <TouchableOpacity
                    key={trip.id}
                    style={styles.tripCard}
                    onPress={() => handleCardPress(trip)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.tripTop}>
                      <Text style={styles.tripNum}>{trip.request_number}</Text>
                      <StatusBadge status={trip.status} />
                    </View>

                    <View style={styles.routeBox}>
                      <View style={styles.routeLine}>
                        <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
                        <Text style={styles.routeText} numberOfLines={1}>
                          {trip.pickup_location || 'Pickup'}
                        </Text>
                      </View>
                      <View style={styles.routeLine}>
                        <View style={[styles.routeDot, { backgroundColor: colors.danger }]} />
                        <Text style={styles.routeText} numberOfLines={1}>
                          {trip.destination_location || 'Destination'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.tripFooter}>
                      <Text style={styles.tripDate}>{metaParts.length ? metaParts.join(' · ') : '—'}</Text>
                      <Text style={styles.tripDistance}>
                        {km != null ? `${km} km` : 'Distance not recorded'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  kpiVal: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: 14,
  },
  filterChip: { marginBottom: 0 },
  logSectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  logList: {
    gap: 10,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
  },
  tripCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  tripTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripNum: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  routeBox: {
    gap: 4,
    marginVertical: 4,
  },
  routeLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  tripDate: {
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  tripDistance: {
    color: colors.cyanLight,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default RideHistoryScreen;
