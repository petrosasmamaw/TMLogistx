import React, { useEffect, useId, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/colors';
import { MapSkeleton } from './Skeleton';
import { buildRequestPreviewMapHtml } from '../utils/tripMapHtml';
import { mapboxDrivingRoute } from '../utils/mapbox';

/** Start → end driving route preview on the request form */
export default function RequestRoutePreview({ pickupLat, pickupLng, destLat, destLng }) {
  const mapHostId = useId().replace(/:/g, '');
  const [planRouteCoords, setPlanRouteCoords] = useState([]);
  const [distanceKm, setDistanceKm] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const ready =
    pickupLat != null && pickupLng != null && destLat != null && destLng != null;

  useEffect(() => {
    if (!ready) {
      setPlanRouteCoords([]);
      setDistanceKm(null);
      return;
    }
    let cancelled = false;
    setRouteLoading(true);
    (async () => {
      const res = await mapboxDrivingRoute(pickupLat, pickupLng, destLat, destLng);
      if (cancelled) return;
      setPlanRouteCoords(res?.coordinates || []);
      setDistanceKm(res?.distanceKm || null);
      setRouteLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, pickupLat, pickupLng, destLat, destLng]);

  const centerLat = (pickupLat + destLat) / 2;
  const centerLng = (pickupLng + destLng) / 2;

  const html = useMemo(
    () =>
      buildRequestPreviewMapHtml({
        centerLat,
        centerLng,
        pickupLat,
        pickupLng,
        destLat,
        destLng,
        planRouteCoords
      }),
    [centerLat, centerLng, pickupLat, pickupLng, destLat, destLng, planRouteCoords]
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || !ready) return undefined;
    const mount = () => {
      const host = document.getElementById(mapHostId);
      if (!host) return;
      host.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.setAttribute('title', 'Route preview');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      iframe.style.border = 'none';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.srcdoc = html;
      host.appendChild(iframe);
    };
    const t = setTimeout(mount, 50);
    return () => {
      clearTimeout(t);
      const host = document.getElementById(mapHostId);
      if (host) host.innerHTML = '';
    };
  }, [html, mapHostId, ready]);

  if (!ready) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Driving route (fastest way)</Text>
      <View style={styles.mapBox}>
        {routeLoading && planRouteCoords.length === 0 ? <MapSkeleton height={160} /> : null}
        {Platform.OS === 'web' ? (
          <View nativeID={mapHostId} style={styles.webHost} />
        ) : (
          <WebView
            key={planRouteCoords.length}
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://tmlogistx.local' }}
            scrollEnabled={false}
            style={styles.webview}
          />
        )}
      </View>
      {distanceKm != null && (
        <Text style={styles.dist}>Estimated drive: {distanceKm} km</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, marginBottom: 4 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  mapBox: { height: 160, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSecondary },
  webHost: { flex: 1, width: '100%', height: '100%' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  dist: { marginTop: 6, color: colors.amber, fontSize: 12, fontWeight: '700' }
});
