import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { notifyOnce } from '../services/localNotifications';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import RequestRideScreen from './RequestRideScreen';
import ActiveRideScreen from './ActiveRideScreen';
import RideHistoryScreen from './RideHistoryScreen';
import AccountScreen from './AccountScreen';
import FloatingTabBar from '../components/FloatingTabBar';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import PageShell from '../components/PageShell';
import { useSheetBanner } from '../context/SheetBannerContext';

export const StaffHomeScreen = ({ openProfileSignal = 0 }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [requestFormKey, setRequestFormKey] = useState(0);
  const sheetBanner = useSheetBanner();

  const openRequestTab = () => {
    setRequestFormKey((k) => k + 1);
    setActiveTab('REQUEST');
  };
  const staffRequests = useSelector((state) => state.trips.requests);
  const tripSnapshotRef = useRef({});

  useEffect(() => {
    if (openProfileSignal > 0) setActiveTab('ACCOUNT');
  }, [openProfileSignal]);

  useEffect(() => {
    staffRequests.forEach((trip) => {
      if (!trip?.id) return;
      const prev = tripSnapshotRef.current[trip.id];
      const snap = {
        status: trip.status,
        driver: trip.assigned_driver_name,
        plate: trip.external_vehicle_plate,
      };
      if (prev) {
        if (prev.status === 'PENDING' && trip.status === 'ASSIGNED' && trip.assigned_driver_name) {
          const msg = `${trip.assigned_vehicle_plate || 'Fleet vehicle'} — ${trip.assigned_driver_name} is coming to your pickup.`;
          Alert.alert('Car assigned', msg);
          void notifyOnce(`staff-assigned-${trip.id}`, 'Driver assigned', msg);
        }
        if (prev.status !== 'ARRIVED' && trip.status === 'ARRIVED') {
          void notifyOnce(
            `arrived-${trip.id}`,
            'Driver arrived at pickup',
            'Your driver has arrived at the pickup location.'
          );
        }
        const prevUpper = String(prev.status || '').toUpperCase();
        const nextUpper = String(trip.status || '').toUpperCase();
        if (
          !['IN_TRANSIT', 'PASSENGER_PICKED_UP'].includes(prevUpper) &&
          ['IN_TRANSIT', 'PASSENGER_PICKED_UP'].includes(nextUpper)
        ) {
          void notifyOnce(
            `started-${trip.id}`,
            'Trip started',
            'Your driver has started the trip toward your destination.'
          );
        }
        if (prev.status !== 'COMPLETED' && trip.status === 'COMPLETED') {
          void notifyOnce(`completed-${trip.id}`, 'Trip completed', 'Your movement has been marked complete.');
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
  }, [staffRequests]);

  const tabs = [
    {
      key: 'REQUEST',
      label: t('tabRequest'),
      icon: 'map',
      iconOutline: 'map-outline',
      iconActive: 'map',
    },
    {
      key: 'ACTIVE',
      label: t('tabActiveRide'),
      icon: 'car',
      iconOutline: 'car-outline',
      iconActive: 'car',
    },
    {
      key: 'HISTORY',
      label: t('tabHistory'),
      icon: 'time',
      iconOutline: 'time-outline',
      iconActive: 'time',
    },
    {
      key: 'ACCOUNT',
      label: 'Profile',
      icon: 'person',
      iconOutline: 'person-outline',
      iconActive: 'person',
    },
  ];

  const renderBody = () => {
    if (activeTab === 'REQUEST') {
      return (
        <ScreenErrorBoundary name="Request ride">
          <RequestRideScreen
            key={`staff-request-${requestFormKey}`}
            onNavigateToActive={() => setActiveTab('ACTIVE')}
          />
        </ScreenErrorBoundary>
      );
    }
    if (activeTab === 'ACTIVE') {
      return <ActiveRideScreen onNavigateToRequest={openRequestTab} />;
    }
    if (activeTab === 'HISTORY') {
      return (
        <PageShell contentKey="history" banner={sheetBanner}>
          <RideHistoryScreen onSelectTrip={() => setActiveTab('ACTIVE')} />
        </PageShell>
      );
    }
    if (activeTab === 'ACCOUNT') {
      return (
        <PageShell contentKey="account" banner={sheetBanner}>
          <AccountScreen />
        </PageShell>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.body}>{renderBody()}</View>
      <FloatingTabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
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
});

export default StaffHomeScreen;
