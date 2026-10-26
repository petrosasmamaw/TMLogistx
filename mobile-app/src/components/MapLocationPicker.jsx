import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/colors';
import { buildLeafletPickerHtml } from '../utils/leafletMapHtml';
import { getMapboxAccessToken, getMapboxLeafletTileOptions, getMapboxStyleId } from '../utils/mapbox';
import { MapSkeleton } from './Skeleton';

const MAP_HOST_ID = 'tmlogistx-map-picker-host';

/**
 * Tap-to-pick map: Leaflet in WebView on iOS/Android, DOM Leaflet on web.
 */
export default function MapLocationPicker({
  visible,
  title = 'Select on map',
  initialLat = 9.02,
  initialLng = 38.75,
  onConfirm,
  onClose
}) {
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [picked, setPicked] = useState({ lat: initialLat, lng: initialLng });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) {
      setReady(false);
      return;
    }
    setPicked({ lat: initialLat, lng: initialLng });
    if (Platform.OS !== 'web') {
      return;
    }

    let cancelled = false;
    const mount = async () => {
      const host = document.getElementById(MAP_HOST_ID);
      if (!host) return;

      const loadScript = (src) =>
        new Promise((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
          }
          const s = document.createElement('script');
          s.src = src;
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });

      const loadCss = (href) => {
        if (document.querySelector(`link[href="${href}"]`)) return;
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        document.head.appendChild(l);
      };

      try {
        loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
        if (cancelled) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const L = window.L;
        const map = L.map(host, { scrollWheelZoom: true }).setView([initialLat, initialLng], 14);
        const mb = getMapboxLeafletTileOptions();
        if (mb) {
          L.tileLayer(mb.url, {
            attribution: mb.attribution,
            tileSize: mb.tileSize,
            zoomOffset: mb.zoomOffset,
            maxZoom: mb.maxZoom
          }).addTo(map);
        } else {
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(map);
        }

        const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const { lat, lng } = marker.getLatLng();
          setPicked({ lat, lng });
        });
        map.on('click', (e) => {
          marker.setLatLng(e.latlng);
          setPicked({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        setReady(true);
        setTimeout(() => map.invalidateSize(), 150);
      } catch {
        setReady(true);
      }
    };

    const t = setTimeout(mount, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [visible, initialLat, initialLng]);

  const handleConfirm = () => {
    onConfirm?.(picked.lat, picked.lng);
    onClose?.();
  };

  const mapHtml = buildLeafletPickerHtml(initialLat, initialLng, 14, {
    accessToken: getMapboxAccessToken(),
    style: getMapboxStyleId()
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>Tap the map or drag the pin to set the point.</Text>

          <View style={styles.mapWrap}>
            {Platform.OS === 'web' ? (
              <View nativeID={MAP_HOST_ID} style={styles.mapHost} />
            ) : visible ? (
              <WebView
                key={`map-${initialLat}-${initialLng}`}
                style={styles.mapHost}
                originWhitelist={['*']}
                javaScriptEnabled
                domStorageEnabled
                mixedContentMode="always"
                allowsInlineMediaPlayback
                setSupportMultipleWindows={false}
                onLoadEnd={() => setReady(true)}
                onError={() => setReady(true)}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (typeof data.lat === 'number' && typeof data.lng === 'number') {
                      setPicked({ lat: data.lat, lng: data.lng });
                    }
                  } catch {
                    /* ignore */
                  }
                }}
                source={{ html: mapHtml, baseUrl: 'https://tmlogistx.local' }}
              />
            ) : null}

            {!ready && <MapSkeleton height={280} />}
          </View>

          <Text style={styles.coords}>
            {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Use this point</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '92%'
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10
  },
  mapWrap: {
    position: 'relative',
    height: 360,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.bgTertiary
  },
  mapHost: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.bgTertiary
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,250,252,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  coords: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    alignItems: 'center'
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '700'
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center'
  },
  confirmText: {
    color: '#fff',
    fontWeight: '800'
  }
});
