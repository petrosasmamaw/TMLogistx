import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import apiClient from '../api/client';

const emptyStats = {
  trips_completed: 0,
  on_time_rate_pct: null,
  total_distance_km: 0,
  staff_rating: 5.0,
  vehicle: null,
  vehicle_status_label: null,
  completed_movements: []
};

export const DriverHistoryScreen = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(() => {
    setError(null);
    return apiClient
      .getDriverStats()
      .then((res) => {
        setStats(res.data || emptyStats);
      })
      .catch((err) => {
        setError(err.message || 'Could not load performance data');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStats();
    const poll = setInterval(loadStats, 30000);
    return () => clearInterval(poll);
  }, [loadStats]);

  const completedTrips = stats.completed_movements || [];
  const vehicle = stats.vehicle;
  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}`.trim() : null;
  const onTimeDisplay =
    stats.on_time_rate_pct != null ? `${stats.on_time_rate_pct}%` : '—';
  const distanceDisplay = `${stats.total_distance_km ?? 0} km`;
  const ratingDisplay = `${Number(stats.staff_rating ?? 5).toFixed(1)} ★`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('tabPerformance')}</Text>
        <Text style={styles.subtitle}>Daily Driver Telematics & Fulfilled Movements</Text>
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading your stats…</Text>
        </View>
      )}

      {error && !loading ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiVal}>{stats.trips_completed}</Text>
          <Text style={styles.kpiLabel}>TRIPS COMPLETED</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: colors.success }]}>{onTimeDisplay}</Text>
          <Text style={styles.kpiLabel}>ON-TIME RATE</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: colors.cyanLight }]}>{distanceDisplay}</Text>
          <Text style={styles.kpiLabel}>TOTAL DISTANCE</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: colors.amber }]}>{ratingDisplay}</Text>
          <Text style={styles.kpiLabel}>STAFF RATING</Text>
        </View>
      </View>

      <View style={styles.vehicleSpecsCard}>
        <Text style={styles.specsTitle}>ACTIVE FLEET VEHICLE</Text>
        <View style={styles.specsRow}>
          <View>
            {vehicleTitle ? (
              <>
                <Text style={styles.vehicleName}>{vehicleTitle}</Text>
                <Text style={styles.vehiclePlate}>{vehicle.plate_number}</Text>
              </>
            ) : (
              <Text style={styles.vehicleName}>No vehicle assigned</Text>
            )}
          </View>
          {vehicle ? (
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {stats.vehicle_status_label || 'IN SERVICE'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.logSectionTitle}>COMPLETED MOVEMENTS LOG</Text>
      <View style={styles.logList}>
        {!loading && completedTrips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('noHistory')}</Text>
          </View>
        ) : (
          completedTrips.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripTop}>
                <Text style={styles.tripNum}>{trip.request_number}</Text>
                <StatusBadge status={trip.status} />
              </View>

              <View style={styles.routeBox}>
                <Text style={styles.routeText} numberOfLines={1}>
                  🟢 {trip.pickup_location || 'Pickup'}
                </Text>
                <Text style={styles.routeText} numberOfLines={1}>
                  🔴 {trip.destination_location || 'Destination'}
                </Text>
              </View>

              <View style={styles.tripFooter}>
                <Text style={styles.tripDate}>
                  {trip.completed_at
                    ? new Date(trip.completed_at).toLocaleDateString()
                    : trip.pickup_datetime
                      ? new Date(trip.pickup_datetime).toLocaleDateString()
                      : '—'}
                </Text>
                <Text style={styles.tripDistance}>
                  {trip.distance_km != null ? `${trip.distance_km} km completed` : 'Distance not recorded'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  errorCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
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
  vehicleSpecsCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    marginBottom: 16,
  },
  specsTitle: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  vehiclePlate: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: colors.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.success,
  },
  statusPillText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
  },
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
    backgroundColor: colors.bgInput,
    borderRadius: 6,
    padding: 8,
    gap: 4,
    marginVertical: 4,
  },
  routeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
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
  },
  tripDistance: {
    color: colors.cyanLight,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default DriverHistoryScreen;
