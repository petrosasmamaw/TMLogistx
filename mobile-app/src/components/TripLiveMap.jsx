import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import useThrottledCoords from '../hooks/useThrottledCoords';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/colors';
import { buildTripMapHtml } from '../utils/tripMapHtml';
import {
  getDriverCarIconUri,
  getStaffMarkerIconUri,
  getDestinationMarkerIconUri
} from '../utils/mapMarkerAssets';
import {
  tripRoutePhase,
  isHeadingToDestination,
  getInAppNavigationMeta
} from '../utils/tripNavigation';
import {
  shouldShowLiveNavToDest,
  shouldShowLiveNavToPickup,
} from '../utils/tripLocationRules';
import useMapboxDrivingRoutes from '../hooks/useMapboxDrivingRoutes';
import { MapSkeleton } from './Skeleton';

/**
 * Live map for active trips (driver + staff).
 * fullBleed: absolute fill, no card chrome or metric overlays.
 */
export default function TripLiveMap({
  mode = 'staff',
  pickupLat,
  pickupLng,
  destLat,
  destLng,
  driverLat,
  driverLng,
  staffLat,
  staffLng,
  speedKmh = 0,
  heading = 0,
  etaMinutes = 8,
  distanceKm = '—',
  height = 200,
  tripStatus = 'ACCEPTED',
  fullBleed = false,
  fillContainer = false,
  showChrome = true,
  alwaysShow = false,
  pickMode = null,
  pickLat = null,
  pickLng = null,
  onMapPick,
  trip = null,
}) {
  const ADDIS_LAT = 9.0192;
  const ADDIS_LNG = 38.7525;
  const navMeta = getInAppNavigationMeta(tripStatus, mode, trip);
  const tripPhase = tripRoutePhase(tripStatus);
  const navToDest = trip
    ? shouldShowLiveNavToDest(trip, tripStatus)
    : isHeadingToDestination(tripStatus);
  const liveTargetLat = navToDest ? destLat : pickupLat;
  const liveTargetLng = navToDest ? destLng : pickupLng;

  const throttledDriver = useThrottledCoords(driverLat, driverLng, 2000);
  const mapDriverLat = throttledDriver.lat ?? driverLat;
  const mapDriverLng = throttledDriver.lng ?? driverLng;

  const liveNavToPickup = trip ? shouldShowLiveNavToPickup(trip, tripStatus) : navMeta.showLiveRoute && !navToDest;
  const liveNavToDest = trip ? shouldShowLiveNavToDest(trip, tripStatus) : navMeta.showLiveRoute && navToDest;

  const liveNavEnabled =
    !pickMode &&
    mapDriverLat != null &&
    mapDriverLng != null &&
    ((liveNavToPickup && pickupLat != null && pickupLng != null) ||
      (liveNavToDest && destLat != null && destLng != null));

  const planRouteEnabled =
    !pickMode &&
    pickupLat != null &&
    pickupLng != null &&
    destLat != null &&
    destLng != null;

  const { planRouteCoords, liveRouteCoords, routeMeta, routesLoading } = useMapboxDrivingRoutes({
    pickupLat: planRouteEnabled ? pickupLat : null,
    pickupLng: planRouteEnabled ? pickupLng : null,
    destLat: planRouteEnabled ? destLat : null,
    destLng: planRouteEnabled ? destLng : null,
    driverLat: mapDriverLat,
    driverLng: mapDriverLng,
    liveTargetLat,
    liveTargetLng,
    liveNavEnabled,
  });

  const onMapPickRef = useRef(onMapPick);
  onMapPickRef.current = onMapPick;

  useEffect(() => {
    if (!onMapPickRef.current) return undefined;

    const handleMessage = (event) => {
      let data = event?.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || data.type !== 'TRIP_MAP_PICK') return;
      if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return;
      onMapPickRef.current?.(data.lat, data.lng, data.pickMode);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
    return undefined;
  }, []);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'TRIP_MAP_PICK') {
        onMapPickRef.current?.(data.lat, data.lng, data.pickMode);
      }
    } catch {
      /* ignore */
    }
  };

  const mapHostId = useId().replace(/:/g, '');
  const webviewRef = useRef(null);
  const htmlReadyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const driverIconUrl = getDriverCarIconUri();
  const staffIconUrl = getStaffMarkerIconUri();
  const destIconUrl = getDestinationMarkerIconUri();

  const hasMap =
    alwaysShow ||
    pickMode != null ||
    (pickupLat != null && pickupLng != null) ||
    (staffLat != null && staffLng != null) ||
    (destLat != null && destLng != null) ||
    (mode === 'staff'
      ? (driverLat != null && driverLng != null) || (staffLat != null && staffLng != null)
      : driverLat != null && driverLng != null);

  const userLat =
    mode === 'staff'
      ? staffLat ?? pickupLat
      : driverLat ?? pickupLat;
  const userLng =
    mode === 'staff'
      ? staffLng ?? pickupLng
      : driverLng ?? pickupLng;
  const centerLat =
    pickMode && pickLat != null
      ? pickLat
      : userLat ?? pickupLat ?? destLat ?? ADDIS_LAT;
  const centerLng =
    pickMode && pickLng != null
      ? pickLng
      : userLng ?? pickupLng ?? destLng ?? ADDIS_LNG;
  const focusZoom =
    pickMode && pickLat != null
      ? pickMode === 'destination'
        ? 16
        : 15
      : userLat != null && userLng != null && pickupLat == null && destLat == null
        ? 14
        : 13;

  const mapKey = [
    mode,
    pickupLat != null ? Number(pickupLat).toFixed(5) : '',
    pickupLng != null ? Number(pickupLng).toFixed(5) : '',
    destLat != null ? Number(destLat).toFixed(5) : '',
    destLng != null ? Number(destLng).toFixed(5) : '',
  ].join('|');

  useEffect(() => {
    htmlReadyRef.current = false;
    setMapReady(false);
  }, [mapKey]);

  const buildInputsRef = useRef(null);
  const mapInputs = {
    centerLat,
    centerLng,
    pickupLat,
    pickupLng,
    destLat,
    destLng,
    driverLat: mapDriverLat,
    driverLng: mapDriverLng,
    staffLat: mode === 'staff' ? staffLat : null,
    staffLng: mode === 'staff' ? staffLng : null,
    tripPhase,
    navigationTitle: navMeta.title,
    markerMode: mode === 'staff' ? 'staff' : 'driver',
    planRouteCoords,
    liveRouteCoords: [],
    focusUserLat: userLat,
    focusUserLng: userLng,
    zoom: focusZoom,
    driverIconUrl,
    staffIconUrl,
    destIconUrl,
    initialPickMode: pickMode || null,
    initialPickLat: pickMode ? pickLat : null,
    initialPickLng: pickMode ? pickLng : null,
  };
  buildInputsRef.current = mapInputs;

  const html = useMemo(() => buildTripMapHtml(mapInputs), [
    mapKey,
    driverIconUrl,
    staffIconUrl,
    destIconUrl,
    tripPhase,
    navMeta.title,
    mode,
    planRouteCoords,
  ]);

  const lastPayloadRef = useRef(null);
  const sendToMap = (payload) => {
    if (!payload || !htmlReadyRef.current) return;
    if (Platform.OS === 'web') {
      const host = typeof document !== 'undefined' ? document.getElementById(mapHostId) : null;
      host?.querySelector('iframe')?.contentWindow?.postMessage(payload, '*');
      return;
    }
    const js = `window.__updateTripMap && window.__updateTripMap(${JSON.stringify(payload)}); true;`;
    webviewRef.current?.injectJavaScript(js);
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || !hasMap) return undefined;
    htmlReadyRef.current = false;

    const mount = () => {
      const host = document.getElementById(mapHostId);
      if (!host) return;
      host.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.setAttribute('title', 'Trip map');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      iframe.style.border = 'none';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.background = colors.mapFallback;
      iframe.srcdoc = html;
      iframe.onload = () => {
        htmlReadyRef.current = true;
        setMapReady(true);
        sendToMap(lastPayloadRef.current);
      };
      host.appendChild(iframe);
    };

    const t = setTimeout(mount, 50);
    return () => {
      clearTimeout(t);
      htmlReadyRef.current = false;
      setMapReady(false);
      const host = document.getElementById(mapHostId);
      if (host) host.innerHTML = '';
    };
  }, [html, mapHostId, hasMap]);

  useEffect(() => {
    const payload = {
      type: 'TRIP_MAP_UPDATE',
      driverLat: mapDriverLat,
      driverLng: mapDriverLng,
      staffLat: mode === 'staff' ? staffLat : null,
      staffLng: mode === 'staff' ? staffLng : null,
      focusUserLat: userLat,
      focusUserLng: userLng,
      planRoute: planRouteCoords,
      liveRoute: liveNavEnabled ? liveRouteCoords : [],
      pickMode: pickMode || null,
      pickLat: pickLat ?? null,
      pickLng: pickLng ?? null,
    };
    lastPayloadRef.current = payload;
    sendToMap(payload);
    return undefined;
  }, [
    mapDriverLat,
    mapDriverLng,
    staffLat,
    staffLng,
    planRouteCoords,
    liveRouteCoords,
    liveNavEnabled,
    mode,
    mapHostId,
    userLat,
    userLng,
    pickMode,
    pickLat,
    pickLng,
  ]);

  useEffect(() => {
    if (!pickMode) return undefined;
    const invalidate = () => {
      if (Platform.OS === 'web') return;
      webviewRef.current?.injectJavaScript(
        'window.__invalidateTripMap && window.__invalidateTripMap(); true;'
      );
    };
    const t1 = setTimeout(invalidate, 150);
    const t2 = setTimeout(invalidate, 450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pickMode]);

  const mapHeight = fullBleed ? undefined : height;
  const chrome = showChrome && !fullBleed;

  if (!hasMap) {
    if (fullBleed) {
      return (
        <View style={styles.fullBleedFallback}>
          <View style={styles.gridOverlay} />
        </View>
      );
    }
    return (
      <View style={[styles.card, { minHeight: height }]}>
        <View style={[styles.placeholder, { height }]}>
          <Text style={styles.placeholderText}>
            {mode === 'staff'
              ? 'Map will appear when your location is available.'
              : 'Map will appear when pickup location is set.'}
          </Text>
        </View>
      </View>
    );
  }

  const useFill = fillContainer || fullBleed;
  const mapWrapStyle = useFill
    ? styles.mapWrapFull
    : [styles.mapWrap, { height: mapHeight }];

  const outerStyle = fillContainer
    ? styles.fillContainer
    : fullBleed
      ? styles.fullBleed
      : styles.card;

  return (
    <View style={outerStyle}>
      <View style={mapWrapStyle}>
        {!mapReady ? (
          <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]}>
            <MapSkeleton height={fullBleed ? 400 : height || 280} />
          </View>
        ) : null}
        {Platform.OS === 'web' ? (
          <View
            nativeID={mapHostId}
            {...(Platform.OS === 'web' ? { id: mapHostId } : {})}
            style={styles.webMapHost}
          />
        ) : (
          <WebView
            ref={webviewRef}
            key={mapKey}
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://tmlogistx.local' }}
            scrollEnabled={false}
            style={styles.webview}
            onMessage={handleWebViewMessage}
            onLoadStart={() => {
              htmlReadyRef.current = false;
              setMapReady(false);
            }}
            onLoadEnd={() => {
              htmlReadyRef.current = true;
              setMapReady(true);
              sendToMap(lastPayloadRef.current);
            }}
          />
        )}
      </View>
      {chrome ? (
        <>
          <View style={styles.detailsStrip}>
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>{navMeta.etaLabel}</Text>
              <Text style={styles.metricValHighlight}>
                {typeof (navMeta.etaValue ?? routeMeta.liveMins ?? etaMinutes) === 'number'
                  ? `${navMeta.etaValue ?? routeMeta.liveMins ?? etaMinutes} min`
                  : navMeta.etaValue ?? routeMeta.liveMins ?? etaMinutes}
              </Text>
            </View>
            <View style={styles.dividerV} />
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Distance</Text>
              <Text style={styles.metricVal}>
                {routeMeta.liveKm != null
                  ? `${routeMeta.liveKm} km`
                  : routeMeta.planKm != null
                    ? `${routeMeta.planKm} km`
                    : distanceKm === '—' || distanceKm == null
                      ? '—'
                      : typeof distanceKm === 'number'
                        ? `${distanceKm} km`
                        : String(distanceKm)}
              </Text>
            </View>
            <View style={styles.dividerV} />
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Heading</Text>
              <Text style={styles.metricVal}>{heading}°</Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fullBleed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.mapFallback,
  },
  fullBleedFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.mapFallback,
  },
  fillContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: colors.mapFallback,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginVertical: 10,
  },
  mapWrap: { position: 'relative', backgroundColor: colors.mapFallback },
  mapWrapFull: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.mapFallback,
    alignSelf: 'stretch',
    minHeight: 200,
  },
  webMapHost: { flex: 1, width: '100%', height: '100%', minHeight: 180 },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.mapFallback,
    opacity: 0.99,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: 16,
  },
  placeholderText: { color: colors.mute, fontSize: 12, textAlign: 'center' },
  detailsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: colors.card,
  },
  metricCol: { alignItems: 'center' },
  metricLabel: { color: colors.mute, fontSize: 12, fontWeight: '600' },
  metricVal: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  metricValHighlight: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  dividerV: { width: 1, height: 24, backgroundColor: colors.line },
});
