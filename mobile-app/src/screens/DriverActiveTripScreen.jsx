import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  Platform
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { updateTripStatus, clearActiveTrip } from '../store/tripSlice';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import DriverThreeStepStepper from '../components/DriverThreeStepStepper';
import MiniMapPreview from '../components/MiniMapPreview';
import IncidentModal from '../components/IncidentModal';
import AnimatedTripCard from '../components/AnimatedTripCard';
import { formatDistanceDisplay } from '../utils/geo';
import apiClient from '../api/client';

function nextAction(status) {
  if (status === 'ACCEPTED') return { key: 'ARRIVED', label: '1. Arrived at pickup' };
  if (status === 'ARRIVED') return { key: 'IN_TRANSIT', label: '2. Start trip' };
  if (status === 'IN_TRANSIT' || status === 'PASSENGER_PICKED_UP') {
    return { key: 'COMPLETED', label: '3. End trip' };
  }
  return null;
}

export const DriverActiveTripScreen = ({ onNavigateToAssigned }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const activeTrip = useSelector((state) => state.trips.activeTrip);
  const gps = useSelector((state) => state.gps);
  const user = useSelector((state) => state.auth.user);

  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleLaunchNavigation = () => {
    if (!activeTrip) return;
    const dest = encodeURIComponent(activeTrip.destination_location || activeTrip.pickup_location || '');
    const url = Platform.select({
      ios: `maps:0,0?q=${dest}`,
      android: `geo:0,0?q=${dest}`,
      default: `https://www.google.com/maps/search/?api=1&query=${dest}`
    });
    Linking.openURL(url).catch(() => {});
  };

  const handleStatusTransition = async (nextStatus) => {
    if (!activeTrip) return;
    const tripKey = activeTrip.assignment_id || activeTrip.id;

    setUpdatingStatus(true);
    try {
      await apiClient.updateTripStatus(tripKey, nextStatus, {
        notes: `Driver step: ${nextStatus}`
      });
      dispatch(updateTripStatus({ tripId: activeTrip.id, status: nextStatus }));

      if (nextStatus === 'COMPLETED') {
        Alert.alert('Trip closed', 'This ride is complete and visible to coordinators.');
        dispatch(clearActiveTrip());
      }
    } catch (err) {
      Alert.alert('Update Error', err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!activeTrip) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{t('noAssignedTrips')}</Text>
        <Text style={styles.emptyDesc}>{t('noAssignedTripsDesc')}</Text>
        <TouchableOpacity style={styles.viewAssignedBtn} onPress={onNavigateToAssigned}>
          <Text style={styles.viewAssignedBtnText}>{t('tabAssigned')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (activeTrip.status === 'ASSIGNED') {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Accept this trip first</Text>
        <Text style={styles.emptyDesc}>
          Open the Trips tab, accept the assignment, then return here for Arrive → Start → End.
        </Text>
        <TouchableOpacity style={styles.viewAssignedBtn} onPress={onNavigateToAssigned}>
          <Text style={styles.viewAssignedBtnText}>Go to Trips</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const action = nextAction(activeTrip.status);
  const distanceLabel = formatDistanceDisplay(activeTrip);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AnimatedTripCard>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.requestNum}>{activeTrip.request_number}</Text>
            <Text style={styles.vehicleInfo}>
              {[user?.vehicle_model, user?.vehicle_plate].filter(Boolean).join(' • ') || 'Fleet vehicle'}
            </Text>
          </View>
          <StatusBadge status={activeTrip.status} />
        </View>
      </AnimatedTripCard>

      <AnimatedTripCard delay={60}>
        <View style={styles.stepperCard}>
          <Text style={styles.sectionHeading}>Trip progress</Text>
          <DriverThreeStepStepper currentStatus={activeTrip.status} />
        </View>
      </AnimatedTripCard>

      <MiniMapPreview
        pickup={activeTrip.pickup_location}
        destination={activeTrip.destination_location}
        currentLat={gps.currentLocation.latitude}
        currentLng={gps.currentLocation.longitude}
        speedKmh={gps.currentLocation.speedKmh}
        heading={gps.currentLocation.heading}
        distanceKm={distanceLabel}
      />

      {action && activeTrip.status !== 'COMPLETED' && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => handleStatusTransition(action.key)}
          disabled={updatingStatus}
        >
          <Text style={styles.primaryBtnText}>{action.label}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.dualActionsRow}>
        <TouchableOpacity style={styles.navActionBtn} onPress={handleLaunchNavigation}>
          <Text style={styles.navActionBtnText}>Navigation</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.incidentActionBtn} onPress={() => setIncidentModalVisible(true)}>
          <Text style={styles.incidentActionBtnText}>Report issue</Text>
        </TouchableOpacity>
      </View>

      <IncidentModal
        visible={incidentModalVisible}
        onClose={() => setIncidentModalVisible(false)}
        trip={activeTrip}
        onReportSuccess={() => {}}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40 },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyDesc: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  viewAssignedBtn: { backgroundColor: colors.amber, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  viewAssignedBtnText: { color: '#000', fontSize: 14, fontWeight: '800' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  requestNum: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  vehicleInfo: { color: colors.amber, fontSize: 12, fontWeight: '700', marginTop: 2 },
  stepperCard: { paddingVertical: 8 },
  sectionHeading: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  primaryBtn: {
    backgroundColor: colors.amber,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  primaryBtnText: { color: '#000', fontSize: 15, fontWeight: '900' },
  dualActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  navActionBtn: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cyan
  },
  navActionBtnText: { color: colors.cyanLight, fontSize: 12, fontWeight: '800' },
  incidentActionBtn: {
    flex: 1,
    backgroundColor: colors.dangerMuted,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger
  },
  incidentActionBtnText: { color: colors.danger, fontSize: 12, fontWeight: '800' }
});

export default DriverActiveTripScreen;
