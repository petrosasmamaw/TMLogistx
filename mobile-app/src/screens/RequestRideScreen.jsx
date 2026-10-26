import React, { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { upsertStaffTrip, refreshStaffTrips } from '../store/tripSlice';
import { updateLocation } from '../store/gpsSlice';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import apiClient from '../api/client';
import { mapApiRequestToMobile } from '../utils/mapApiTrip.js';
import LoadingButton from '../components/LoadingButton';
import MapLocationPicker from '../components/MapLocationPicker';
import AnimatedTripCard from '../components/AnimatedTripCard';
import RequestRoutePreview from '../components/RequestRoutePreview';
import { Skeleton } from '../components/Skeleton';
import { reverseGeocode, haversineKm } from '../utils/geo';
import useMovementFormContext from '../hooks/useMovementFormContext';

function localDateString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localTimeString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const RequestRideScreen = ({ onNavigateToActive }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { t } = useTranslation();

  const [pickupMode, setPickupMode] = useState('gps');
  const [pickupLabel, setPickupLabel] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [pickupSource, setPickupSource] = useState('gps');
  const [pickupMapOpen, setPickupMapOpen] = useState(false);
  const [loadingGps, setLoadingGps] = useState(true);

  const [destMode, setDestMode] = useState('map');
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState(null);
  const [destSource, setDestSource] = useState('map');
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  const [passengerCount, setPassengerCount] = useState('2');
  const [purpose, setPurpose] = useState('');
  const [cargoNotes, setCargoNotes] = useState('');
  const [tripCategory, setTripCategory] = useState('OFFICIAL');
  const [submitting, setSubmitting] = useState(false);
  const [departureDate, setDepartureDate] = useState(localDateString());
  const [departureTime, setDepartureTime] = useState(localTimeString());
  const [dropoffOrWait, setDropoffOrWait] = useState('');

  const { ctx, showPurpose, showDropoffWait, loading: ctxLoading } = useMovementFormContext(
    user?.project_id
  );

  const refreshGpsPickup = useCallback(async () => {
    setLoadingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location', 'Allow location to use your current position as pickup.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const label = await reverseGeocode(lat, lng);
      setPickupCoords({ lat, lng });
      setPickupLabel(label);
      setPickupSource('gps');
      setPickupMode('gps');
      dispatch(
        updateLocation({
          latitude: lat,
          longitude: lng,
          accuracy: pos.coords.accuracy,
          speedKmh: 0,
          heading: 0
        })
      );
    } catch {
      Alert.alert('Location', 'Could not read GPS. Enter pickup manually.');
      setPickupMode('manual');
    } finally {
      setLoadingGps(false);
    }
  }, []);

  useEffect(() => {
    refreshGpsPickup();
  }, [refreshGpsPickup]);

  const mapDistancePreview = () => {
    const pickupOnMap = pickupSource === 'map' || pickupSource === 'gps';
    if (!pickupOnMap || destSource !== 'map' || !pickupCoords || !destCoords) return '—';
    const km = haversineKm(pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng);
    return km != null ? `${km} km` : '—';
  };

  const handlePickupMapPick = async (lat, lng) => {
    const label = await reverseGeocode(lat, lng);
    setPickupCoords({ lat, lng });
    setPickupLabel(label);
    setPickupSource('map');
    setPickupMode('map');
  };

  const handleDestMapPick = async (lat, lng) => {
    const label = await reverseGeocode(lat, lng);
    setDestCoords({ lat, lng });
    setDestination(label);
    setDestSource('map');
    setDestMode('map');
  };

  const handleSubmit = async () => {
    let pCoords = pickupCoords;
    let pLabel = pickupLabel.trim();
    let pSrc = pickupSource;

    if (pickupMode === 'manual') {
      if (!pLabel) {
        Alert.alert('Pickup', 'Enter a pickup description.');
        return;
      }
      pCoords = null;
      pSrc = 'manual';
    } else if (!pCoords) {
      Alert.alert('Pickup', 'Set your pickup point (GPS or map).');
      return;
    }

    let dCoords = destCoords;
    let dLabel = destination.trim();
    let dSrc = destSource;

    if (destMode === 'manual') {
      if (!dLabel) {
        Alert.alert('Destination', 'Enter destination text.');
        return;
      }
      dCoords = null;
      dSrc = 'manual';
    } else if (!dCoords) {
      Alert.alert('Destination', 'Choose destination on the map.');
      return;
    }

    if ((ctxLoading || showPurpose) && !purpose.trim()) {
      Alert.alert('Required', 'Purpose of visit is required during day shift.');
      return;
    }
    if (showDropoffWait && !dropoffOrWait) {
      Alert.alert('Required', 'Select drop-off or wait at destination.');
      return;
    }
    if (!departureTime.trim()) {
      Alert.alert('Required', 'Enter time of departure.');
      return;
    }

    const mapKm =
      (pSrc === 'map' || pSrc === 'gps') &&
      dSrc === 'map' &&
      pCoords &&
      dCoords
        ? haversineKm(pCoords.lat, pCoords.lng, dCoords.lat, dCoords.lng)
        : null;

    setSubmitting(true);
    const payload = {
      project_id: user?.project_id,
      passenger_count: parseInt(passengerCount, 10) || 1,
      pickup_address: pLabel,
      pickup_location: pLabel,
      pickup_latitude: pCoords?.lat ?? null,
      pickup_longitude: pCoords?.lng ?? null,
      pickup_location_source: pSrc === 'gps' ? 'gps' : pSrc,
      destination_address: dLabel,
      destination_location: dLabel,
      destination_latitude: dCoords?.lat ?? null,
      destination_longitude: dCoords?.lng ?? null,
      destination_location_source: dSrc,
      map_estimated_distance_km: mapKm,
      departure_date: departureDate,
      departure_time: departureTime,
      dropoff_or_wait_proposal: showDropoffWait ? dropoffOrWait : dropoffOrWait || 'DROP_OFF',
      movement_shift_band: ctx?.movement_shift_band,
      purpose: showPurpose ? purpose : '',
      special_instructions: cargoNotes,
      trip_category: tripCategory
    };

    try {
      const res = await apiClient.createRequest(payload);
      const mapped = mapApiRequestToMobile(res.request || res.data);
      if (!mapped?.id) {
        throw new Error('Server did not return your request id. Try again.');
      }
      dispatch(upsertStaffTrip(mapped));
      dispatch(refreshStaffTrips({ silent: true }));
      Alert.alert('Success', t('requestSuccess'));
      setDestination('');
      setDestCoords(null);
      setPurpose('');
      setCargoNotes('');
      if (onNavigateToActive) onNavigateToActive();
    } catch (err) {
      Alert.alert('Submission Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('requestTitle')}</Text>
        <Text style={styles.subtitle}>{t('requestSubtitle')}</Text>
        {ctx ? (
          <View style={styles.shiftBanner}>
            <Text style={styles.shiftBannerTitle}>{ctx.movement_shift_label}</Text>
            <Text style={styles.shiftBannerSub}>
              {ctx.country?.name || 'Project'} · {ctx.local_time_label}
            </Text>
          </View>
        ) : null}
      </View>

      <AnimatedTripCard>
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Trip category</Text>
          <View style={styles.categoryToggle}>
            <TouchableOpacity
              style={[styles.categoryBtn, tripCategory === 'OFFICIAL' && styles.categoryBtnActive]}
              onPress={() => setTripCategory('OFFICIAL')}
            >
              <Text style={[styles.categoryBtnText, tripCategory === 'OFFICIAL' && styles.categoryBtnTextActive]}>
                Official
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.categoryBtn, tripCategory === 'PERSONAL' && styles.categoryBtnPersonalActive]}
              onPress={() => setTripCategory('PERSONAL')}
            >
              <Text style={[styles.categoryBtnText, tripCategory === 'PERSONAL' && styles.categoryBtnTextActive]}>
                Personal
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Start point</Text>
          <View style={styles.destToggle}>
            <TouchableOpacity
              style={[styles.destBtn, pickupMode === 'gps' && styles.destBtnActive]}
              onPress={() => { setPickupMode('gps'); refreshGpsPickup(); }}
            >
              <Text style={[styles.destBtnText, pickupMode === 'gps' && styles.destBtnTextActive]}>My GPS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.destBtn, pickupMode === 'map' && styles.destBtnActive]}
              onPress={() => setPickupMode('map')}
            >
              <Text style={[styles.destBtnText, pickupMode === 'map' && styles.destBtnTextActive]}>On map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.destBtn, pickupMode === 'manual' && styles.destBtnActive]}
              onPress={() => { setPickupMode('manual'); setPickupSource('manual'); setPickupCoords(null); }}
            >
              <Text style={[styles.destBtnText, pickupMode === 'manual' && styles.destBtnTextActive]}>Manual</Text>
            </TouchableOpacity>
          </View>
          {pickupMode === 'gps' && (
            <View style={styles.locationCard}>
              {loadingGps ? (
                <>
                  <Skeleton height={14} width="40%" style={{ marginBottom: 8 }} />
                  <Skeleton height={12} width="90%" style={{ marginBottom: 6 }} />
                  <Skeleton height={12} width="55%" />
                </>
              ) : (
                <>
                  <Text style={styles.locationTitle}>Your location</Text>
                  <Text style={styles.locationValue}>{pickupLabel || 'Locating…'}</Text>
                  <TouchableOpacity onPress={refreshGpsPickup}>
                    <Text style={styles.link}>Refresh GPS</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
          {pickupMode === 'map' && (
            <TouchableOpacity style={styles.mapSelectBtn} onPress={() => setPickupMapOpen(true)}>
              <Text style={styles.mapSelectTitle}>
                {pickupLabel ? pickupLabel : 'Open map to select pickup'}
              </Text>
              <Text style={styles.mapSelectSub}>Place name is filled from the map</Text>
            </TouchableOpacity>
          )}
          {pickupMode === 'manual' && (
            <TextInput
              style={styles.input}
              placeholder="Type pickup (name only — no map search)"
              placeholderTextColor={colors.textMuted}
              value={pickupLabel}
              onChangeText={setPickupLabel}
            />
          )}

          <Text style={styles.label}>
            {showPurpose ? 'Time to departure' : 'Departure time'} *
          </Text>
          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.dateInput]}
              placeholder="YYYY-MM-DD"
              value={departureDate}
              onChangeText={setDepartureDate}
            />
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="HH:MM"
              value={departureTime}
              onChangeText={setDepartureTime}
            />
          </View>

          {(ctxLoading || showPurpose) ? (
            <>
              <Text style={styles.label}>Purpose of visit *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('purposePlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={purpose}
                onChangeText={setPurpose}
              />
            </>
          ) : null}

          <Text style={styles.label}>Destination</Text>
          <View style={styles.destToggle}>
            <TouchableOpacity
              style={[styles.destBtn, destMode === 'map' && styles.destBtnActive]}
              onPress={() => setDestMode('map')}
            >
              <Text style={[styles.destBtnText, destMode === 'map' && styles.destBtnTextActive]}>Choose on map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.destBtn, destMode === 'manual' && styles.destBtnActive]}
              onPress={() => { setDestMode('manual'); setDestSource('manual'); }}
            >
              <Text style={[styles.destBtnText, destMode === 'manual' && styles.destBtnTextActive]}>Write manually</Text>
            </TouchableOpacity>
          </View>

          {destMode === 'map' ? (
            <TouchableOpacity style={styles.mapSelectBtn} onPress={() => setMapPickerOpen(true)}>
              <Text style={styles.mapSelectTitle}>
                {destination ? destination : 'Open map to select destination'}
              </Text>
              <Text style={styles.mapSelectSub}>
                {destination ? 'Tap to change pin' : 'Tap to place pin — place name shown above'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Destination address"
              placeholderTextColor={colors.textMuted}
              value={destination}
              onChangeText={setDestination}
            />
          )}

          <RequestRoutePreview
            pickupLat={pickupCoords?.lat}
            pickupLng={pickupCoords?.lng}
            destLat={destCoords?.lat}
            destLng={destCoords?.lng}
          />

          <View style={styles.distanceRow}>
            <Text style={styles.distanceLabel}>Route distance (straight-line fallback)</Text>
            <Text style={styles.distanceValue}>{mapDistancePreview()}</Text>
          </View>

          <Text style={styles.label}>{t('passengerCount')}</Text>
          <View style={styles.passengerSelector}>
            {['1', '2', '4', '6'].map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.numBtn, passengerCount === num && styles.numBtnActive]}
                onPress={() => setPassengerCount(num)}
              >
                <Text style={[styles.numBtnText, passengerCount === num && styles.numBtnTextActive]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {showDropoffWait ? (
            <>
              <Text style={styles.label}>Drop-off or wait *</Text>
              <View style={styles.dropoffRow}>
                {(ctx?.dropoff_wait_options || [
                  { value: 'DROP_OFF', label: 'Drop-off' },
                  { value: 'WAIT', label: 'Wait' },
                  { value: 'DROP_OFF_AND_WAIT', label: 'Both' }
                ]).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.dropoffBtn, dropoffOrWait === opt.value && styles.dropoffBtnActive]}
                    onPress={() => setDropoffOrWait(opt.value)}
                  >
                    <Text
                      style={[
                        styles.dropoffBtnText,
                        dropoffOrWait === opt.value && styles.dropoffBtnTextActive
                      ]}
                    >
                      {opt.label.replace(' at destination', '').replace('Drop-off and wait', 'Both')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.label}>{t('cargoNotes')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('cargoPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={cargoNotes}
            onChangeText={setCargoNotes}
            multiline
          />

          <LoadingButton
            onPress={handleSubmit}
            loading={submitting}
            loadingLabel={t('submitting') || 'Submitting…'}
            label={t('submitRequestBtn')}
            style={styles.submitBtn}
            textStyle={styles.submitBtnText}
          />
        </View>
      </AnimatedTripCard>

      <MapLocationPicker
        visible={pickupMapOpen}
        title="Select pickup"
        initialLat={pickupCoords?.lat ?? 9.02}
        initialLng={pickupCoords?.lng ?? 38.75}
        onClose={() => setPickupMapOpen(false)}
        onConfirm={handlePickupMapPick}
      />
      <MapLocationPicker
        visible={mapPickerOpen}
        title="Select destination"
        initialLat={pickupCoords?.lat ?? 9.02}
        initialLng={pickupCoords?.lng ?? 38.75}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={handleDestMapPick}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 12 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  shiftBanner: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderPrimary
  },
  shiftBannerTitle: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  shiftBannerSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  rowInputs: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1.2 },
  timeInput: { flex: 0.8 },
  dropoffRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dropoffBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    backgroundColor: colors.bgInput
  },
  dropoffBtnActive: { borderColor: colors.primary, backgroundColor: colors.bgSecondary },
  dropoffBtnText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  dropoffBtnTextActive: { color: colors.primary },
  formCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSecondary
  },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.textPrimary,
    fontSize: 14
  },
  textArea: { minHeight: 56 },
  locationCard: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    minHeight: 88,
    justifyContent: 'center'
  },
  locationTitle: { fontSize: 10, fontWeight: '800', color: colors.amber, letterSpacing: 0.5 },
  locationValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginTop: 4 },
  locationActions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  link: { color: colors.cyanLight, fontSize: 12, fontWeight: '700' },
  destToggle: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  destBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    alignItems: 'center',
    backgroundColor: colors.bgTertiary
  },
  destBtnActive: { borderColor: colors.amber, backgroundColor: colors.amberMuted },
  destBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  destBtnTextActive: { color: colors.textPrimary, fontWeight: '800' },
  mapSelectBtn: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cyan,
    borderStyle: 'dashed'
  },
  mapSelectTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  mapSelectSub: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.bgPrimary,
    borderRadius: 10
  },
  distanceLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  distanceValue: { fontSize: 16, fontWeight: '800', color: colors.amber },
  categoryToggle: { flexDirection: 'row', gap: 8 },
  categoryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    alignItems: 'center'
  },
  categoryBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: colors.brandPrimary },
  categoryBtnPersonalActive: { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: '#a855f7' },
  categoryBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  categoryBtnTextActive: { color: colors.textPrimary, fontWeight: '700' },
  passengerSelector: { flexDirection: 'row', gap: 8 },
  numBtn: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderPrimary
  },
  numBtnActive: { backgroundColor: colors.amberMuted, borderColor: colors.amber },
  numBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  numBtnTextActive: { color: colors.amber, fontWeight: '800' },
  submitBtn: {
    backgroundColor: colors.amber,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20
  },
  submitBtnText: { color: '#000', fontSize: 15, fontWeight: '800' }
});

export default RequestRideScreen;
