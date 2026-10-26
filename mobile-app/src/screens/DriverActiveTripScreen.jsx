import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  AppState
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  updateTripStatus,
  clearActiveTrip,
  upsertDriverAssignment,
  refreshDriverAssignments,
  removeDriverAssignment,
  bumpDriverStats
} from '../store/tripSlice';
import { mapDriverAssignmentToMobile } from '../utils/mapApiTrip';
import { pickHigherDriverStatus } from '../utils/driverTripStatus';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import DriverThreeStepStepper from '../components/DriverThreeStepStepper';
import TripLiveMap from '../components/TripLiveMap';
import IncidentModal from '../components/IncidentModal';
import AnimatedTripCard from '../components/AnimatedTripCard';
import { formatDistanceDisplay } from '../utils/geo';
import apiClient from '../api/client';
import { DriverActiveTripSkeleton } from '../components/Skeleton';
import TripContactCard from '../components/TripContactCard';

function nextAction(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'ASSIGNED') return null;
  if (['ACCEPTED', 'HEADING_TO_PICKUP'].includes(s)) {
    return { key: 'ARRIVED', label: '1. Arrived at pickup' };
  }
  if (s === 'ARRIVED') return { key: 'IN_TRANSIT', label: '2. Start trip' };
  if (s === 'IN_TRANSIT' || s === 'PASSENGER_PICKED_UP') {
    return { key: 'COMPLETED', label: '3. End trip' };
  }
  return null;
}

export const DriverActiveTripScreen = ({ onNavigateToAssigned }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const activeTrip = useSelector((state) => state.trips.activeTrip);
  const driverLoading = useSelector((state) => state.trips.driverLoading);
  const hasLoadedDriver = useSelector((state) => state.trips.hasLoadedDriverAssignments);
  const gps = useSelector((state) => state.gps);
  const user = useSelector((state) => state.auth.user);

  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [pendingStep, setPendingStep] = useState(null);

  const stepPendingLabel = (step) => {
    if (step === 'ARRIVED') return 'Arriving…';
    if (step === 'IN_TRANSIT') return 'Starting…';
    if (step === 'COMPLETED') return 'Ending…';
    return 'Updating…';
  };

  useEffect(() => {
    let lastSync = 0;
    const syncAssignments = () => {
      const now = Date.now();
      if (now - lastSync < 30000) return;
      lastSync = now;
      dispatch(refreshDriverAssignments({ silent: true }));
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncAssignments();
    });
    return () => sub.remove();
  }, [dispatch]);

  const handleStatusTransition = async (nextStatus) => {
    if (!activeTrip) return;
    const tripKey = activeTrip.assignment_id || activeTrip.id;
    const lat = gps.currentLocation?.latitude;
    const lng = gps.currentLocation?.longitude;

    setPendingStep(nextStatus);
    const optimistic = pickHigherDriverStatus(activeTrip.status, nextStatus);
    dispatch(
      updateTripStatus({
        tripId: tripKey,
        status: optimistic,
        holdActive: nextStatus === 'COMPLETED'
      })
    );

    setUpdatingStatus(true);
    try {
      const options = { notes: `Driver step: ${nextStatus}` };
      if (nextStatus === 'IN_TRANSIT' && lat != null && lng != null) {
        options.drive_start_lat = lat;
        options.drive_start_lng = lng;
      }
      if (nextStatus === 'COMPLETED' && lat != null && lng != null) {
        options.drive_end_lat = lat;
        options.drive_end_lng = lng;
      }

      const res = await apiClient.updateTripStatus(tripKey, nextStatus, options);
      const row = res?.data;
      if (!row?.id) {
        throw new Error('Server did not confirm this step. Check your connection and try again.');
      }
      const serverStatus = String(row.status || nextStatus).toUpperCase();
      if (serverStatus !== String(nextStatus).toUpperCase()) {
        throw new Error(`Server returned status ${serverStatus} instead of ${nextStatus}.`);
      }

      const mapped = mapDriverAssignmentToMobile(row);
      if (mapped) {
        dispatch(upsertDriverAssignment({ ...mapped, status: serverStatus }));
      }

      if (nextStatus === 'COMPLETED') {
        dispatch(removeDriverAssignment(tripKey));
        dispatch(clearActiveTrip());
        dispatch(bumpDriverStats());
        await dispatch(refreshDriverAssignments({ silent: true }));
        Alert.alert('Trip closed', 'This ride is complete and visible to coordinators.');
      }
    } catch (err) {
      await dispatch(refreshDriverAssignments({ silent: false })).unwrap().catch(() => {});
      Alert.alert('Update Error', err.message || 'Could not update trip status');
    } finally {
      setUpdatingStatus(false);
      setPendingStep(null);
    }
  };

  if (!activeTrip && !hasLoadedDriver && driverLoading) {
    return <DriverActiveTripSkeleton />;
  }

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
  const finishingEnd = updatingStatus && pendingStep === 'COMPLETED';
  const showStepButton =
    (action && activeTrip.status !== 'COMPLETED') || finishingEnd;
  const stepKey = action?.key || pendingStep;
  const stepLabel = action?.label || '3. End trip';
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

      <TripContactCard
        title="Staff passenger"
        name={activeTrip.staff_name}
        phone={activeTrip.staff_phone}
        avatarUrl={activeTrip.staff_avatar_url}
        subtitle={activeTrip.passenger_count ? `${activeTrip.passenger_count} passenger(s)` : undefined}
      />

      <AnimatedTripCard delay={60}>
        <View style={styles.stepperCard}>
          <Text style={styles.sectionHeading}>Trip progress</Text>
          <DriverThreeStepStepper currentStatus={activeTrip.status} />
        </View>
      </AnimatedTripCard>

      <TripLiveMap
        mapSessionKey={activeTrip.assignment_id || activeTrip.id}
        mode="driver"
        tripStatus={activeTrip.status}
        height={280}
        pickupLat={activeTrip.pickup_latitude}
        pickupLng={activeTrip.pickup_longitude}
        destLat={activeTrip.destination_latitude}
        destLng={activeTrip.destination_longitude}
        driverLat={gps.currentLocation.latitude}
        driverLng={gps.currentLocation.longitude}
        speedKmh={gps.currentLocation.speedKmh}
        heading={gps.currentLocation.heading}
        distanceKm={distanceLabel}
      />

      {showStepButton && (
        <TouchableOpacity
          style={[styles.primaryBtn, updatingStatus && styles.primaryBtnDisabled]}
          onPress={() => stepKey && handleStatusTransition(stepKey)}
          disabled={updatingStatus}
        >
          <Text style={styles.primaryBtnText}>
            {updatingStatus && pendingStep === stepKey ? stepPendingLabel(stepKey) : stepLabel}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.incidentActionBtnFull} onPress={() => setIncidentModalVisible(true)}>
        <Text style={styles.incidentActionBtnText}>Report issue</Text>
      </TouchableOpacity>

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
  emptyDesc: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 16 },
  viewAssignedBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12
  },
  viewAssignedBtnText: { color: '#fff', fontWeight: '700' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  requestNum: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  vehicleInfo: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  stepperCard: { paddingVertical: 4 },
  sectionHeading: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16
  },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  incidentActionBtnFull: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  incidentActionBtnText: { color: colors.textMuted, fontWeight: '600' }
});

export default DriverActiveTripScreen;
