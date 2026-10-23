import React, { useState, useEffect } from 'react';
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
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import apiClient from '../api/client';

export default function DriverFuelScreen({ onBack }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('MOVEMENT'); // 'MOVEMENT' or 'BULK'
  const [vehicleId, setVehicleId] = useState('veh-01');
  const [liters, setLiters] = useState('');
  const [cost, setCost] = useState('');
  const [odometer, setOdometer] = useState('');
  const [station, setStation] = useState('TotalEnergies Bole');
  const [daysCovered, setDaysCovered] = useState('1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadFuelLogs();
  }, []);

  const loadFuelLogs = async () => {
    try {
      const res = await apiClient.getFuelLogs();
      if (res && res.data) {
        setRecentLogs(res.data);
        setSummary(res.summary);
      }
    } catch (e) {
      // fallback handled
    }
  };

  const handleSaveFuel = async () => {
    if (!liters.trim() || !cost.trim()) {
      Alert.alert('Required Fields', 'Please enter fuel liters and total cost amount.');
      return;
    }

    try {
      setLoading(true);
      await apiClient.logFuel({
        vehicle_id: vehicleId,
        liters: parseFloat(liters),
        cost: parseFloat(cost),
        currency: 'ETB',
        odometer_reading: odometer ? parseFloat(odometer) : null,
        fuel_station: station,
        days_covered: mode === 'BULK' ? parseInt(daysCovered, 10) || 3 : 1,
        notes: `${mode === 'BULK' ? `[Bulk ${daysCovered} Days] ` : '[Movement] '}${notes}`.trim()
      });

      Alert.alert('Fuel Logged', `Successfully recorded ${liters}L (${cost} ETB).`);
      setLiters('');
      setCost('');
      setOdometer('');
      setNotes('');
      loadFuelLogs();
    } catch (err) {
      Alert.alert('Logging Error', err.message || 'Could not record fuel log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>⛽ Fuel Consumption Recorder</Text>
          <Text style={styles.subtitle}>Log trip fuel or enter historical multi-day field totals</Text>
        </View>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>✕ Close</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mode Switcher */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'MOVEMENT' && styles.modeTabActive]}
          onPress={() => { setMode('MOVEMENT'); setDaysCovered('1'); }}
        >
          <Text style={[styles.modeTabText, mode === 'MOVEMENT' && styles.modeTabTextActive]}>
            🚗 Per Movement / Trip
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'BULK' && styles.modeTabActive]}
          onPress={() => { setMode('BULK'); setDaysCovered('3'); }}
        >
          <Text style={[styles.modeTabText, mode === 'BULK' && styles.modeTabTextActive]}>
            📅 Add for Past Days
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>
          {mode === 'MOVEMENT' ? 'Trip Fuel Entry' : 'Historical Multi-Day Fuel Entry'}
        </Text>

        {mode === 'BULK' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Days Covered (Historical)</Text>
            <View style={styles.dayPills}>
              {['2', '3', '5', '7'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayPill, daysCovered === d && styles.dayPillActive]}
                  onPress={() => setDaysCovered(d)}
                >
                  <Text style={[styles.dayPillText, daysCovered === d && styles.dayPillTextActive]}>
                    Last {d} Days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Fuel Liters (L) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 45.0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={liters}
              onChangeText={setLiters}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Total Cost (ETB) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 3530.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={cost}
              onChangeText={setCost}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Odometer Reading (KM)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 34500"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={odometer}
              onChangeText={setOdometer}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Fuel Station</Text>
            <TextInput
              style={styles.input}
              placeholder="TotalEnergies / NOC"
              placeholderTextColor={colors.textMuted}
              value={station}
              onChangeText={setStation}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Receipt Notes / Station Info</Text>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            placeholder="Field mission fuel voucher or receipt remarks..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <LoadingButton
          onPress={handleSaveFuel}
          loading={loading}
          loadingLabel="Saving fuel log…"
          label="Save & Submit Fuel Log"
          style={styles.submitBtn}
          textStyle={styles.submitBtnText}
        />
      </View>

      {/* Summary KPI Strip */}
      {summary && (
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Recorded</Text>
            <Text style={styles.summaryVal}>{summary.total_liters} L</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Expense</Text>
            <Text style={[styles.summaryVal, { color: colors.emerald }]}>{summary.total_cost} ETB</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Avg Rate</Text>
            <Text style={styles.summaryVal}>{summary.average_cost_per_liter} ETB/L</Text>
          </View>
        </View>
      )}

      {/* Recent Fuel Records List */}
      <View style={styles.recordsSection}>
        <Text style={styles.recordsTitle}>Recent Fuel Records</Text>
        {recentLogs.length === 0 ? (
          <Text style={styles.emptyText}>No fuel records logged yet.</Text>
        ) : (
          recentLogs.slice(0, 5).map((log) => (
            <View key={log.id} style={styles.recordItem}>
              <View style={styles.recordTop}>
                <Text style={styles.recordPlate}>{log.vehicle_plate || 'Vehicle'} • {log.fuel_station}</Text>
                <Text style={styles.recordCost}>{log.cost} {log.currency || 'ETB'}</Text>
              </View>
              <View style={styles.recordSub}>
                <Text style={styles.recordMeta}>
                  ⛽ {log.liters} Liters • {log.days_covered > 1 ? `Past ${log.days_covered} days` : 'Trip'} • {log.fuel_date}
                </Text>
                {log.odometer_reading ? (
                  <Text style={styles.recordOdo}>Odo: {log.odometer_reading} km</Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  backBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: colors.brandPrimary,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13,
  },
  dayPills: {
    flexDirection: 'row',
    gap: 8,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  dayPillActive: {
    borderColor: colors.brandPrimary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayPillTextActive: {
    color: colors.brandPrimary,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: colors.emerald,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    padding: 12,
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.borderPrimary,
  },
  recordsSection: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  recordsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  recordItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingVertical: 10,
  },
  recordTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordPlate: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recordCost: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.emerald,
  },
  recordSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  recordMeta: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  recordOdo: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
});
