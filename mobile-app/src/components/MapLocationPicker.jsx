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
import { colors } from '../theme/colors';

/**
 * Tap-to-pick map (Leaflet on web). Native falls back to confirm-at-center.
 */
export default function MapLocationPicker({
  visible,
  title = 'Select on map',
  initialLat = 9.02,
  initialLng = 38.75,
  onConfirm,
  onClose
}) {
  const MAP_HOST_ID = 'tmlogistx-map-picker-host';
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [picked, setPicked] = useState({ lat: initialLat, lng: initialLng });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPicked({ lat: initialLat, lng: initialLng });
    if (Platform.OS !== 'web') {
      setReady(true);
      return undefined;
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

        const el = host;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const L = window.L;
        const map = L.map(el, { scrollWheelZoom: true }).setView([initialLat, initialLng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>Tap the map or drag the pin to set the point.</Text>

          {Platform.OS === 'web' ? (
            <View nativeID={MAP_HOST_ID} style={styles.mapHost} />
          ) : (
            <View style={styles.nativeFallback}>
              <Text style={styles.nativeText}>
                Map picker uses your project center. On device, enable web or enter address manually.
              </Text>
            </View>
          )}

          {!ready && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.amber} />
            </View>
          )}

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
    maxHeight: '88%'
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
  mapHost: {
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.bgTertiary
  },
  nativeFallback: {
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  nativeText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center'
  },
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 100,
    alignItems: 'center'
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
    backgroundColor: colors.amber,
    alignItems: 'center'
  },
  confirmText: {
    color: '#000',
    fontWeight: '800'
  }
});
