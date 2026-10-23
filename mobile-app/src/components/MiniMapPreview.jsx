import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const MiniMapPreview = ({
  pickup = 'Bole Int Airport',
  destination = 'UNECA Compound',
  currentLat = 8.9950,
  currentLng = 38.7800,
  speedKmh = 42,
  heading = 140,
  etaMinutes = 8,
  distanceKm = '—'
}) => {
  const distanceDisplay =
    distanceKm === '—' || distanceKm === '-' || distanceKm == null
      ? '—'
      : typeof distanceKm === 'number'
        ? `${distanceKm} km`
        : String(distanceKm).includes('km')
          ? distanceKm
          : `${distanceKm} km`;
  return (
    <View style={styles.cardContainer}>
      {/* Map Radar Canvas */}
      <View style={styles.canvasArea}>
        {/* Grid lines simulating GPS map coordinates */}
        <View style={styles.gridH1} />
        <View style={styles.gridH2} />
        <View style={styles.gridV1} />
        <View style={styles.gridV2} />

        {/* Route Path Indicator Line */}
        <View style={styles.routePathLine} />

        {/* Point A (Pickup) */}
        <View style={styles.pinA}>
          <Text style={styles.pinText}>A</Text>
        </View>

        {/* Point B (Destination) */}
        <View style={styles.pinB}>
          <Text style={styles.pinText}>B</Text>
        </View>

        {/* Active Moving Vehicle Pulse */}
        <View style={styles.vehicleMarker}>
          <View style={styles.vehiclePulseRing} />
          <View style={styles.vehicleDot}>
            <Text style={styles.vehicleIcon}>🚗</Text>
          </View>
        </View>

        {/* Live GPS Telematics Overlay */}
        <View style={styles.telemetryOverlay}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>GPS LIVE</Text>
          </View>
          <Text style={styles.coordsText}>
            {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E
          </Text>
        </View>

        {/* Speed Badge */}
        <View style={styles.speedBadge}>
          <Text style={styles.speedValue}>{speedKmh}</Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </View>
      </View>

      {/* Route & ETA Details Strip */}
      <View style={styles.detailsStrip}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>ESTIMATED ARRIVAL</Text>
          <Text style={styles.metricValHighlight}>{etaMinutes} min</Text>
        </View>
        <View style={styles.dividerV} />
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>DISTANCE</Text>
          <Text style={styles.metricVal}>{distanceDisplay}</Text>
        </View>
        <View style={styles.dividerV} />
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>HEADING</Text>
          <Text style={styles.metricVal}>{heading}° SE</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    overflow: 'hidden',
    marginVertical: 10,
  },
  canvasArea: {
    height: 180,
    backgroundColor: '#0c1322',
    position: 'relative',
    overflow: 'hidden',
  },
  gridH1: {
    position: 'absolute',
    top: '33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridH2: {
    position: 'absolute',
    top: '66%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridV1: {
    position: 'absolute',
    left: '33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridV2: {
    position: 'absolute',
    left: '66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  routePathLine: {
    position: 'absolute',
    top: '48%',
    left: '18%',
    width: '64%',
    height: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.35)',
    borderStyle: 'dashed',
    borderRadius: 2,
  },
  pinA: {
    position: 'absolute',
    top: '38%',
    left: '15%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pinB: {
    position: 'absolute',
    top: '40%',
    right: '15%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pinText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  vehicleMarker: {
    position: 'absolute',
    top: '35%',
    left: '46%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehiclePulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  vehicleDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  vehicleIcon: {
    fontSize: 14,
  },
  telemetryOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
  },
  coordsText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  speedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    alignItems: 'center',
  },
  speedValue: {
    color: colors.amber,
    fontSize: 14,
    fontWeight: '900',
  },
  speedUnit: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
  },
  detailsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: colors.bgSecondary,
  },
  metricCol: {
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricVal: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  metricValHighlight: {
    color: colors.amber,
    fontSize: 15,
    fontWeight: '800',
  },
  dividerV: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderPrimary,
  },
});

export default MiniMapPreview;
