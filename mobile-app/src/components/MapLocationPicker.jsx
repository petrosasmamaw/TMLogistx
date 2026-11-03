import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/colors';
import { buildLeafletPickerHtml } from '../utils/leafletMapHtml';
import { getMapboxAccessToken, getMapboxLeafletTileOptions, getMapboxStyleId } from '../utils/mapbox';
import { getOsmLeafletTileOptions } from '../utils/mapTiles';
import { MapSkeleton } from './Skeleton';
import AppText from './ui/AppText';
import { radius, spacing } from '../theme/layout';

const MAP_HOST_ID = 'tmlogistx-map-picker-host';

function pinHtml(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 24 24"><path fill="${color}" stroke="#ffffff" stroke-width="1.1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.2" fill="#ffffff"/></svg>`;
  return `<div style="width:34px;height:42px;line-height:0;filter:drop-shadow(0 3px 6px rgba(15,31,25,.3))">${svg}</div>`;
}

function pickerMarkerIcon(L, kind) {
  const color = kind === 'destination' ? '#d64545' : '#0b7a5a';
  return L.divIcon({
    className: '',
    html: pinHtml(color),
    iconSize: [34, 42],
    iconAnchor: [17, 38],
  });
}

/**
 * Tap-to-pick map: Leaflet in WebView on iOS/Android, DOM Leaflet on web.
 */
export default function MapLocationPicker({
  visible,
  title = 'Select on map',
  initialLat = 9.0192,
  initialLng = 38.7525,
  markerKind = 'pickup',
  onConfirm,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const mapHeight = Math.max(320, Math.round(winH * 0.52));
  const pinColor = markerKind === 'destination' ? colors.danger : colors.primary;
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
        const map = L.map(host, { scrollWheelZoom: true }).setView([initialLat, initialLng], 15);
        const mb = getMapboxLeafletTileOptions();
        if (mb) {
          L.tileLayer(mb.url, {
            attribution: mb.attribution,
            tileSize: mb.tileSize,
            zoomOffset: mb.zoomOffset,
            maxZoom: mb.maxZoom,
          }).addTo(map);
        } else {
          const osm = getOsmLeafletTileOptions();
          L.tileLayer(osm.url, {
            maxZoom: osm.maxZoom,
            attribution: osm.attribution,
          }).addTo(map);
        }

        const marker = L.marker([initialLat, initialLng], {
          draggable: true,
          icon: pickerMarkerIcon(L, markerKind),
        }).addTo(map);
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
        setTimeout(() => map.invalidateSize(), 200);
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
  }, [visible, initialLat, initialLng, markerKind]);

  const handleConfirm = () => {
    onConfirm?.(picked.lat, picked.lng);
    onClose?.();
  };

  const mapHtml = buildLeafletPickerHtml(initialLat, initialLng, 15, {
    accessToken: getMapboxAccessToken(),
    style: getMapboxStyleId(),
    markerKind,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: insets.top + spacing.md }]}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.headerRow}>
            <View style={[styles.pinBadge, { backgroundColor: pinColor }]}>
              <Ionicons name="location" size={20} color="#fff" />
            </View>
            <View style={styles.headerText}>
              <AppText style={styles.title}>{title}</AppText>
              <AppText style={styles.hint}>Tap the map or drag the pin, then confirm.</AppText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <View style={[styles.mapWrap, { height: mapHeight }]}>
            {Platform.OS === 'web' ? (
              <View nativeID={MAP_HOST_ID} style={styles.mapHost} />
            ) : visible ? (
              <WebView
                key={`map-${markerKind}-${initialLat}-${initialLng}`}
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
            <TouchableOpacity
              style={[styles.confirmBtn, markerKind === 'destination' && styles.confirmBtnDest]}
              onPress={handleConfirm}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.confirmText}>Select location</Text>
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
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.xl,
    maxHeight: '94%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  pinBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  mapWrap: {
    position: 'relative',
    borderRadius: radius.input,
    overflow: 'hidden',
    backgroundColor: colors.bgTertiary,
  },
  mapHost: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.bgTertiary,
  },
  coords: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDest: {
    backgroundColor: colors.danger,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '800',
  },
});
