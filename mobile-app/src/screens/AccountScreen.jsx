import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { openAppSettings } from '../utils/openDeviceSettings';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/layout';
import LoadingButton from '../components/LoadingButton';
import AppText from '../components/ui/AppText';
import InfoRow from '../components/ui/InfoRow';
import SectionLabel from '../components/ui/SectionLabel';
import PermissionSwitchRow from '../components/ui/PermissionSwitchRow';
import useDevicePermissions from '../hooks/useDevicePermissions';
import apiClient from '../api/client';
import { logoutUser, updateSessionUser } from '../store/authSlice';
import { fontFamily } from '../theme/typography';

function alertTurnOffPermission(kind) {
  const isWeb = Platform.OS === 'web';
  const title = kind === 'notifications' ? 'Turn off notifications' : 'Turn off location';
  const body =
    kind === 'notifications'
      ? isWeb
        ? 'Use the lock or site icon in the address bar, open Site settings, and block notifications for this site.'
        : 'Open your device settings and turn off notifications for this app.'
      : isWeb
        ? 'Use the lock or site icon in the address bar and block location for this site.'
        : 'Open your device settings and turn off location for this app.';
  Alert.alert(title, body, [
    { text: 'OK', style: 'cancel' },
    ...(isWeb
      ? []
      : [
          {
            text: 'Open settings',
            onPress: () => {
              void openAppSettings();
            },
          },
        ]),
  ]);
}

export default function AccountScreen() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const isDriver = user?.role === 'DRIVER';
  const {
    notificationsGranted,
    locationGranted,
    notificationPermission,
    locationPermission,
    refreshing,
    requestNotifications,
    requestLocation,
    refresh,
  } = useDevicePermissions(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [profileSaving, setProfileSaving] = useState(false);

  const initials = (user?.full_name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  React.useEffect(() => {
    setFullName(user?.full_name || '');
    setPhone(user?.phone_number || '');
  }, [user?.full_name, user?.phone_number]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const mime = result.assets[0].mimeType || 'image/jpeg';
    const dataUri = `data:${mime};base64,${result.assets[0].base64}`;
    setAvatarLoading(true);
    try {
      const res = await apiClient.patchProfile({ avatar_image: dataUri });
      if (res.user) dispatch(updateSessionUser(res.user));
      Alert.alert('Saved', 'Profile photo updated.');
    } catch (err) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setAvatarLoading(false);
    }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      const res = await apiClient.patchProfile({
        full_name: fullName.trim(),
        phone_number: phone.trim(),
      });
      if (res.user) dispatch(updateSessionUser(res.user));
      Alert.alert('Saved', 'Profile updated.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Notice', 'Enter current and new password.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password updated.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const onNotificationToggle = async (wantOn) => {
    if (wantOn) {
      await requestNotifications();
      return;
    }
    alertTurnOffPermission('notifications');
    await refresh();
  };

  const onLocationToggle = async (wantOn) => {
    if (wantOn) {
      await requestLocation();
      return;
    }
    alertTurnOffPermission('location');
    await refresh();
  };

  const notifUnsupported = notificationPermission === 'unsupported';
  const locUnsupported = locationPermission === 'unsupported';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarWrap}>
        {user?.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <AppText style={styles.avatarLetter}>{initials}</AppText>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} disabled={avatarLoading}>
        <Ionicons name="camera-outline" size={18} color={colors.primary} />
        <AppText style={styles.photoBtnText}>{avatarLoading ? 'Uploading…' : 'Change photo'}</AppText>
      </TouchableOpacity>

      <AppText style={styles.name}>{user?.full_name || 'Account'}</AppText>
      <AppText style={styles.meta}>{user?.email}</AppText>

      <SectionLabel>Profile</SectionLabel>
      <InfoRow editable value={fullName} onChangeText={setFullName} placeholder="Your name" />
      <InfoRow
        editable
        value={phone}
        onChangeText={setPhone}
        placeholder="Mobile number"
        keyboardType="phone-pad"
      />
      <LoadingButton
        onPress={saveProfile}
        loading={profileSaving}
        loadingLabel="Saving…"
        label="Save profile"
        style={styles.saveBtn}
      />

      <SectionLabel>Device permissions</SectionLabel>
      <AppText style={styles.permHint}>
        Switches show what your browser or phone allows. Turn on to request access from the system.
      </AppText>
      <PermissionSwitchRow
        title="Notifications"
        subtitle={
          isDriver
            ? 'New trip assignments and trip updates'
            : 'Driver assigned, arrival, trip start, and completion alerts'
        }
        value={notificationsGranted}
        disabled={refreshing || notifUnsupported}
        onToggle={onNotificationToggle}
      />
      <PermissionSwitchRow
        title="Location"
        subtitle={
          isDriver
            ? 'Share your position during active trips and on the map'
            : 'Show your pickup on the map and live trip tracking'
        }
        value={locationGranted}
        disabled={refreshing || locUnsupported}
        onToggle={onLocationToggle}
      />

      <SectionLabel>Change password</SectionLabel>
      <InfoRow
        editable
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="••••••••"
        secureTextEntry
      />
      <InfoRow
        editable
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Min. 8 characters"
        secureTextEntry
      />
      <LoadingButton
        variant="secondary"
        onPress={changePassword}
        loading={loading}
        loadingLabel="Saving…"
        label="Update password"
        style={styles.saveBtn}
      />

      <LoadingButton variant="secondary" label="Sign out" onPress={() => dispatch(logoutUser())} />

      <AppText style={styles.footerLine}>TMLogistx · Staff Movement & Fleet Management</AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingBottom: 24 },
  avatarWrap: { alignItems: 'center', marginBottom: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 22, fontWeight: '800', fontFamily: fontFamily.extrabold, color: colors.primary },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    marginBottom: 8,
  },
  photoBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14, fontFamily: fontFamily.bold },
  name: { fontSize: 20, fontWeight: '700', fontFamily: fontFamily.bold, color: colors.ink, textAlign: 'center' },
  meta: { fontSize: 13, color: colors.mute, marginTop: 4, textAlign: 'center', fontFamily: fontFamily.medium },
  permHint: {
    fontSize: 12,
    color: colors.mute,
    marginBottom: spacing.md,
    fontFamily: fontFamily.medium,
    lineHeight: 18,
  },
  saveBtn: { marginTop: 4 },
  footerLine: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: colors.mute,
    fontFamily: fontFamily.medium,
  },
});
