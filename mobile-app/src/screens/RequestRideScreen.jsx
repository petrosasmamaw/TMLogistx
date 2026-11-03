import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { upsertStaffTrip, refreshStaffTrips } from '../store/tripSlice';
import { updateLocation } from '../store/gpsSlice';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import apiClient from '../api/client';
import { mapApiRequestToMobile } from '../utils/mapApiTrip.js';
import LoadingButton from '../components/LoadingButton';
import RequestRoutePreview from '../components/RequestRoutePreview';
import { Skeleton } from '../components/Skeleton';
import AppTextInput from '../components/ui/AppTextInput';
import Chip from '../components/ui/Chip';
import { reverseGeocode, haversineKm } from '../utils/geo';
import { ensureLocationAccess } from '../utils/ensureLocationAccess';
import {
  ETHIOPIA_MAP_CENTER,
  formatAccuracyHint,
  getFreshDevicePositionAsync,
  tryFreshCoordsForMapSeed,
} from '../utils/deviceLocation';
import useMovementFormContext from '../hooks/useMovementFormContext';
import RideMapScreen from '../components/RideMapScreen';
import MapPickControls from '../components/MapPickControls';
import { useSheetBanner } from '../context/SheetBannerContext';
import TripLiveMap from '../components/TripLiveMap';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../theme/layout';

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

function FormSectionTitle({ children }) {
  return <Text style={formUi.sectionTitle}>{children}</Text>;
}

/** Label + option chips + value on one block (start/dest stay grouped). */
function RouteField({ title, children, value }) {
  return (
    <View style={formUi.routeField}>
      <Text style={formUi.routeFieldTitle}>{title}</Text>
      <View style={formUi.chipRow}>{children}</View>
      <View style={formUi.routeValueWrap}>{value}</View>
    </View>
  );
}

function FormSelect({ label, children, inline }) {
  if (inline) {
    return (
      <View style={formUi.inlineSelect}>
        <Text style={formUi.selectLabel}>{label}</Text>
        <View style={formUi.chipRow}>{children}</View>
      </View>
    );
  }
  return (
    <View style={formUi.selectBlock}>
      <Text style={formUi.selectLabel}>{label}</Text>
      <View style={formUi.chipRow}>{children}</View>
    </View>
  );
}

function FormTextField({ value, onChangeText, placeholder, multiline, style }) {
  return (
    <AppTextInput
      style={[formUi.textInput, multiline && formUi.textArea, style]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  );
}

function RouteLine({
  dotColor,
  children,
  onPress,
  disabled,
}) {
  const Wrapper = onPress && !disabled ? TouchableOpacity : View;
  return (
    <Wrapper
      style={formUi.routeLine}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled || !onPress}
    >
      <View style={[formUi.routeDot, { backgroundColor: dotColor }]} />
      <View style={formUi.routeLineBody}>{children}</View>
      {onPress && !disabled ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      ) : null}
    </Wrapper>
  );
}

/** One plain text field per location when staff picks manual (no map row). */
function ManualAddressInput({ kind, value, onChangeText, placeholder }) {
  const dotColor = kind === 'destination' ? colors.danger : colors.primary;
  return (
    <RouteLine dotColor={dotColor} disabled>
      <FormTextField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={formUi.routeInput}
      />
    </RouteLine>
  );
}

const formUi = StyleSheet.create({
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 2,
  },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    marginBottom: 14,
  },
  routeField: {
    gap: 8,
  },
  routeFieldTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  routeValueWrap: {
    minHeight: 40,
    justifyContent: 'center',
  },
  softDivider: {
    height: 1,
    backgroundColor: colors.borderSecondary,
    marginVertical: 14,
    opacity: 0.85,
  },
  selectBlock: { marginBottom: 14, gap: 8 },
  inlineSelect: { marginBottom: 12, gap: 8 },
  selectLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
  },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeLineBody: { flex: 1, minWidth: 0 },
  routeText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  routePlaceholder: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  routeCaption: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  routeInput: {
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    borderRadius: 12,
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 42,
    marginBottom: 0,
  },
  textInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 88,
    paddingTop: 12,
    marginBottom: 4,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
  },
  tripFooterLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  tripFooterValue: {
    color: colors.cyanLight,
    fontSize: 12,
    fontWeight: '700',
  },
  manualHint: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 10,
    lineHeight: 16,
  },
});

export const RequestRideScreen = ({ onNavigateToActive }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const staffGps = useSelector((state) => state.gps.currentLocation);
  const { t } = useTranslation();
  const sheetBanner = useSheetBanner();

  const [pickupMode, setPickupMode] = useState('gps');
  const [pickupLabel, setPickupLabel] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [pickupSource, setPickupSource] = useState('gps');
  const [mapPickTarget, setMapPickTarget] = useState(null);
  const [pickPreview, setPickPreview] = useState(null);
  const [confirmingPick, setConfirmingPick] = useState(false);
  const [loadingGps, setLoadingGps] = useState(true);

  const [destMode, setDestMode] = useState('map');
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState(null);
  const [destSource, setDestSource] = useState('map');

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
      const allowed = await ensureLocationAccess('your pickup on the request form');
      if (!allowed) {
        setPickupLabel('');
        return;
      }
      const pos = await getFreshDevicePositionAsync();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accHint = formatAccuracyHint(pos.coords.accuracy);
      const coordFallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setPickupCoords({ lat, lng });
      setPickupLabel(`${coordFallback}${accHint}`);
      setPickupSource('gps');
      setPickupMode('gps');
      dispatch(
        updateLocation({
          latitude: lat,
          longitude: lng,
          accuracy: pos.coords.accuracy,
          speedKmh: 0,
          heading: 0,
        })
      );
      try {
        const geoLabel = await reverseGeocode(lat, lng);
        setPickupLabel(`${geoLabel}${accHint}`);
      } catch {
        /* keep coordinate label */
      }
    } catch {
      Alert.alert(
        'Location',
        'Could not get a fresh GPS fix. Move near a window or outdoors, or use “On map” to set pickup.'
      );
    } finally {
      setLoadingGps(false);
    }
  }, [dispatch]);

  useEffect(() => {
    refreshGpsPickup();
  }, [refreshGpsPickup]);

  const mapDistancePreview = () => {
    const pickupOnMap = pickupSource === 'map' || pickupSource === 'gps';
    if (!pickupOnMap || destSource !== 'map' || !pickupCoords || !destCoords) return '—';
    const km = haversineKm(pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng);
    return km != null ? `${km} km` : '—';
  };

  /** Prefer live staff GPS when pickup is manual (no pickup pin). */
  const staffLocationSeed = () => {
    if (staffGps?.latitude != null && staffGps?.longitude != null) {
      return { lat: staffGps.latitude, lng: staffGps.longitude };
    }
    return null;
  };

  const resolveMapSeed = (preferredLat, preferredLng) => {
    if (preferredLat != null && preferredLng != null) {
      return { lat: preferredLat, lng: preferredLng };
    }
    const staff = staffLocationSeed();
    if (staff) return staff;
    return { lat: ETHIOPIA_MAP_CENTER.lat, lng: ETHIOPIA_MAP_CENTER.lng };
  };

  const handlePickupMapPick = async (lat, lng) => {
    const label = await reverseGeocode(lat, lng);
    setPickupCoords({ lat, lng });
    setPickupLabel(label);
    setPickupSource('map');
    setPickupMode('map');
    dispatch(
      updateLocation({
        latitude: lat,
        longitude: lng,
        accuracy: 0,
        speedKmh: 0,
        heading: 0,
      })
    );
    setMapPickTarget(null);
  };

  const openPickupMapPicker = async () => {
    setPickupMode('map');
    const immediate = resolveMapSeed(pickupCoords?.lat, pickupCoords?.lng);
    setPickPreview({ lat: immediate.lat, lng: immediate.lng });
    setMapPickTarget('pickup');
    try {
      const staff = staffLocationSeed();
      const seed = await tryFreshCoordsForMapSeed(
        pickupCoords?.lat ?? staff?.lat,
        pickupCoords?.lng ?? staff?.lng,
        { allowCachedHint: Boolean(pickupCoords?.lat && pickupCoords?.lng) }
      );
      setPickPreview({ lat: seed.lat, lng: seed.lng });
    } catch {
      /* keep immediate seed */
    }
    await ensureLocationAccess('map pick-up');
  };

  const openDestMapPicker = async () => {
    setDestMode('map');
    const staff = staffLocationSeed();
    const immediate = resolveMapSeed(
      destCoords?.lat ?? pickupCoords?.lat ?? staff?.lat,
      destCoords?.lng ?? pickupCoords?.lng ?? staff?.lng
    );
    setPickPreview({ lat: immediate.lat, lng: immediate.lng });
    setMapPickTarget('destination');
    try {
      const staff = staffLocationSeed();
      const seed = await tryFreshCoordsForMapSeed(
        destCoords?.lat ?? pickupCoords?.lat ?? staff?.lat,
        destCoords?.lng ?? pickupCoords?.lng ?? staff?.lng,
        { allowCachedHint: false }
      );
      setPickPreview({ lat: seed.lat, lng: seed.lng });
    } catch {
      /* keep immediate seed */
    }
    await ensureLocationAccess('map destination');
  };

  const cancelMapPick = () => {
    setMapPickTarget(null);
    setPickPreview(null);
  };

  const selectMyGpsPickup = () => {
    setMapPickTarget(null);
    setPickupMode('gps');
    refreshGpsPickup();
  };

  const handleDestMapPick = async (lat, lng) => {
    const label = await reverseGeocode(lat, lng);
    setDestCoords({ lat, lng });
    setDestination(label);
    setDestSource('map');
    setDestMode('map');
    setMapPickTarget(null);
  };

  const handleBackgroundMapPick = useCallback((lat, lng, kind) => {
    if (!mapPickTarget || kind !== mapPickTarget) return;
    setPickPreview({ lat, lng });
  }, [mapPickTarget]);

  const movePickToMyLocation = async () => {
    const allowed = await ensureLocationAccess('map pick');
    if (!allowed) return;
    try {
      const pos = await getFreshDevicePositionAsync();
      setPickPreview({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      Alert.alert('Location', 'Could not get a fresh GPS fix. Drag the pin or tap the map.');
    }
  };

  const confirmMapPick = async () => {
    if (!mapPickTarget || !pickPreview) return;
    setConfirmingPick(true);
    try {
      if (mapPickTarget === 'pickup') {
        await handlePickupMapPick(pickPreview.lat, pickPreview.lng);
      } else {
        await handleDestMapPick(pickPreview.lat, pickPreview.lng);
      }
      setPickPreview(null);
    } finally {
      setConfirmingPick(false);
    }
  };

  const pickupDisplay =
    pickupMode === 'gps'
      ? loadingGps
        ? 'Getting your location…'
        : pickupLabel || 'My location'
      : pickupMode === 'map'
        ? mapPickTarget === 'pickup'
          ? pickupLabel || 'Tap the map above to set pickup'
          : pickupLabel || 'Tap “On map” to choose pickup'
        : pickupLabel || 'Type starting point';

  const pickupIsPlaceholder =
    pickupMode === 'gps'
      ? loadingGps || !pickupLabel
      : pickupMode === 'map'
        ? !pickupLabel
        : !pickupLabel.trim();

  const destDisplay =
    destMode === 'map'
      ? mapPickTarget === 'destination'
        ? destination || 'Tap the map above to set destination'
        : destination || 'Tap “On map” to set destination'
      : destination || 'Type destination';

  const destIsPlaceholder =
    destMode === 'map' ? !destination.trim() : !destination.trim();

  const previewPickupLat =
    pickupMode === 'gps'
      ? pickupCoords?.lat
      : pickupMode === 'map'
        ? pickupCoords?.lat
        : pickupCoords?.lat;
  const previewPickupLng =
    pickupMode === 'gps'
      ? pickupCoords?.lng
      : pickupMode === 'map'
        ? pickupCoords?.lng
        : pickupCoords?.lng;

  const staffMapLat =
    pickupCoords?.lat ?? previewPickupLat ?? staffGps?.latitude ?? null;
  const staffMapLng =
    pickupCoords?.lng ?? previewPickupLng ?? staffGps?.longitude ?? null;

  const mapCenterFallback = staffLocationSeed() ?? ETHIOPIA_MAP_CENTER;

  const mapPickupLat = mapPickTarget === 'pickup' ? null : previewPickupLat;
  const mapPickupLng = mapPickTarget === 'pickup' ? null : previewPickupLng;
  const mapDestLat = mapPickTarget === 'destination' ? null : destCoords?.lat;
  const mapDestLng = mapPickTarget === 'destination' ? null : destCoords?.lng;

  const pickSeedLat =
    pickPreview?.lat ??
    (mapPickTarget === 'destination'
      ? destCoords?.lat ?? pickupCoords?.lat ?? staffGps?.latitude ?? mapCenterFallback.lat
      : pickupCoords?.lat ?? previewPickupLat ?? staffGps?.latitude ?? mapCenterFallback.lat);
  const pickSeedLng =
    pickPreview?.lng ??
    (mapPickTarget === 'destination'
      ? destCoords?.lng ?? pickupCoords?.lng ?? staffGps?.longitude ?? mapCenterFallback.lng
      : pickupCoords?.lng ?? previewPickupLng ?? staffGps?.longitude ?? mapCenterFallback.lng);

  const handleSubmit = async () => {
    let pCoords = pickupCoords;
    let pLabel = pickupLabel.trim();
    let pSrc = pickupSource;

    if (pickupMode === 'gps') {
      const allowed = await ensureLocationAccess('your pickup when submitting');
      if (!allowed) return;
      try {
        const pos = await getFreshDevicePositionAsync();
        pCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const accHint = formatAccuracyHint(pos.coords.accuracy);
        const geoLabel = await reverseGeocode(pCoords.lat, pCoords.lng);
        pLabel = `${geoLabel || pLabel || 'My location'}${accHint}`;
        pSrc = 'gps';
      } catch {
        Alert.alert('Location', 'Could not read GPS. Choose pickup on the map or enter manually.');
        return;
      }
    }

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
      pickup_location_source: pSrc,
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

  const activePickLat = pickPreview?.lat ?? pickSeedLat;
  const activePickLng = pickPreview?.lng ?? pickSeedLng;
  const mapPickActive = !!mapPickTarget;

  return (
    <RideMapScreen
      contentKey={mapPickTarget ? `request-pick-${mapPickTarget}` : 'request-form'}
      layout={mapPickActive ? 'overlay' : 'split'}
      mapFlex={mapPickActive ? 1 : 0.52}
      scroll={!mapPickActive}
      hidePanel={mapPickActive}
      banner={mapPickActive ? null : sheetBanner}
      mapOverlayBottom={
        mapPickActive ? (
          <MapPickControls
            kind={mapPickTarget}
            selecting={confirmingPick}
            onSelect={() => {
              void confirmMapPick();
            }}
            onMyLocation={() => {
              void movePickToMyLocation();
            }}
            onCancel={cancelMapPick}
            coordHint={
              pickPreview
                ? `${pickPreview.lat.toFixed(5)}, ${pickPreview.lng.toFixed(5)}`
                : ''
            }
          />
        ) : null
      }
      map={
        <TripLiveMap
          mode="staff"
          fillContainer
          showChrome={false}
          alwaysShow
          tripStatus="PENDING"
          pickupLat={mapPickActive && mapPickTarget === 'pickup' ? null : mapPickupLat}
          pickupLng={mapPickActive && mapPickTarget === 'pickup' ? null : mapPickupLng}
          destLat={mapPickActive && mapPickTarget === 'destination' ? null : mapDestLat}
          destLng={mapPickActive && mapPickTarget === 'destination' ? null : mapDestLng}
          staffLat={staffMapLat}
          staffLng={staffMapLng}
          pickMode={mapPickTarget}
          pickLat={mapPickActive ? activePickLat : null}
          pickLng={mapPickActive ? activePickLng : null}
          onMapPick={handleBackgroundMapPick}
        />
      }
    >
      {!mapPickActive ? (
        <>
      <View style={styles.header}>
        <Text style={styles.title}>{t('requestTitle')}</Text>
        <Text style={styles.subtitle}>{t('requestSubtitle')}</Text>
        {ctx ? (
          <View style={styles.shiftCard}>
            <Text style={styles.shiftCardTitle}>{ctx.movement_shift_label}</Text>
            <Text style={styles.shiftCardSub}>
              {ctx.country?.name || 'Project'} · {ctx.local_time_label}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.formCard}>
        <View style={formUi.sheet}>
          <FormSectionTitle>ROUTE</FormSectionTitle>

          <RouteField
            title="Start point"
            value={
              pickupMode === 'manual' ? (
                <ManualAddressInput
                  kind="pickup"
                  value={pickupLabel}
                  onChangeText={setPickupLabel}
                  placeholder="Starting point (text only)"
                />
              ) : pickupMode === 'gps' && loadingGps ? (
                <Skeleton height={36} width="100%" />
              ) : (
                <RouteLine
                  dotColor={colors.primary}
                  onPress={
                    pickupMode === 'map'
                      ? () => { void openPickupMapPicker(); }
                      : pickupMode === 'gps'
                        ? selectMyGpsPickup
                        : undefined
                  }
                >
                  <View>
                    {pickupMode === 'gps' && pickupLabel ? (
                      <Text style={formUi.routeCaption}>My location</Text>
                    ) : null}
                    <Text
                      style={pickupIsPlaceholder ? formUi.routePlaceholder : formUi.routeText}
                      numberOfLines={3}
                    >
                      {pickupDisplay}
                    </Text>
                  </View>
                </RouteLine>
              )
            }
          >
            <Chip label="My location" active={pickupMode === 'gps'} onPress={selectMyGpsPickup} style={styles.filterChip} />
            <Chip label="On map" active={pickupMode === 'map'} onPress={() => { void openPickupMapPicker(); }} style={styles.filterChip} />
            <Chip
              label="Manual"
              active={pickupMode === 'manual'}
              style={styles.filterChip}
              onPress={() => {
                setMapPickTarget(null);
                setPickupMode('manual');
                setPickupSource('manual');
                setPickupCoords(null);
                setPickupLabel('');
              }}
            />
          </RouteField>

          <View style={formUi.softDivider} />

          <RouteField
            title="Destination"
            value={
              destMode === 'manual' ? (
                <ManualAddressInput
                  kind="destination"
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="Destination (text only)"
                />
              ) : (
                <RouteLine dotColor={colors.danger} onPress={() => { void openDestMapPicker(); }}>
                  <Text
                    style={destIsPlaceholder ? formUi.routePlaceholder : formUi.routeText}
                    numberOfLines={3}
                  >
                    {destDisplay}
                  </Text>
                </RouteLine>
              )
            }
          >
            <Chip label="On map" active={destMode === 'map'} onPress={() => { void openDestMapPicker(); }} style={styles.filterChip} />
            <Chip
              label="Manual"
              active={destMode === 'manual'}
              style={styles.filterChip}
              onPress={() => {
                setMapPickTarget(null);
                setDestMode('manual');
                setDestSource('manual');
                setDestCoords(null);
                setDestination('');
              }}
            />
          </RouteField>

          {pickupMode === 'manual' || destMode === 'manual' ? (
            <Text style={formUi.manualHint}>
              Text addresses only — no map pin. Trip distance is recorded on the ride.
            </Text>
          ) : null}

          {pickupMode !== 'manual' && destMode !== 'manual' ? (
            <RequestRoutePreview
              pickupLat={pickupCoords?.lat}
              pickupLng={pickupCoords?.lng}
              destLat={destCoords?.lat}
              destLng={destCoords?.lng}
              compact
            />
          ) : null}

          <View style={formUi.tripFooter}>
            <Text style={formUi.tripFooterLabel}>
              {pickupMode === 'manual' || destMode === 'manual'
                ? 'Route preview'
                : 'Route distance (straight-line fallback)'}
            </Text>
            <Text style={formUi.tripFooterValue}>
              {pickupMode === 'manual' || destMode === 'manual'
                ? 'On trip'
                : mapDistancePreview()}
            </Text>
          </View>
        </View>

        <View style={formUi.sheet}>
          <FormSectionTitle>TRIP DETAILS</FormSectionTitle>
          <FormSelect label="Trip category" inline>
            <Chip label="Official" active={tripCategory === 'OFFICIAL'} onPress={() => setTripCategory('OFFICIAL')} style={styles.filterChip} />
            <Chip label="Personal" active={tripCategory === 'PERSONAL'} onPress={() => setTripCategory('PERSONAL')} style={styles.filterChip} />
          </FormSelect>
          <FormSelect label={t('passengerCount')} inline>
            {['1', '2', '4', '6'].map((num) => (
              <Chip
                key={num}
                label={num}
                active={passengerCount === num}
                onPress={() => setPassengerCount(num)}
                minWidth={56}
                style={styles.filterChip}
              />
            ))}
          </FormSelect>

          <View style={formUi.softDivider} />

          <Text style={formUi.fieldLabel}>
            {showPurpose ? 'Time to departure' : 'Departure time'} *
          </Text>
          <View style={styles.rowInputs}>
            <FormTextField
              value={departureDate}
              onChangeText={setDepartureDate}
              placeholder="YYYY-MM-DD"
              style={styles.flexInput}
            />
            <FormTextField
              value={departureTime}
              onChangeText={setDepartureTime}
              placeholder="HH:MM"
              style={styles.flexInput}
            />
          </View>

          {(ctxLoading || showPurpose) ? (
            <>
              <Text style={formUi.fieldLabel}>Purpose</Text>
              <FormTextField
                value={purpose}
                onChangeText={setPurpose}
                placeholder={t('purposePlaceholder')}
              />
            </>
          ) : null}

          {showDropoffWait ? (
            <FormSelect label="Drop-off or wait *" inline>
              {(ctx?.dropoff_wait_options || [
                { value: 'DROP_OFF', label: 'Drop-off' },
                { value: 'WAIT', label: 'Wait' },
                { value: 'DROP_OFF_AND_WAIT', label: 'Both' },
              ]).map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label.replace(' at destination', '').replace('Drop-off and wait', 'Both')}
                  active={dropoffOrWait === opt.value}
                  onPress={() => setDropoffOrWait(opt.value)}
                  style={styles.filterChip}
                />
              ))}
            </FormSelect>
          ) : null}

          <Text style={formUi.fieldLabel}>{t('cargoNotes')}</Text>
          <FormTextField
            placeholder={t('cargoPlaceholder')}
            value={cargoNotes}
            onChangeText={setCargoNotes}
            multiline
          />
        </View>

        <LoadingButton
          onPress={handleSubmit}
          loading={submitting}
          loadingLabel={t('submitting') || 'Submitting…'}
          label={t('submitRequestBtn')}
        />
      </View>
        </>
      ) : null}
    </RideMapScreen>
  );
};

const styles = StyleSheet.create({
  header: { marginBottom: 14 },
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
  shiftCard: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.liveSoft,
  },
  shiftCardTitle: {
    color: colors.liveText,
    fontWeight: '800',
    fontSize: 13,
  },
  shiftCardSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  formCard: { paddingVertical: 2 },
  filterChip: { marginBottom: 0 },
  rowInputs: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  flexInput: { flex: 1, marginBottom: 0 },
  mapPickHint: {
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
  },
  mapPickHintText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  compactPickSheet: { paddingVertical: 4 },
  compactPickTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  compactPickSub: { fontSize: 12, color: colors.mute, marginTop: 6, lineHeight: 17 },
  compactActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  compactIconBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  compactLocateBtn: {
    borderColor: colors.primarySoft,
    backgroundColor: colors.primarySoft,
  },
  compactSelectWrap: { flex: 1, minWidth: 0 },
});

export default RequestRideScreen;
