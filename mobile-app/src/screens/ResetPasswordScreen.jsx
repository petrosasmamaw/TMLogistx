import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme/colors';
import LoadingButton from '../components/LoadingButton';
import apiClient from '../api/client';

export default function ResetPasswordScreen({ token, onDone }) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!token) {
      setError('Invalid reset link.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiClient.resetPassword(token, newPassword);
      setDone(true);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Invalid link</Text>
        <Text style={styles.hint}>Open the reset link from your email or request a new one from sign in.</Text>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Password updated</Text>
        <Text style={styles.hint}>You can sign in with your new password.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <Text style={styles.title}>Set new password</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.label}>New password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Min. 8 characters"
        placeholderTextColor={colors.textMuted}
      />
      <LoadingButton onPress={submit} loading={loading} loadingLabel="Saving…" label="Update password" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: colors.bgPrimary },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  hint: { fontSize: 13, color: colors.textMuted },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    marginBottom: 14
  },
  error: { color: '#b91c1c', marginBottom: 8, fontSize: 12 }
});
