import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import TripLiveMap from '../components/TripLiveMap';
import IncidentModal from '../components/IncidentModal';
import RideMapScreen from '../components/RideMapScreen';
import { MapDriverProgressOverlay } from '../components/MapTripStatusOverlay';
import PageShell from '../components/PageShell';
import { useSheetBanner } from '../context/SheetBannerContext';
import AnimatedTripCard from '../components/AnimatedTripCard';
import { formatDistanceDisplay, resolveTripDistanceKm } from '../utils/geo';
import { getInAppNavigationMeta } from '../utils/tripNavigation';
import { requiresRouteDistanceCounter } from '../utils/tripLocationRules';
import DriverTripDistancePanel from '../components/DriverTripDistancePanel';
import { buildDistanceCompletionPayload } from '../utils/tripDistancePayload';
import apiClient from '../api/client';
import store from '../store';
import { DriverActiveTripSkeleton } from '../components/Skeleton';
import TripContactCard from '../components/TripContactCard';
import DriverStandbyEmptyState from '../components/DriverStandbyEmptyState';
import LoadingButton from '../components/LoadingButton';

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
  const gps = useSelector((state) => state.gps.currentLocation);
  const user = useSelector((state) => state.auth.user);
  const sheetBanner = useSheetBanner();
  const distancePayloadRef = useRef(null);
  const distancePanelRef = useRef(null);

  const onDistanceReady = useCallback((payload) => {
    distancePayloadRef.current = payload;
  }, []);

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
    const lat = gps.latitude;
    const lng = gps.longitude;

    if (nextStatus === 'COMPLETED' && requiresRouteDistanceCounter(activeTrip)) {
      try {
        await distancePanelRef.current?.endCounter?.();
      } catch {
        /* location optional at end */
      }
    }

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
        if (requiresRouteDistanceCounter(activeTrip)) {
          const session = store.getState().gps.driveSession;
          const refPayload = distancePayloadRef.current;
          if (refPayload?.distance_source === 'MANUAL' && refPayload.actual_distance_km > 0) {
            Object.assign(options, refPayload);
          } else {
            Object.assign(
              options,
              buildDistanceCompletionPayload(session, false, '', activeTrip)
            );
          }
        } else {
          const km = resolveTripDistanceKm(activeTrip);
          if (km != null) {
            options.actual_distance_km = km;
            options.distance_source = 'MAP_ESTIMATE';
          }
        }
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
        distancePanelRef.current?.resetCounter?.();
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
      <PageShell contentKey="driver-empty" banner={sheetBanner}>
        <DriverStandbyEmptyState
          title={t('noAssignedTrips')}
          description={t('noAssignedTripsDesc')}
          ctaLabel={t('tabAssigned')}
          onPress={onNavigateToAssigned}
        />
      </PageShell>
    );
  }

  if (activeTrip.status === 'ASSIGNED') {
    return (
      <PageShell contentKey="driver-gate" banner={sheetBanner}>
        <DriverStandbyEmptyState
          title="Accept this trip first"
          description="Open the Trips tab, accept the assignment, then return here for Arrive → Start → End."
          ctaLabel="Go to Trips"
          onPress={onNavigateToAssigned}
          showStandbyBadge={false}
        />
      </PageShell>
    );
  }

  const action = nextAction(activeTrip.status);
  const finishingEnd = updatingStatus && pendingStep === 'COMPLETED';
  const showStepButton =
    (action && activeTrip.status !== 'COMPLETED') || finishingEnd;
  const stepKey = action?.key || pendingStep;
  const stepLabel = action?.label || '3. End trip';
  const distanceLabel = formatDistanceDisplay(activeTrip);
  const navMeta = getInAppNavigationMeta(activeTrip.status, 'driver', activeTrip);

  return (
    <RideMapScreen
      contentKey={`driver-active-${activeTrip.id}`}
      mapFlex={0.58}
      banner={sheetBanner}
      map={
        <>
          <TripLiveMap
            mode="driver"
            fillContainer
            showChrome={false}
            tripStatus={activeTrip.status}
            trip={activeTrip}
            pickupLat={activeTrip.pickup_latitude}
            pickupLng={activeTrip.pickup_longitude}
            destLat={activeTrip.destination_latitude}
            destLng={activeTrip.destination_longitude}
            driverLat={gps?.latitude}
            driverLng={gps?.longitude}
            speedKmh={gps?.speedKmh ?? 0}
            heading={gps?.heading ?? 0}
            distanceKm={distanceLabel}
          />
          <MapDriverProgressOverlay
            status={activeTrip.status}
            requestLabel={activeTrip.request_number}
          />
        </>
      }
    >
      <View style={styles.content}>
      {navMeta.coordinationHint ? (
        <View style={styles.coordBanner}>
          <Text style={styles.coordBannerText}>{navMeta.coordinationHint}</Text>
        </View>
      ) : null}
      <View style={styles.actionPanel}>
        {showStepButton ? (
          <LoadingButton
            onPress={() => stepKey && handleStatusTransition(stepKey)}
            loading={updatingStatus && pendingStep === stepKey}
            loadingLabel={stepPendingLabel(stepKey)}
            label={stepLabel}
            disabled={updatingStatus}
            style={styles.primaryActionBtn}
          />
        ) : null}
        <LoadingButton
          variant="secondary"
          label="Report Breakdown / Incident"
          onPress={() => setIncidentModalVisible(true)}
          style={styles.incidentBtn}
        />
      </View>

      <AnimatedTripCard>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.requestNum}>{activeTrip.request_number}</Text>
            <Text style={styles.vehicleInfo}>
              {[user?.vehicle_model, user?.vehicle_plate].filter(Boolean).join(' • ') || 'Fleet vehicle'}
            </Text>
          </View>
        </View>
      </AnimatedTripCard>

      <TripContactCard
        title="Staff passenger"
        name={activeTrip.staff_name}
        phone={activeTrip.staff_phone}
        avatarUrl={activeTrip.staff_avatar_url}
        subtitle={activeTrip.passenger_count ? `${activeTrip.passenger_count} passenger(s)` : undefined}
      />

      <DriverTripDistancePanel
        ref={distancePanelRef}
        trip={activeTrip}
        onDistanceReady={onDistanceReady}
      />

      <IncidentModal
        visible={incidentModalVisible}
        onClose={() => setIncidentModalVisible(false)}
        trip={activeTrip}
        onReportSuccess={() => {}}
      />
      </View>
    </RideMapScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingBottom: 24 },
  coordBanner: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  coordBannerText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  actionPanel: {
    gap: 10,
    marginBottom: 14,
  },
  primaryActionBtn: { marginTop: 0 },
  incidentBtn: { marginTop: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  requestNum: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  vehicleInfo: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  stepperCard: { paddingVertical: 4 },
  sectionHeading: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 },
});

export default DriverActiveTripScreen;
