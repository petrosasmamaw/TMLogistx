import React, { useEffect, useId, useMemo, useRef } from 'react';
import useThrottledCoords from '../hooks/useThrottledCoords';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/colors';
import { buildTripMapHtml } from '../utils/tripMapHtml';
import {
  tripRoutePhase,
  isHeadingToDestination,
  getInAppNavigationMeta
} from '../utils/tripNavigation';
import useMapboxDrivingRoutes from '../hooks/useMapboxDrivingRoutes';
import { MapSkeleton } from './Skeleton';

/**
 * Live Mapbox map for active trips (driver + staff).
 * Web: iframe (WebView is not supported on web). Native: WebView.
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
  tripStatus = 'ACCEPTED'
}) {
  const navMeta = getInAppNavigationMeta(tripStatus, mode);
  const tripPhase = tripRoutePhase(tripStatus);
  const liveTargetLat = isHeadingToDestination(tripStatus) ? destLat : pickupLat;
  const liveTargetLng = isHeadingToDestination(tripStatus) ? destLng : pickupLng;

  const throttledDriver = useThrottledCoords(driverLat, driverLng, 2000);
  const mapDriverLat = throttledDriver.lat ?? driverLat;
  const mapDriverLng = throttledDriver.lng ?? driverLng;

  const liveNavEnabled =
    navMeta.showLiveRoute &&
    mapDriverLat != null &&
    mapDriverLng != null &&
    liveTargetLat != null &&
    liveTargetLng != null;

  const { planRouteCoords, liveRouteCoords, routeMeta, routesLoading } = useMapboxDrivingRoutes({
    pickupLat,
    pickupLng,
    destLat,
    destLng,
    driverLat: mapDriverLat,
    driverLng: mapDriverLng,
    liveTargetLat,
    liveTargetLng,
    liveNavEnabled
  });

  const etaFromRoute =
    navMeta.etaValue ?? routeMeta.liveMins ?? etaMinutes;
  const mapHostId = useId().replace(/:/g, '');
  const webviewRef = useRef(null);
  const htmlReadyRef = useRef(false);

  const hasMap =
    pickupLat != null &&
    pickupLng != null &&
    (mode === 'staff'
      ? (driverLat != null && driverLng != null) || (staffLat != null && staffLng != null)
      : driverLat != null && driverLng != null);

  const centerLat = pickupLat ?? 9.02;
  const centerLng = pickupLng ?? 38.75;

  const mapKey = [
    mode,
    pickupLat != null ? Number(pickupLat).toFixed(5) : '',
    pickupLng != null ? Number(pickupLng).toFixed(5) : '',
    destLat != null ? Number(destLat).toFixed(5) : '',
    destLng != null ? Number(destLng).toFixed(5) : ''
  ].join('|');

  const buildInputsRef = useRef(null);
  buildInputsRef.current = {
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
    liveRouteCoords: []
  };

  // Built once per pickup/destination; everything else streams in via TRIP_MAP_UPDATE.
  const html = useMemo(() => buildTripMapHtml(buildInputsRef.current), [mapKey]);

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
      iframe.style.background = '#f2efe9';
      iframe.srcdoc = html;
      iframe.onload = () => {
        htmlReadyRef.current = true;
        sendToMap(lastPayloadRef.current);
      };
      host.appendChild(iframe);
    };

    const t = setTimeout(mount, 50);
    return () => {
      clearTimeout(t);
      htmlReadyRef.current = false;
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
      planRoute: planRouteCoords,
      liveRoute: liveNavEnabled ? liveRouteCoords : [],
      phaseLabel: navMeta.title
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
    navMeta.title,
    mode,
    mapHostId
  ]);

  const distanceDisplay =
    routeMeta.liveKm != null
      ? `${routeMeta.liveKm} km`
      : routeMeta.planKm != null
        ? `${routeMeta.planKm} km`
        : distanceKm === '—' || distanceKm == null
          ? '—'
          : typeof distanceKm === 'number'
            ? `${distanceKm} km`
            : String(distanceKm);

  if (!hasMap) {
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

  return (
    <View style={styles.card}>
      <View style={[styles.mapWrap, { height }]}>
        {routesLoading && planRouteCoords.length === 0 && !htmlReadyRef.current ? (
          <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]}>
            <MapSkeleton height={height} />
          </View>
        ) : null}
        {Platform.OS === 'web' ? (
          <View nativeID={mapHostId} style={styles.webMapHost} />
        ) : (
          <WebView
            ref={webviewRef}
            key={mapKey}
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://tmlogistx.local' }}
            scrollEnabled={false}
            style={styles.webview}
            onLoadStart={() => {
              htmlReadyRef.current = false;
            }}
            onLoadEnd={() => {
              htmlReadyRef.current = true;
              sendToMap(lastPayloadRef.current);
            }}
          />
        )}
        <View style={styles.navBanner} pointerEvents="none">
          <Text style={styles.navTitle} numberOfLines={2}>{navMeta.title}</Text>
          <Text style={styles.navSubtitle}>{navMeta.subtitle}</Text>
        </View>
        <View style={styles.telemetryOverlay} pointerEvents="none">
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, tripPhase === 'ended' && styles.liveDotEnded]} />
            <Text style={styles.liveText}>{tripPhase === 'ended' ? 'ENDED' : 'IN-APP NAV'}</Text>
          </View>
          {mode === 'staff' && staffLat != null && (
            <Text style={styles.coordsText}>
              You {Number(staffLat).toFixed(4)}, {Number(staffLng).toFixed(4)}
            </Text>
          )}
          {mode === 'driver' && driverLat != null && (
            <Text style={styles.coordsText}>
              You {Number(driverLat).toFixed(4)}, {Number(driverLng).toFixed(4)}
            </Text>
          )}
          {mode === 'staff' && driverLat != null && (
            <Text style={styles.coordsText}>
              Driver {Number(driverLat).toFixed(4)}, {Number(driverLng).toFixed(4)}
            </Text>
          )}
        </View>
        <View style={styles.speedBadge} pointerEvents="none">
          <Text style={styles.speedValue}>{speedKmh}</Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </View>
      </View>
      <View style={styles.detailsStrip}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>{navMeta.etaLabel}</Text>
          <Text style={styles.metricValHighlight}>
            {typeof etaFromRoute === 'number' || /^\d+$/.test(String(etaFromRoute))
              ? `${etaFromRoute} min`
              : etaFromRoute}
          </Text>
        </View>
        <View style={styles.dividerV} />
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>DISTANCE</Text>
          <Text style={styles.metricVal}>{distanceDisplay}</Text>
        </View>
        <View style={styles.dividerV} />
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>HEADING</Text>
          <Text style={styles.metricVal}>{heading}°</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    overflow: 'hidden',
    marginVertical: 10
  },
  mapWrap: { position: 'relative', backgroundColor: '#e2e8f0' },
  navBanner: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    zIndex: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.5)'
  },
  navTitle: { color: '#f8fafc', fontSize: 12, fontWeight: '800' },
  navSubtitle: { color: '#93c5fd', fontSize: 10, fontWeight: '600', marginTop: 2 },
  webMapHost: { flex: 1, width: '100%', height: '100%', minHeight: 180 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgTertiary,
    padding: 16
  },
  placeholderText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  telemetryOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSecondary
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563eb' },
  liveDotEnded: { backgroundColor: colors.textMuted },
  liveText: { color: colors.success, fontSize: 9, fontWeight: '800' },
  coordsText: { color: colors.textSecondary, fontSize: 8, fontFamily: 'monospace', marginTop: 2 },
  speedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center'
  },
  speedValue: { color: colors.amber, fontSize: 14, fontWeight: '900' },
  speedUnit: { color: colors.textMuted, fontSize: 8, fontWeight: '700' },
  detailsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12
  },
  metricCol: { alignItems: 'center' },
  metricLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  metricVal: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  metricValHighlight: { color: colors.amber, fontSize: 15, fontWeight: '800' },
  dividerV: { width: 1, height: 24, backgroundColor: colors.borderPrimary }
});
