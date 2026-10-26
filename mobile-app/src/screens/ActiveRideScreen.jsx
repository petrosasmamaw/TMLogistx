import React, { useState, useEffect } from 'react';
import useStaffActiveTrip from '../hooks/useStaffActiveTrip';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  startExternalTrip,
  completeExternalTrip,
  cancelTrip,
  clearActiveTrip,
  updateTripStatus,
  refreshStaffTrips
} from '../store/tripSlice';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import TripPipelineStepper from '../components/TripPipelineStepper';
import TripLiveMap from '../components/TripLiveMap';
import apiClient from '../api/client';
import AnimatedTripCard from '../components/AnimatedTripCard';
import { Ionicons } from '@expo/vector-icons';
import { ActiveRideSkeleton } from '../components/Skeleton';
import { formatDistanceDisplay } from '../utils/geo';
import TripContactCard from '../components/TripContactCard';

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.8;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

export const ActiveRideScreen = ({ onNavigateToRequest }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const activeTrip = useStaffActiveTrip();
  const staffLoading = useSelector((state) => state.trips.loading);
  const hasLoadedStaffTrips = useSelector((state) => state.trips.hasLoadedStaffTrips);
  const terminalStatuses = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);
  const gps = useSelector((state) => state.gps.currentLocation);

  const liveTrip = activeTrip;
  const displayTrip =
    liveTrip && !terminalStatuses.has(String(liveTrip.status || '').toUpperCase())
      ? liveTrip
      : null;

  // External Ride State
  const [fareAmount, setFareAmount] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [showFareInput, setShowFareInput] = useState(false);
  const [computedDistance, setComputedDistance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer for active external ride
  useEffect(() => {
    let timer = null;
    if (activeTrip?.status === 'IN_TRANSIT' && (activeTrip?.external_authorized || activeTrip?.external_provider)) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [activeTrip?.status, activeTrip?.external_authorized]);

  const handleCancelTrip = () => {
    Alert.alert(
      'Cancel Movement Request',
      'Are you sure you want to cancel this trip? The vehicle and driver will be released back to the fleet pool.',
      [
        { text: 'Keep Trip', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              if (liveTrip?.id) {
                await apiClient.cancelMyRequest(liveTrip.id, 'Cancelled by passenger on mobile');
              }
              dispatch(cancelTrip(liveTrip.id));
              dispatch(clearActiveTrip());
              Alert.alert('Trip Cancelled', 'Your request has been cancelled.');
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not cancel trip');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleCallRideHotline = () => {
    Linking.openURL('tel:8294').catch(() => {
      Alert.alert('Hotline', 'Dialing RIDE Ethiopia at 8294');
    });
  };

  const handleOpenTaxiApp = () => {
    Linking.openURL('https://ride8294.com').catch(() => {
      Alert.alert('RIDE Service', 'Opening RIDE transport portal');
    });
  };

  const refreshActiveTrip = async (silent = true) => {
    try {
      await dispatch(refreshStaffTrips({ silent })).unwrap();
    } catch {
      /* keep current trip in store */
    }
  };

  const handleStartFleetMeter = async () => {
    try {
      setIsSubmitting(true);
      const lat = gps.latitude || liveTrip.pickup_latitude;
      const lng = gps.longitude || liveTrip.pickup_longitude;
      await apiClient.startFleetMeter(liveTrip.id, lat, lng);
      dispatch(updateTripStatus({ tripId: liveTrip.id, status: 'IN_TRANSIT' }));
      await refreshActiveTrip();
      Alert.alert('Trip started', 'Distance counter is running from your pickup point.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not start counter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndFleetMeter = async () => {
    try {
      setIsSubmitting(true);
      const lat = gps.latitude || liveTrip.destination_latitude;
      const lng = gps.longitude || liveTrip.destination_longitude;
      const res = await apiClient.completeFleetMeter(liveTrip.id, lat, lng);
      const km = res.data?.assignment?.actual_distance_km;
      dispatch(updateTripStatus({ tripId: liveTrip.id, status: 'COMPLETED' }));
      await refreshActiveTrip();
      Alert.alert('Trip completed', km ? `Recorded distance: ${km} km` : 'Distance recorded.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not end trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Staff starts the authorized external ride
  const handleStartExternalRide = async () => {
    try {
      setIsSubmitting(true);
      const startLat = gps.latitude || liveTrip.pickup_latitude || 8.9806;
      const startLng = gps.longitude || liveTrip.pickup_longitude || 38.7997;
      const startTime = new Date().toISOString();

      await apiClient.startExternalRide(
        liveTrip.id,
        startLat,
        startLng,
        liveTrip.pickup_location
      );

      dispatch(startExternalTrip({
        tripId: liveTrip.id,
        startLat,
        startLng,
        startTime
      }));

      Alert.alert(
        '🚕 ' + t('uberAuthorizedBadge'),
        t('rideStartedNotice') || 'Ride started! Departure coordinates and time logged.'
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not start ride');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Staff reaches destination and presses End Ride
  const handleEndExternalRide = () => {
    const startLat = liveTrip.external_start_lat || liveTrip.pickup_latitude || 8.9806;
    const startLng = liveTrip.external_start_lng || liveTrip.pickup_longitude || 38.7997;
    const endLat = gps.latitude || liveTrip.destination_latitude || 9.0150;
    const endLng = gps.longitude || liveTrip.destination_longitude || 38.7620;

    const distance = calculateDistanceKm(startLat, startLng, endLat, endLng);
    setComputedDistance(distance);
    setShowFareInput(true);
  };

  // Staff submits paid fare and notes
  const handleSubmitExternalExpense = async () => {
    if (!fareAmount.trim() || isNaN(parseFloat(fareAmount))) {
      Alert.alert('Validation', 'Please enter a valid fare amount paid.');
      return;
    }

    try {
      setIsSubmitting(true);
      const fare = parseFloat(fareAmount);
      const endLat = gps.latitude || liveTrip.destination_latitude || 9.0150;
      const endLng = gps.longitude || liveTrip.destination_longitude || 38.7620;

      await apiClient.completeExternalRide({
        request_id: liveTrip.id,
        end_lat: endLat,
        end_lng: endLng,
        end_address: liveTrip.destination_location,
        fare_amount: fare,
        currency: 'ETB',
        provider_name: liveTrip.external_provider || 'Uber / RIDE',
        receipt_notes: receiptNotes
      });

      dispatch(completeExternalTrip({
        tripId: liveTrip.id,
        distanceKm: computedDistance,
        fareAmount: fare,
        currency: 'ETB',
        notes: receiptNotes
      }));

      setShowFareInput(false);
      Alert.alert(
        '✓ Trip Completed',
        `Distance: ${computedDistance} km\nFare Paid: ${fare} ETB\nExpense submitted for reimbursement!`
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not submit expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToRequestPage = () => {
    if (typeof onNavigateToRequest === 'function') {
      onNavigateToRequest();
    }
  };

  if (!displayTrip && (!hasLoadedStaffTrips || staffLoading)) {
    return <ActiveRideSkeleton />;
  }

  if (!displayTrip) {
    const endedTrip =
      liveTrip && terminalStatuses.has(String(liveTrip.status || '').toUpperCase()) ? liveTrip : null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBadge}>
          <Ionicons
            name={endedTrip ? 'checkmark-circle-outline' : 'car-outline'}
            size={40}
            color={endedTrip ? colors.success : colors.textMuted}
          />
        </View>
        <Text style={styles.emptyTitle}>
          {endedTrip ? 'Trip completed' : t('noActiveRide')}
        </Text>
        <Text style={styles.emptyDesc}>
          {endedTrip
            ? `${endedTrip.request_number || endedTrip.request_code || 'Your ride'} is finished. Open the Request tab to book another movement.`
            : t('noActiveRideDesc')}
        </Text>
        <TouchableOpacity style={styles.bookNowBtn} onPress={goToRequestPage} activeOpacity={0.85}>
          <Text style={styles.bookNowBtnText}>{t('tabRequest')} — {t('requestRide')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const trip = displayTrip;

  const isExternalAuthorized = trip.status === 'EXTERNAL_AUTHORIZED';
  const isExternalInTransit = trip.status === 'IN_TRANSIT' && (trip.external_authorized || trip.external_provider || !trip.assigned_driver_id);
  const isExternalCompleted = trip.status === 'COMPLETED' && (trip.external_cost || trip.external_authorized);

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Title & Request Number Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.requestNum}>{trip.request_number || trip.request_code}</Text>
          <Text style={styles.projectText}>{trip.project_name || 'Addis Ababa Urban Mobility'}</Text>
        </View>
        <StatusBadge status={trip.status} />
      </View>

      {trip.status === 'PENDING' && (
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>Waiting for coordinator</Text>
          <Text style={styles.pendingDesc}>
            Your request was sent to the Logistics Coordinator and Movement Officer. You will get an alert when a fleet car or Uber/taxi is assigned.
          </Text>
        </View>
      )}

      {/* ============================================================== */}
      {/* SPECIAL WORKFLOW: UBER / RIDE EXTERNAL TRANSPORT FOR STAFF     */}
      {/* ============================================================== */}
      {isExternalAuthorized && (
        <View style={styles.uberCard}>
          <View style={styles.uberHeader}>
            <Text style={styles.uberIcon}>🚕</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.uberTitle}>{t('uberAuthorizedBadge')}</Text>
              <Text style={styles.uberProvider}>{trip.external_provider || 'Uber / RIDE Transportation'}</Text>
            </View>
          </View>

          {/* Incoming Coordinator-Dispatched Taxi Card */}
          {trip.external_driver_name ? (
            <View style={styles.dispatchedTaxiCard}>
              <View style={styles.dispatchedHeader}>
                <Text style={styles.dispatchedTitle}>🚕 TAXI DISPATCHED BY COORDINATOR</Text>
                <View style={styles.providerBadge}>
                  <Text style={styles.providerBadgeText}>{trip.external_provider || 'RIDE 8294'}</Text>
                </View>
              </View>
              <View style={styles.dispatchedDetailsGrid}>
                <View style={styles.dispatchedCol}>
                  <Text style={styles.dispatchedLabel}>DRIVER NAME</Text>
                  <Text style={styles.dispatchedVal}>{trip.external_driver_name}</Text>
                </View>
                <View style={styles.dispatchedCol}>
                  <Text style={styles.dispatchedLabel}>TAXI PLATE & MODEL</Text>
                  <Text style={styles.dispatchedVal}>
                    {trip.external_vehicle_plate || 'Taxi Plate'} • {trip.external_vehicle_model || 'Sedan'}
                  </Text>
                </View>
              </View>
              {trip.external_driver_phone ? (
                <TouchableOpacity
                  style={styles.directCallTaxiBtn}
                  onPress={() => Linking.openURL(`tel:${trip.external_driver_phone}`)}
                >
                  <Text style={styles.directCallTaxiBtnText}>📞 Call Taxi Driver: {trip.external_driver_phone}</Text>
                </TouchableOpacity>
              ) : null}
              {trip.external_booking_ref ? (
                <Text style={styles.bookingRefText}>Booking Ref: {trip.external_booking_ref}</Text>
              ) : null}
            </View>
          ) : (
            <>
              <Text style={styles.uberNotice}>
                {t('uberAuthorizedNotice')}
              </Text>
              {/* Quick Contact Buttons */}
              <View style={styles.quickHailRow}>
                <TouchableOpacity style={styles.hailBtn} onPress={handleCallRideHotline}>
                  <Text style={styles.hailBtnText}>📞 {t('callRide8294')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.hailAppBtn} onPress={handleOpenTaxiApp}>
                  <Text style={styles.hailAppBtnText}>📱 {t('callUberRide')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* STEP 1: START RIDE BUTTON */}
          <View style={styles.startRideSection}>
            <Text style={styles.stepInstruction}>
              👉 When your taxi arrives and you board, press Start Ride to record departure time and location:
            </Text>
            <TouchableOpacity
              style={styles.startRideBtn}
              onPress={handleStartExternalRide}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.startRideBtnText}>▶ {t('startExternalRideBtn')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 2: RIDE IN TRANSIT (IN_TRANSIT) */}
      {isExternalInTransit && (
        <View style={styles.inTransitCard}>
          <View style={styles.inTransitHeader}>
            <View style={styles.livePulse} />
            <Text style={styles.inTransitTitle}>🚕 {trip.external_provider || 'Uber / RIDE'} IN PROGRESS</Text>
            <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
          </View>

          <Text style={styles.inTransitSubtitle}>
            Trip started at {new Date(trip.external_start_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Real-time GPS distance calculation active.
          </Text>

          {!showFareInput ? (
            <TouchableOpacity
              style={styles.endRideBtn}
              onPress={handleEndExternalRide}
            >
              <Text style={styles.endRideBtnText}>⏹ {t('endExternalRideBtn')}</Text>
            </TouchableOpacity>
          ) : (
            /* STEP 3: ARBITRATION / FARE INPUT */
            <View style={styles.fareInputBox}>
              <Text style={styles.farePromptHeading}>
                🏁 {t('enterFarePrompt')}
              </Text>

              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeLabel}>{t('distanceCalculatedLabel')}:</Text>
                <Text style={styles.distanceBadgeValue}>{computedDistance} km</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('fareAmountLabel')} (ETB) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 450"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={fareAmount}
                  onChangeText={setFareAmount}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('receiptNotesLabel')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. RIDE App receipt #8921"
                  placeholderTextColor={colors.textMuted}
                  value={receiptNotes}
                  onChangeText={setReceiptNotes}
                />
              </View>

              <TouchableOpacity
                style={styles.submitExpenseBtn}
                onPress={handleSubmitExternalExpense}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.submitExpenseBtnText}>✓ {t('submitExternalRideBtn')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* COMPLETED EXTERNAL RIDE SUMMARY */}
      {isExternalCompleted && (
        <View style={styles.completedCard}>
          <View style={styles.completedHeader}>
            <Text style={styles.completedIcon}>✓</Text>
            <View>
              <Text style={styles.completedTitle}>External Ride Completed</Text>
              <Text style={styles.completedSubtitle}>{trip.external_provider || 'Uber / RIDE'}</Text>
            </View>
          </View>
          <View style={styles.completedGrid}>
            <View style={styles.completedCol}>
              <Text style={styles.colLabel}>Distance</Text>
              <Text style={styles.colValue}>{trip.external_distance_km ? `${trip.external_distance_km} km` : '5.8 km'}</Text>
            </View>
            <View style={styles.completedCol}>
              <Text style={styles.colLabel}>Fare Paid</Text>
              <Text style={styles.colValueFare}>{trip.external_cost || 450} {trip.external_currency || 'ETB'}</Text>
            </View>
          </View>
          {trip.external_receipt_notes ? (
            <Text style={styles.receiptNoteText}>Note: {trip.external_receipt_notes}</Text>
          ) : null}
        </View>
      )}

      {/* Visual Workflow Stepper (Standard internal fleet or external) */}
      {!isExternalAuthorized && !isExternalInTransit && !isExternalCompleted && (
        <AnimatedTripCard>
          <View style={styles.stepperCard}>
            <Text style={styles.sectionHeading}>{t('currentProgress')}</Text>
            <TripPipelineStepper currentStatus={trip.status} />
          </View>
        </AnimatedTripCard>
      )}

      {/* Radar Map Preview */}
      <TripLiveMap
        mapSessionKey={trip.assignment_id || trip.id}
        mode="staff"
        tripStatus={trip.status}
        height={280}
        pickupLat={trip.pickup_latitude}
        pickupLng={trip.pickup_longitude}
        destLat={trip.destination_latitude}
        destLng={trip.destination_longitude}
        driverLat={trip.assigned_driver_latitude}
        driverLng={trip.assigned_driver_longitude}
        staffLat={gps.latitude}
        staffLng={gps.longitude}
        speedKmh={gps.speedKmh}
        heading={gps.heading}
        etaMinutes={trip.eta_minutes || 8}
        distanceKm={formatDistanceDisplay(trip)}
      />

      {/* Internal Fleet Driver Card */}
      {trip.assigned_driver_name && !isExternalAuthorized && (
        <View style={styles.comingCard}>
          <View style={styles.comingBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="car-sport-outline" size={18} color={colors.amber} />
              <Text style={styles.comingHeading}>YOUR CAR IS COMING</Text>
            </View>
            <View style={styles.etaPill}>
              <Text style={styles.etaPillText}>ETA ~ {trip.eta_minutes || 8} mins</Text>
            </View>
          </View>

          {/* Vehicle Information */}
          <View style={styles.vehRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehTitle}>{trip.assigned_vehicle_model || 'Fleet vehicle'}</Text>
              <Text style={styles.vehSub}>Assigned fleet</Text>
            </View>
            <View style={styles.plateBadge}>
              <Text style={styles.plateBadgeText}>{trip.assigned_vehicle_plate || '—'}</Text>
            </View>
          </View>

          <TripContactCard
            title="Your driver"
            name={trip.assigned_driver_name}
            phone={trip.assigned_driver_phone}
            avatarUrl={trip.assigned_driver_avatar_url}
            vehiclePlate={trip.assigned_vehicle_plate}
            vehicleModel={trip.assigned_vehicle_model}
          />

          {/* Cancel Request Button for Staff */}
          {trip.status === 'ASSIGNED' && (
            <TouchableOpacity style={styles.cancelRequestBtn} onPress={handleCancelTrip}>
              <Text style={styles.cancelRequestBtnText}>✕ Cancel Movement Request</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {trip.assigned_driver_name && !trip.external_authorized && !trip.staff_meter_started
        && ['IN_TRANSIT', 'ARRIVED'].includes(trip.status) && (
        <View style={styles.fleetMeterCard}>
          <Text style={styles.fleetMeterTitle}>Start your ride</Text>
          <Text style={styles.fleetMeterHint}>
            When you board, tap start. End at destination to record distance for coordinators.
          </Text>
          <TouchableOpacity
            style={styles.startRideBtn}
            onPress={handleStartFleetMeter}
            disabled={isSubmitting}
          >
            <Text style={styles.startRideBtnText}>▶ Start distance counter</Text>
          </TouchableOpacity>
        </View>
      )}

      {trip.staff_meter_started && !trip.staff_meter_ended && trip.status === 'IN_TRANSIT' && (
        <View style={styles.fleetMeterCard}>
          <Text style={styles.fleetMeterTitle}>Trip in progress</Text>
          <TouchableOpacity
            style={styles.endRideBtn}
            onPress={handleEndFleetMeter}
            disabled={isSubmitting}
          >
            <Text style={styles.endRideBtnText}>⏹ End trip & record distance</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Origin & Destination Card */}
      <View style={styles.routeCard}>
        <View style={styles.routeRow}>
          <View style={styles.pointGreenDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>PICKUP</Text>
            <Text style={styles.routeValue}>{trip.pickup_location}</Text>
          </View>
        </View>

        <View style={styles.routeDivider} />

        <View style={styles.routeRow}>
          <View style={styles.pointRedDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>DESTINATION</Text>
            <Text style={styles.routeValue}>{trip.destination_location}</Text>
          </View>
        </View>
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
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 28,
  },
  fleetMeterCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    padding: 16,
    marginBottom: 12,
  },
  fleetMeterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  fleetMeterHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  bookNowBtn: {
    backgroundColor: colors.amber,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookNowBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestNum: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  projectText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  // UBER / RIDE AUTHORIZED CARD
  uberCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.amber,
    marginBottom: 14,
  },
  uberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  uberIcon: {
    fontSize: 32,
  },
  uberTitle: {
    color: colors.amber,
    fontSize: 16,
    fontWeight: '900',
  },
  uberProvider: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  uberNotice: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  quickHailRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  hailBtn: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  hailBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  hailAppBtn: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  hailAppBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  startRideSection: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  stepInstruction: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  startRideBtn: {
    backgroundColor: colors.amber,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  startRideBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // IN TRANSIT CARD
  inTransitCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.amber,
    marginBottom: 14,
  },
  inTransitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.amber,
    marginRight: 6,
  },
  inTransitTitle: {
    color: colors.amber,
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },
  timerText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  inTransitSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  endRideBtn: {
    backgroundColor: colors.danger,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  endRideBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // FARE INPUT BOX
  fareInputBox: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  farePromptHeading: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  distanceBadgeLabel: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  distanceBadgeValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.bgInput,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  submitExpenseBtn: {
    backgroundColor: colors.success,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  submitExpenseBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  // COMPLETED SUMMARY CARD
  completedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.success,
    marginBottom: 12,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  completedIcon: {
    fontSize: 20,
    color: colors.success,
    fontWeight: '900',
  },
  completedTitle: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '800',
  },
  completedSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  completedGrid: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  completedCol: {
    flex: 1,
  },
  colLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  colValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  colValueFare: {
    color: colors.amber,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  receiptNoteText: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  stepperCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    marginBottom: 6,
  },
  sectionHeading: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  driverCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    marginBottom: 10,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
  },
  driverName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  vehicleModel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  plateTag: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  plateTagText: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successMuted,
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callBtnText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
  },
  routeCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pointGreenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  pointRedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  routeLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  routeDivider: {
    height: 1,
    backgroundColor: colors.borderPrimary,
    marginVertical: 10,
    marginLeft: 22,
  },
  pendingCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    marginBottom: 16,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  pendingDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  comingCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
  },
  comingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    marginBottom: 12,
  },
  comingHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brandPrimary,
    letterSpacing: 0.5,
  },
  etaPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  etaPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.emerald,
  },
  vehRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  vehTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  vehSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  plateBadge: {
    backgroundColor: colors.bgPrimary,
    borderWidth: 1.5,
    borderColor: colors.borderPrimary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  plateBadgeText: {
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 12,
    color: colors.textPrimary,
  },
  ratingText: {
    fontSize: 12,
    color: colors.amber,
    fontWeight: '700',
  },
  driverSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  cancelRequestBtn: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  cancelRequestBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.rose,
  },
  dispatchedTaxiCard: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    marginTop: 8,
    marginBottom: 12,
  },
  dispatchedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dispatchedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.amber,
    letterSpacing: 0.3,
  },
  providerBadge: {
    backgroundColor: colors.amberMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  providerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.amber,
  },
  dispatchedDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dispatchedCol: {
    flex: 1,
  },
  dispatchedLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '700',
  },
  dispatchedVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  directCallTaxiBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  directCallTaxiBtnText: {
    color: colors.emerald,
    fontSize: 12,
    fontWeight: '700',
  },
  bookingRefText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default ActiveRideScreen;
