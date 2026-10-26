import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Linking,
  AppState
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { rejectTrip, upsertDriverAssignment, refreshDriverAssignments } from '../store/tripSlice';
import { mapDriverAssignmentToMobile } from '../utils/mapApiTrip';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import StatusBadge from '../components/StatusBadge';
import apiClient from '../api/client';
import { notifyOnce } from '../services/localNotifications';
import { DriverTripListSkeleton } from '../components/Skeleton';
import TripContactCard from '../components/TripContactCard';

export const DriverAssignedScreen = ({ onNavigateToActive }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const assignedTrips = useSelector((state) => state.trips.assignedTrips);
  const driverLoading = useSelector((state) => state.trips.driverLoading);
  const hasLoaded = useSelector((state) => state.trips.hasLoadedDriverAssignments);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const seenAssignmentsRef = useRef(new Set());

  const loadAssignments = useCallback(() => {
    dispatch(refreshDriverAssignments({ silent: false }));
  }, [dispatch]);

  useEffect(() => {
    let lastSync = 0;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastSync < 30000) return;
      lastSync = now;
      dispatch(refreshDriverAssignments({ silent: true }));
    });
    return () => sub.remove();
  }, [dispatch]);

  useEffect(() => {
    assignedTrips.forEach((trip) => {
      const key = trip.assignment_id || trip.id;
      if (trip.status === 'ASSIGNED' && key && !seenAssignmentsRef.current.has(key)) {
        seenAssignmentsRef.current.add(key);
        const msg = `You are called for a car: ${trip.pickup_location || 'pickup'} → ${trip.destination_location || 'destination'}.`;
        Alert.alert('New pickup request', msg);
        notifyOnce(`assign-${key}`, 'New trip assignment', msg);
      }
    });
  }, [assignedTrips]);

  const handleAccept = async (trip) => {
    const assignmentId = trip.assignment_id || trip.id;
    try {
      dispatch(upsertDriverAssignment({ ...trip, status: 'ACCEPTED', assignment_id: assignmentId }));
      const res = await apiClient.acceptTrip(assignmentId);
      const mapped = mapDriverAssignmentToMobile(res.data);
      if (mapped) {
        dispatch(upsertDriverAssignment({ ...mapped, status: 'ACCEPTED', assignment_id: assignmentId }));
      }
      Alert.alert('Assignment accepted', 'Use Active for map, navigation, and Arrive → Start → End.');
      if (onNavigateToActive) onNavigateToActive();
    } catch (err) {
      dispatch(refreshDriverAssignments({ silent: true }));
      Alert.alert('Error', err.message);
    }
  };

  const openRejectModal = (tripId) => {
    setSelectedTripId(tripId);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Required', 'Please enter a brief reason for declining.');
      return;
    }

    try {
      await apiClient.rejectTrip(selectedTripId, rejectReason);
      dispatch(rejectTrip({ tripId: selectedTripId, reason: rejectReason }));
      setRejectModalVisible(false);
      Alert.alert('Trip Declined', 'The Movement Officer has been alerted for re-assignment.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('driverConsoleTitle')}</Text>
        <Text style={styles.subtitle}>{t('driverConsoleSubtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {driverLoading && !hasLoaded ? (
          <DriverTripListSkeleton rows={3} />
        ) : assignedTrips.length === 0 ? (
          <View style={styles.emptyView}>
            <Text style={styles.emptyText}>{t('noAssignedTrips')}</Text>
          </View>
        ) : (
          assignedTrips.map((trip) => {
            const isPending = trip.status === 'ASSIGNED';
            const showContinue = ['ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED', 'IN_TRANSIT', 'PASSENGER_PICKED_UP'].includes(
              trip.status
            );

            return (
              <View key={trip.id} style={styles.card}>
                <View style={styles.assignmentBanner}>
                  <Text style={styles.assignmentBannerText}>
                    Assigned to pickup: {trip.pickup_location || 'See details below'}
                  </Text>
                </View>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.requestNum}>{trip.request_number}</Text>
                    <Text style={styles.dateText}>
                      {trip.pickup_datetime ? new Date(trip.pickup_datetime).toLocaleString() : 'Scheduled Today'}
                    </Text>
                  </View>
                  <StatusBadge status={trip.status} />
                </View>

                {/* Route */}
                <View style={styles.routeBox}>
                  <View style={styles.routeRow}>
                    <Ionicons name="radio-button-on" size={10} color={colors.success} />
                    <Text style={styles.routeText} numberOfLines={1}>{trip.pickup_location}</Text>
                  </View>
                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={12} color="#ef4444" />
                    <Text style={styles.routeText} numberOfLines={1}>{trip.destination_location}</Text>
                  </View>
                </View>

                <TripContactCard
                  title="Staff passenger"
                  name={trip.staff_name}
                  phone={trip.staff_phone}
                  avatarUrl={trip.staff_avatar_url}
                  subtitle={trip.passenger_count ? `${trip.passenger_count} passenger(s)` : undefined}
                />

                {trip.purpose ? (
                  <View style={styles.detailsRow}>
                    <Text style={styles.purposeText} numberOfLines={2}>Purpose: {trip.purpose}</Text>
                  </View>
                ) : null}

                {/* Accept / Reject Action Bar */}
                {isPending && (
                  <View style={styles.actionsBar}>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => openRejectModal(trip.assignment_id || trip.id)}
                    >
                      <Text style={styles.declineBtnText}>{t('rejectAssignment')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAccept(trip)}
                    >
                      <Text style={styles.acceptBtnText}>{t('acceptAssignment')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {showContinue && (
                  <TouchableOpacity style={styles.continueBtn} onPress={onNavigateToActive}>
                    <Text style={styles.continueBtnText}>Open Active trip →</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Decline Reason Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.rejectModalCard}>
            <Text style={styles.modalTitle}>{t('rejectPromptTitle')}</Text>
            <TextInput
              style={styles.rejectInput}
              placeholder={t('rejectPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmRejectBtn}
                onPress={handleConfirmReject}
              >
                <Text style={styles.confirmRejectText}>{t('confirmReject')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
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
  assignmentBanner: {
    backgroundColor: colors.primary + '18',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  assignmentBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  requestNum: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  routeBox: {
    backgroundColor: colors.bgInput,
    borderRadius: 8,
    padding: 10,
    gap: 6,
    marginVertical: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staffRow: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.bgTertiary,
    gap: 6
  },
  staffLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600'
  },
  phoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  phoneLinkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums']
  },
  routeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  detailsRow: {
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
  passengerText: {
    color: colors.cyanLight,
    fontSize: 11,
    fontWeight: '700',
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: colors.dangerMuted,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  declineBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: colors.amber,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
  },
  continueBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.primary + '22',
    borderWidth: 1,
    borderColor: colors.primary
  },
  continueBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  rejectInput: {
    backgroundColor: colors.bgInput,
    borderRadius: 8,
    padding: 12,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  confirmRejectBtn: {
    flex: 1,
    backgroundColor: colors.danger,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmRejectText: {
    color: '#fff',
    fontWeight: '800',
  },
});

export default DriverAssignedScreen;
