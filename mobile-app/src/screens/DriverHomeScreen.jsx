import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import DriverAssignedScreen from './DriverAssignedScreen';
import DriverActiveTripScreen from './DriverActiveTripScreen';
import DriverHistoryScreen from './DriverHistoryScreen';
import DriverFuelScreen from './DriverFuelScreen';
import DriverAccidentScreen from './DriverAccidentScreen';
import AccountScreen from './AccountScreen';
import FloatingTabBar from '../components/FloatingTabBar';
import DriverSosButton from '../components/DriverSosButton';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import RideMapScreen from '../components/RideMapScreen';
import PageShell from '../components/PageShell';
import TripLiveMap from '../components/TripLiveMap';
import { useSheetBanner } from '../context/SheetBannerContext';

export const DriverHomeScreen = ({ openProfileSignal = 0 }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('STEPPER');
  const sheetBanner = useSheetBanner();
  const gps = useSelector((state) => state.gps.currentLocation);
  const assignedTrips = useSelector((state) => state.trips.assignedTrips);
  const highlightTrip =
    assignedTrips.find((row) => String(row.status || '').toUpperCase() === 'ASSIGNED') ||
    assignedTrips[0] ||
    null;

  useEffect(() => {
    if (openProfileSignal > 0) setActiveTab('ACCOUNT');
  }, [openProfileSignal]);

  const tabs = [
    {
      key: 'STEPPER',
      label: 'Active',
      icon: 'navigate',
      iconOutline: 'navigate-outline',
      iconActive: 'navigate',
    },
    {
      key: 'ASSIGNED',
      label: 'Trips',
      icon: 'list',
      iconOutline: 'list-outline',
      iconActive: 'list',
    },
    {
      key: 'FUEL',
      label: 'Fuel',
      icon: 'water',
      iconOutline: 'water-outline',
      iconActive: 'water',
    },
    {
      key: 'STATS',
      label: 'Stats',
      icon: 'stats-chart',
      iconOutline: 'stats-chart-outline',
      iconActive: 'stats-chart',
    },
    {
      key: 'ACCOUNT',
      label: 'Profile',
      icon: 'person',
      iconOutline: 'person-outline',
      iconActive: 'person',
    },
  ];

  const tripsMap = (
    <TripLiveMap
      mode="driver"
      fillContainer
      showChrome={false}
      alwaysShow
      tripStatus={highlightTrip?.status || 'ASSIGNED'}
      trip={highlightTrip}
      pickupLat={highlightTrip?.pickup_latitude}
      pickupLng={highlightTrip?.pickup_longitude}
      destLat={highlightTrip?.destination_latitude}
      destLng={highlightTrip?.destination_longitude}
      driverLat={gps?.latitude}
      driverLng={gps?.longitude}
    />
  );

  const renderBody = () => {
    if (activeTab === 'ASSIGNED') {
      return (
        <ScreenErrorBoundary name="Driver trips">
          <RideMapScreen
            contentKey={`trips-${highlightTrip?.id || 'empty'}`}
            mapFlex={0.4}
            scroll={false}
            banner={sheetBanner}
            map={tripsMap}
          >
            <DriverAssignedScreen onNavigateToActive={() => setActiveTab('STEPPER')} />
          </RideMapScreen>
        </ScreenErrorBoundary>
      );
    }
    if (activeTab === 'STEPPER') {
      return (
        <ScreenErrorBoundary name="Driver active trip">
          <DriverActiveTripScreen onNavigateToAssigned={() => setActiveTab('ASSIGNED')} />
        </ScreenErrorBoundary>
      );
    }
    if (activeTab === 'FUEL') {
      return (
        <PageShell contentKey="fuel" banner={sheetBanner}>
          <DriverFuelScreen onBack={() => setActiveTab('STEPPER')} />
        </PageShell>
      );
    }
    if (activeTab === 'INCIDENT') {
      return (
        <PageShell contentKey="incident" banner={sheetBanner} scroll={false}>
          <DriverAccidentScreen
            onBack={() => setActiveTab('STEPPER')}
            onComplete={() => setActiveTab('STEPPER')}
          />
        </PageShell>
      );
    }
    if (activeTab === 'STATS') {
      return (
        <PageShell contentKey="stats" banner={sheetBanner}>
          <DriverHistoryScreen />
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
      <DriverSosButton onPress={() => setActiveTab('INCIDENT')} />
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

export default DriverHomeScreen;
