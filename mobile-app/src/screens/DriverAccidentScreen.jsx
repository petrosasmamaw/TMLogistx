import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import LoadingButton from '../components/LoadingButton';
import { useSelector } from 'react-redux';
import { colors } from '../theme/colors';
import apiClient from '../api/client';

export default function DriverAccidentScreen({ onBack, onComplete }) {
  const user = useSelector((state) => state.auth.user);
  const gps = useSelector((state) => state.gps?.currentLocation || { latitude: 9.02, longitude: 38.75 });
  const [vehicleId, setVehicleId] = useState(user?.assigned_vehicle_id || '');
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [vehicleLabel, setVehicleLabel] = useState(
    user?.vehicle_plate
      ? `${user.vehicle_plate}${user.vehicle_model ? ` · ${user.vehicle_model}` : ''}`
      : ''
  );
  const [contextLoading, setContextLoading] = useState(true);
  const [locationAddress, setLocationAddress] = useState('');
  const [severity, setSeverity] = useState('MINOR');
  const [description, setDescription] = useState('');
  const [damageDetails, setDamageDetails] = useState('');
  const [thirdParty, setThirdParty] = useState('');
  const [policeReport, setPoliceReport] = useState('');
  const [loading, setLoading] = useState(false);

  const applyVehicle = useCallback((v) => {
    if (!v) return;
    setVehicleId(v.id);
    setVehicleLabel(`${v.plate_number} · ${v.make || ''} ${v.model || ''}`.trim());
  }, []);

  const loadContext = useCallback(() => {
    setContextLoading(true);
    return apiClient
      .getDriverAccidentContext()
      .then((res) => {
        const data = res.data || {};
        const list = data.selectable_vehicles || [];
        setVehicleOptions(list);
        if (data.default_vehicle) {
          applyVehicle(data.default_vehicle);
        } else if (list.length === 1) {
          applyVehicle(list[0]);
        } else if (data.default_vehicle_id) {
          setVehicleId(data.default_vehicle_id);
        }
      })
      .catch(() => {
        if (user?.assigned_vehicle_id) {
          setVehicleId(user.assigned_vehicle_id);
          setVehicleLabel(
            user?.vehicle_plate
              ? `${user.vehicle_plate}${user.vehicle_model ? ` · ${user.vehicle_model}` : ''}`
              : user.assigned_vehicle_id
          );
        }
      })
      .finally(() => setContextLoading(false));
  }, [applyVehicle, user]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const severities = [
    { id: 'MINOR', label: 'Minor Scratch', color: colors.amber },
    { id: 'MODERATE', label: 'Moderate Dent', color: '#f97316' },
    { id: 'SEVERE', label: 'Severe / Towing', color: colors.rose },
    { id: 'CRITICAL', label: 'Critical Crash', color: '#b91c1c' }
  ];

  const handleSubmitAccident = async () => {
    const resolvedVehicleId = vehicleId || vehicleOptions[0]?.id;
    if (!resolvedVehicleId && vehicleOptions.length === 0) {
      Alert.alert(
        'Vehicle required',
        'No fleet vehicle is available for your project. Contact your coordinator to assign a vehicle.'
      );
      return;
    }
    if (!locationAddress.trim() || !description.trim()) {
      Alert.alert('Required Information', 'Please provide location address and incident description.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.reportAccident({
        vehicle_id: resolvedVehicleId,
        location_address: locationAddress,
        location_lat: gps.latitude,
        location_lng: gps.longitude,
        severity,
        description,
        damage_details: damageDetails,
        third_party_info: thirdParty,
        police_report_number: policeReport,
        set_vehicle_status: severity === 'MINOR' ? 'IN_ACCIDENT' : 'IN_REPAIR'
      });

      Alert.alert(
        'Incident reported',
        'Coordinators and master person can see this under Accidents on the web portal.'
      );

      if (onComplete) onComplete(res);
      else if (onBack) onBack();
    } catch (err) {
      Alert.alert('Report Error', err.message || 'Could not submit accident report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Vehicle accident report</Text>
          <Text style={styles.subtitle}>Alerts logistics coordinator and master person</Text>
        </View>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.vehicleBanner}>
        <Text style={styles.vehicleLabel}>Fleet vehicle for this report</Text>
        {contextLoading ? (
          <Text style={styles.vehicleValue}>Loading vehicles…</Text>
        ) : vehicleOptions.length > 1 ? (
          <View style={styles.vehiclePickList}>
            {vehicleOptions.map((v) => {
              const selected = vehicleId === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehiclePickBtn, selected && styles.vehiclePickBtnActive]}
                  onPress={() => applyVehicle(v)}
                >
                  <Text style={[styles.vehiclePickText, selected && styles.vehiclePickTextActive]}>
                    {v.label || v.plate_number}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.vehicleValue}>
            {vehicleLabel || vehicleId || 'Not assigned — select from list when available'}
          </Text>
        )}
      </View>

      <View style={styles.safetyCard}>
        <Text style={styles.safetyTitle}>Safety first</Text>
        <Text style={styles.safetyText}>
          Ensure passengers are safe. This report marks the vehicle unavailable and notifies dispatch. You do not need an active trip to submit.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Severity *</Text>
        <View style={styles.severityGrid}>
          {severities.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.severityBtn,
                severity === s.id && { borderColor: s.color, backgroundColor: `${s.color}22` }
              ]}
              onPress={() => setSeverity(s.id)}
            >
              <View style={[styles.severityDot, { backgroundColor: s.color }]} />
              <Text style={[styles.severityBtnText, severity === s.id && { color: s.color, fontWeight: '700' }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Incident location *</Text>
          <TextInput
            style={styles.input}
            placeholder="Street / landmark"
            placeholderTextColor={colors.textMuted}
            value={locationAddress}
            onChangeText={setLocationAddress}
          />
          <Text style={styles.coordHint}>
            GPS: {gps.latitude?.toFixed(5)}, {gps.longitude?.toFixed(5)}
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
            placeholder="What happened?"
            placeholderTextColor={colors.textMuted}
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Damage</Text>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            placeholder="Optional damage notes"
            placeholderTextColor={colors.textMuted}
            multiline
            value={damageDetails}
            onChangeText={setDamageDetails}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Third party</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor={colors.textMuted}
            value={thirdParty}
            onChangeText={setThirdParty}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Police report #</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor={colors.textMuted}
            value={policeReport}
            onChangeText={setPoliceReport}
          />
        </View>

        <LoadingButton
          onPress={handleSubmitAccident}
          loading={loading}
          loadingLabel="Submitting…"
          label="Submit incident report"
          style={styles.emergencyBtn}
          textStyle={styles.emergencyBtnText}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderPrimary
  },
  backBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  vehicleBanner: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderPrimary
  },
  vehicleLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  vehicleValue: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  vehiclePickList: { marginTop: 8, gap: 6 },
  vehiclePickBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    backgroundColor: colors.bgPrimary
  },
  vehiclePickBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.12)'
  },
  vehiclePickText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  vehiclePickTextActive: { color: colors.primary },
  safetyCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16
  },
  safetyTitle: { fontSize: 13, fontWeight: '800', color: colors.rose },
  safetyText: { fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    marginBottom: 16
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  severityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  severityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.borderPrimary
  },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  severityBtnText: { fontSize: 12, color: colors.textSecondary },
  formGroup: { marginBottom: 12 },
  input: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13
  },
  coordHint: { fontSize: 10, color: colors.textMuted, marginTop: 4, fontFamily: 'monospace' },
  emergencyBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  emergencyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 }
});
