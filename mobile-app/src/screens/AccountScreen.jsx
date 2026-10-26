import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import LoadingButton from '../components/LoadingButton';
import apiClient from '../api/client';
import { logoutUser, updateSessionUser } from '../store/authSlice';

export default function AccountScreen() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [profileSaving, setProfileSaving] = useState(false);

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
      base64: true
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
        phone_number: phone.trim()
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileRow}>
        {user?.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{(user?.full_name || '?').charAt(0)}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} disabled={avatarLoading}>
          <Ionicons name="camera-outline" size={18} color={colors.primary} />
          <Text style={styles.photoBtnText}>{avatarLoading ? 'Uploading…' : 'Change photo'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.meta}>{user?.email}</Text>

      <Text style={styles.sectionTitle}>Profile</Text>
      <Text style={styles.label}>Full name</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="Mobile number"
        placeholderTextColor={colors.textMuted}
      />
      <LoadingButton onPress={saveProfile} loading={profileSaving} loadingLabel="Saving…" label="Save profile" style={styles.saveBtn} />

      <Text style={styles.sectionTitle}>Change password</Text>
      <Text style={styles.label}>Current password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="••••••••"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.label}>New password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Min. 8 characters"
        placeholderTextColor={colors.textMuted}
      />
      <LoadingButton
        onPress={changePassword}
        loading={loading}
        loadingLabel="Saving…"
        label="Update password"
        style={styles.saveBtn}
      />

      <TouchableOpacity style={styles.logoutBtn} onPress={() => dispatch(logoutUser())}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 20, paddingBottom: 40 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarLetter: { fontSize: 28, fontWeight: '800', color: colors.primary },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  name: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { marginTop: 24, marginBottom: 8, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: colors.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    color: colors.textPrimary,
    fontSize: 14
  },
  saveBtn: { marginTop: 16 },
  logoutBtn: {
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    alignItems: 'center'
  },
  logoutText: { fontWeight: '700', color: colors.textSecondary }
});
