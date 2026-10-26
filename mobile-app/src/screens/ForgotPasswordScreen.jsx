import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme/colors';
import LoadingButton from '../components/LoadingButton';
import apiClient from '../api/client';

export default function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await apiClient.forgotPassword(email);
      setMessage(res.message || 'Check your email for a reset link.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <Text style={styles.title}>Forgot password</Text>
      <Text style={styles.hint}>We will email you a link to set a new password.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@company.com"
        placeholderTextColor={colors.textMuted}
      />
      <LoadingButton onPress={submit} loading={loading} loadingLabel="Sending…" label="Send reset link" />
      <TouchableOpacity onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>Back to sign in</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
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
  error: { color: '#b91c1c', marginBottom: 8, fontSize: 12 },
  success: { color: '#047857', marginBottom: 8, fontSize: 12 },
  back: { marginTop: 16, alignItems: 'center' },
  backText: { color: colors.primary, fontWeight: '700' }
});
