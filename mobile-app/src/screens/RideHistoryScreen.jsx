import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveTrip } from '../store/tripSlice';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import { ListSkeleton } from '../components/Skeleton';

export const RideHistoryScreen = ({ onSelectTrip }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const requests = useSelector((state) => state.trips.requests);
  const loading = useSelector((state) => state.trips.loading);
  const showSkeleton = loading && requests.length === 0;
  const [filter, setFilter] = useState('ALL');

  const terminalStatuses = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);

  const filtered = requests.filter((r) => {
    if (filter === 'COMPLETED') return terminalStatuses.has(r.status);
    if (filter === 'ACTIVE') return r.status && !terminalStatuses.has(r.status);
    return true;
  });

  const handleCardPress = (trip) => {
    dispatch(setActiveTrip(trip));
    if (onSelectTrip) onSelectTrip(trip);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('historyTitle')}</Text>
        <Text style={styles.subtitle}>{t('historySubtitle')}</Text>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {['ALL', 'ACTIVE', 'COMPLETED'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                {f} ({f === 'ALL'
                  ? requests.length
                  : f === 'COMPLETED'
                    ? requests.filter((r) => terminalStatuses.has(r.status)).length
                    : requests.filter((r) => r.status && !terminalStatuses.has(r.status)).length})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Requests List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {showSkeleton ? (
          <ListSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyView}>
            <Text style={styles.emptyText}>{t('noHistory')}</Text>
          </View>
        ) : (
          filtered.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripCard}
              onPress={() => handleCardPress(trip)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.requestNum}>{trip.request_number}</Text>
                  <Text style={styles.dateText}>
                    {trip.pickup_datetime ? new Date(trip.pickup_datetime).toLocaleDateString() : 'Today'}
                  </Text>
                </View>
                <StatusBadge status={trip.status} />
              </View>

              <View style={styles.routeContainer}>
                <View style={styles.routeLine}>
                  <Text style={styles.routeIcon}>🟢</Text>
                  <Text style={styles.routeText} numberOfLines={1}>{trip.pickup_location}</Text>
                </View>
                <View style={styles.routeLine}>
                  <Text style={styles.routeIcon}>🔴</Text>
                  <Text style={styles.routeText} numberOfLines={1}>{trip.destination_location}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.purposeText} numberOfLines={1}>
                  {trip.external_cost ? `🚕 ${trip.external_cost} ${trip.external_currency || 'ETB'} (${trip.external_distance_km || 5.8} km)` : `🎯 ${trip.purpose}`}
                </Text>
                <Text style={styles.passengersText}>
                  👥 {trip.passenger_count}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    backgroundColor: colors.bgSecondary,
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
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  filterBtnActive: {
    backgroundColor: colors.amberMuted,
    borderColor: colors.amber,
  },
  filterBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterBtnTextActive: {
    color: colors.amber,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
    gap: 12,
  },
  emptyView: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  tripCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  requestNum: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  routeContainer: {
    backgroundColor: colors.bgInput,
    borderRadius: 8,
    padding: 10,
    gap: 6,
    marginVertical: 4,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeIcon: {
    fontSize: 8,
  },
  routeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  purposeText: {
    color: colors.textSecondary,
    fontSize: 11,
    flex: 1,
  },
  passengersText: {
    color: colors.cyanLight,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default RideHistoryScreen;
