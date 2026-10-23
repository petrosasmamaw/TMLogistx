import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert
} from 'react-native';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import apiClient from '../api/client';

export const IncidentModal = ({ visible, onClose, trip, onReportSuccess }) => {
  const { t } = useTranslation();
  const [incidentType, setIncidentType] = useState('BREAKDOWN');
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const incidentTypes = [
    { key: 'BREAKDOWN', label: t('incidentType_BREAKDOWN') },
    { key: 'FLAT_TIRE', label: t('incidentType_FLAT_TIRE') },
    { key: 'ACCIDENT', label: t('incidentType_ACCIDENT') },
    { key: 'TRAFFIC_DELAY', label: t('incidentType_TRAFFIC_DELAY') },
    { key: 'OTHER', label: t('incidentType_OTHER') }
  ];

  const severityLevels = [
    { key: 'LOW', label: t('severity_LOW'), color: colors.info },
    { key: 'MEDIUM', label: t('severity_MEDIUM'), color: colors.warning },
    { key: 'CRITICAL', label: t('severity_CRITICAL'), color: colors.danger }
  ];

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Notice', 'Please provide a brief description of the incident.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.reportIncident({
        trip_id: trip?.id || 'demo-trip-id',
        vehicle_id: trip?.assigned_vehicle_id || 'veh-eth-01',
        incident_type: incidentType,
        severity,
        description
      });

      Alert.alert(
        'Incident Logged',
        'Your incident alert has been dispatched to the Movement Officer & Logistics Coordinator.'
      );
      if (onReportSuccess) onReportSuccess();
      setDescription('');
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to dispatch incident alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.alertIconBadge}>
                <Text style={styles.alertIconText}>⚠️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('incidentModalTitle')}</Text>
                <Text style={styles.subtitle}>
                  Trip: {trip?.request_number || 'REQ-ACTIVE'} • {trip?.assigned_vehicle_plate || 'AA-3-98214'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Incident Type Selector */}
            <Text style={styles.sectionLabel}>{t('incidentType')}</Text>
            <View style={styles.optionsWrap}>
              {incidentTypes.map((item) => {
                const isSelected = incidentType === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.typeOption, isSelected && styles.typeOptionActive]}
                    onPress={() => setIncidentType(item.key)}
                  >
                    <Text style={[styles.typeOptionText, isSelected && styles.typeOptionTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Severity Level */}
            <Text style={styles.sectionLabel}>{t('severity')}</Text>
            <View style={styles.severityRow}>
              {severityLevels.map((lvl) => {
                const isSelected = severity === lvl.key;
                return (
                  <TouchableOpacity
                    key={lvl.key}
                    style={[
                      styles.severityBtn,
                      isSelected && { borderColor: lvl.color, backgroundColor: `${lvl.color}20` }
                    ]}
                    onPress={() => setSeverity(lvl.key)}
                  >
                    <Text style={[styles.severityBtnText, isSelected && { color: lvl.color, fontWeight: '800' }]}>
                      {lvl.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Description Notes Input */}
            <Text style={styles.sectionLabel}>{t('incidentDescription')}</Text>
            <TextInput
              style={styles.textArea}
              placeholder={t('incidentPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitBtnText}>
                  {isSubmitting ? t('submitting') : t('submitIncident')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  alertIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconText: {
    fontSize: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  typeOptionActive: {
    backgroundColor: colors.dangerMuted,
    borderColor: colors.danger,
  },
  typeOptionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  typeOptionTextActive: {
    color: colors.danger,
    fontWeight: '800',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityBtn: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  severityBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    minHeight: 90,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default IncidentModal;
