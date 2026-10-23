import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { refreshStaffTrips } from '../store/tripSlice';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import RequestRideScreen from './RequestRideScreen';
import ActiveRideScreen from './ActiveRideScreen';
import RideHistoryScreen from './RideHistoryScreen';
import TabBarIcon from '../components/TabBarIcon';

export const StaffHomeScreen = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'REQUEST', 'ACTIVE', 'HISTORY'
  const tripSnapshotRef = useRef({});
  const syncInFlightRef = useRef(false);

  const syncTrips = React.useCallback(() => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    dispatch(refreshStaffTrips())
      .unwrap()
      .then((rows) => {
        (rows || []).forEach((trip) => {
          if (!trip?.id) return;
          const prev = tripSnapshotRef.current[trip.id];
          const snap = {
            status: trip.status,
            driver: trip.assigned_driver_name,
            plate: trip.external_vehicle_plate
          };
          if (prev) {
            if (prev.status === 'PENDING' && trip.status === 'ASSIGNED' && trip.assigned_driver_name) {
              Alert.alert(
                'Car assigned',
                `${trip.assigned_vehicle_plate || 'Fleet vehicle'} — ${trip.assigned_driver_name} is coming to your pickup.`
              );
            }
            if (trip.status === 'EXTERNAL_AUTHORIZED' && prev.status !== 'EXTERNAL_AUTHORIZED') {
              Alert.alert(
                'Taxi / Uber arranged',
                `Coordinator sent ${trip.external_vehicle_plate || 'a taxi'} (${trip.external_driver_name || 'driver'}). Open Active Ride to start when you board.`
              );
            }
          }
          tripSnapshotRef.current[trip.id] = snap;
        });
      })
      .catch(() => {
        /* keep last known trips in store */
      })
      .finally(() => {
        syncInFlightRef.current = false;
      });
  }, [dispatch]);

  useEffect(() => {
    syncTrips();
    const poll = setInterval(syncTrips, 15000);
    return () => clearInterval(poll);
  }, [syncTrips]);

  return (
    <View style={styles.container}>
      {/* Screen Body */}
      <View style={styles.body}>
        {activeTab === 'REQUEST' && (
          <RequestRideScreen onNavigateToActive={() => setActiveTab('ACTIVE')} />
        )}
        {activeTab === 'ACTIVE' && (
          <ActiveRideScreen onNavigateToRequest={() => setActiveTab('REQUEST')} />
        )}
        {activeTab === 'HISTORY' && (
          <RideHistoryScreen onSelectTrip={() => setActiveTab('ACTIVE')} />
        )}
      </View>

      {/* Bottom Segmented Bar */}
      <View style={styles.bottomNav}>
        {/* Tab 1: Request */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'REQUEST' && styles.navItemActive]}
          onPress={() => setActiveTab('REQUEST')}
          activeOpacity={0.8}
        >
          <TabBarIcon name={activeTab === 'REQUEST' ? 'create' : 'create-outline'} focused={activeTab === 'REQUEST'} />
          <Text style={[styles.navLabel, activeTab === 'REQUEST' && styles.navLabelActive]}>
            {t('tabRequest')}
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Active Ride */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'ACTIVE' && styles.navItemActive]}
          onPress={() => setActiveTab('ACTIVE')}
          activeOpacity={0.8}
        >
          <View style={styles.pulseContainer}>
            <TabBarIcon name={activeTab === 'ACTIVE' ? 'car' : 'car-outline'} focused={activeTab === 'ACTIVE'} />
            {activeTab === 'ACTIVE' ? <View style={styles.activeDot} /> : null}
          </View>
          <Text style={[styles.navLabel, activeTab === 'ACTIVE' && styles.navLabelActive]}>
            {t('tabActiveRide')}
          </Text>
        </TouchableOpacity>

        {/* Tab 3: History */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'HISTORY' && styles.navItemActive]}
          onPress={() => setActiveTab('HISTORY')}
          activeOpacity={0.8}
        >
          <TabBarIcon name={activeTab === 'HISTORY' ? 'time' : 'time-outline'} focused={activeTab === 'HISTORY'} />
          <Text style={[styles.navLabel, activeTab === 'HISTORY' && styles.navLabelActive]}>
            {t('tabHistory')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  body: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary,
    paddingVertical: 8,
    paddingBottom: 22,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 8,
  },
  navItemActive: {},
  navLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  pulseContainer: {
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: 0,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
});

export default StaffHomeScreen;
