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
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import apiClient from '../api/client';
import { mapApiRequestToMobile } from '../utils/mapApiTrip.js';
import LoadingButton from '../components/LoadingButton';
import MapLocationPicker from '../components/MapLocationPicker';
import AnimatedTripCard from '../components/AnimatedTripCard';
import { reverseGeocode, geocodeAddress, haversineKm } from '../utils/geo';

export const RequestRideScreen = ({ onNavigateToActive }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { t } = useTranslation();

  const [pickupManual, setPickupManual] = useState(false);
  const [pickupLabel, setPickupLabel] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [pickupSource, setPickupSource] = useState('gps');
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
      setPickupManual(false);
    } catch {
      Alert.alert('Location', 'Could not read GPS. Enter pickup manually.');
      setPickupManual(true);
    } finally {
      setLoadingGps(false);
    }
  }, []);

  useEffect(() => {
    refreshGpsPickup();
  }, [refreshGpsPickup]);

  const mapDistancePreview = () => {
    if (pickupSource !== 'map' || destSource !== 'map' || !pickupCoords || !destCoords) return '—';
    const km = haversineKm(pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng);
    return km != null ? `${km} km` : '—';
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

    if (pickupManual) {
      if (!pLabel) {
        Alert.alert('Pickup', 'Enter a pickup address or use your location.');
        return;
      }
      const geo = await geocodeAddress(pLabel);
      if (!geo) {
        Alert.alert('Pickup', 'Could not find that address. Try a clearer description.');
        return;
      }
      pCoords = { lat: geo.lat, lng: geo.lng };
      pLabel = geo.label;
      pSrc = 'manual';
    }

    if (!pCoords) {
      Alert.alert('Pickup', 'Set your pickup point first.');
      return;
    }

    let dCoords = destCoords;
    let dLabel = destination.trim();
    let dSrc = destSource;

    if (destMode === 'manual') {
      if (!dLabel) {
        Alert.alert('Destination', 'Enter destination or choose on map.');
        return;
      }
      const geo = await geocodeAddress(dLabel);
      if (!geo) {
        Alert.alert('Destination', 'Could not find destination. Try map select.');
        return;
      }
      dCoords = { lat: geo.lat, lng: geo.lng };
      dLabel = geo.label;
      dSrc = 'manual';
    } else if (!dCoords) {
      Alert.alert('Destination', 'Choose destination on the map.');
      return;
    }

    if (!purpose.trim()) {
      Alert.alert('Required', t('validationError'));
      return;
    }

    const mapKm =
      pSrc === 'map' && dSrc === 'map'
        ? haversineKm(pCoords.lat, pCoords.lng, dCoords.lat, dCoords.lng)
        : null;

    setSubmitting(true);
    const payload = {
      project_id: user?.project_id,
      passenger_count: parseInt(passengerCount, 10) || 1,
      pickup_address: pLabel,
      pickup_location: pLabel,
      pickup_latitude: pCoords.lat,
      pickup_longitude: pCoords.lng,
      pickup_location_source: pSrc === 'gps' ? 'gps' : pSrc,
      destination_address: dLabel,
      destination_location: dLabel,
      destination_latitude: dCoords.lat,
      destination_longitude: dCoords.lng,
      destination_location_source: dSrc,
      map_estimated_distance_km: mapKm,
      requested_datetime: new Date().toISOString(),
      purpose,
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
      dispatch(refreshStaffTrips());
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
          {!pickupManual ? (
            <View style={styles.locationCard}>
              {loadingGps ? (
                <ActivityIndicator color={colors.amber} />
              ) : (
                <>
                  <Text style={styles.locationTitle}>Your location</Text>
                  <Text style={styles.locationValue}>{pickupLabel || 'Locating…'}</Text>
                  <View style={styles.locationActions}>
                    <TouchableOpacity onPress={refreshGpsPickup}>
                      <Text style={styles.link}>Refresh GPS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPickupManual(true)}>
                      <Text style={styles.link}>Enter manually</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Type pickup address"
                placeholderTextColor={colors.textMuted}
                value={pickupLabel}
                onChangeText={setPickupLabel}
              />
              <TouchableOpacity onPress={() => { setPickupManual(false); refreshGpsPickup(); }}>
                <Text style={styles.link}>Use my location instead</Text>
              </TouchableOpacity>
            </>
          )}

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
              <Text style={styles.mapSelectSub}>Tap to place pin on map</Text>
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

          <View style={styles.distanceRow}>
            <Text style={styles.distanceLabel}>Route distance (map only)</Text>
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

          <Text style={styles.label}>{t('purpose')} *</Text>
          <TextInput
            style={styles.input}
            placeholder={t('purposePlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={purpose}
            onChangeText={setPurpose}
          />

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
