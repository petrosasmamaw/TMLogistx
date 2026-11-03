import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { switchDemoProfile, DEMO_PROFILES } from '../store/authSlice';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';

export const QuickRolePicker = ({ visible, onClose }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const { t } = useTranslation();

  const handleSelect = (profile) => {
    dispatch(switchDemoProfile(profile));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Ionicons name="flash" size={20} color={colors.primary} />
              <Text style={styles.modalTitle}>{t('quickSwitchTitle')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.mute} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Instantly switch accounts to experience Staff ride booking or Driver trip dispatch workflows.
          </Text>

          <View style={styles.profilesList}>
            {DEMO_PROFILES.map((profile) => {
              const isSelected = currentUser?.id === profile.id;
              const isDriver = profile.role === 'DRIVER';

              return (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.profileCard,
                    isSelected && styles.profileCardActive,
                    isDriver ? styles.driverBorder : styles.staffBorder,
                  ]}
                  onPress={() => handleSelect(profile)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.roleTagRow}>
                      <Ionicons
                        name={isDriver ? 'car-sport' : 'person'}
                        size={14}
                        color={isDriver ? colors.amber : colors.primary}
                      />
                      <Text style={[styles.roleTagText, isDriver ? styles.driverTagText : styles.staffTagText]}>
                        {isDriver ? t('role_DRIVER') : t('role_STAFF_MEMBER')}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View style={styles.activePill}>
                        <Text style={styles.activePillText}>CURRENT ACTIVE</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.userName}>{profile.full_name}</Text>
                  <Text style={styles.userEmail}>{profile.email}</Text>
                  <View style={styles.projectRow}>
                    <Ionicons name="location-outline" size={14} color={colors.mute} />
                    <Text style={styles.projectInfo}>
                      {profile.project_name}
                      {profile.vehicle_plate ? ` • ${profile.vehicle_plate}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  profilesList: {
    gap: 10,
  },
  profileCard: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.borderPrimary,
  },
  profileCardActive: {
    backgroundColor: colors.bgInput,
    borderColor: colors.amber,
  },
  driverBorder: {
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
  },
  staffBorder: {
    borderLeftWidth: 4,
    borderLeftColor: colors.cyan,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  driverTagText: {
    color: colors.amber,
  },
  staffTagText: {
    color: colors.cyanLight,
  },
  activePill: {
    backgroundColor: colors.amberMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    color: colors.amber,
    fontSize: 9,
    fontWeight: '800',
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  userEmail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  projectInfo: {
    color: colors.textMuted,
    fontSize: 12,
    flex: 1,
  },
});

export default QuickRolePicker;
