import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearAuthError } from '../store/authSlice';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import { Ionicons } from '@expo/vector-icons';
import LoadingButton from '../components/LoadingButton';

export const AuthScreen = () => {
  const dispatch = useDispatch();
  const { t, language, toggleLanguage } = useTranslation();
  const { loading, error } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Notice', 'Please enter your email and password.');
      return;
    }
    dispatch(clearAuthError());
    dispatch(loginUser({ email, password }));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage} disabled={loading}>
            <View style={styles.langRow}>
              <Ionicons name="language-outline" size={14} color={colors.primary} />
              <Text style={styles.langToggleText}>
                {language === 'en' ? 'አማርኛ' : 'English'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>TM</Text>
          </View>
          <Text style={styles.appTitle}>{t('appTitle')}</Text>
          <Text style={styles.appSubtitle}>{t('appSubtitle')}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Sign in</Text>
          <Text style={styles.cardHint}>
            Use the email and password provided by your project administrator.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
            placeholder="name@tmlogistx.com"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              editable={!loading}
              placeholder="••••••••••••"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeBtn}
              disabled={loading}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <LoadingButton
            onPress={handleLogin}
            loading={loading}
            loadingLabel="Signing in…"
            label="Sign in"
            style={styles.loginBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  langToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    backgroundColor: colors.bgPrimary,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langToggleText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoBadgeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  appTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    paddingVertical: 16,
    marginVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderPrimary,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 17,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 8,
  },
  passwordRow: {
    position: 'relative',
    marginBottom: 8,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 44,
  },
  eyeBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    padding: 4,
  },
  loginBtn: {
    marginTop: 14,
  },
});

export default AuthScreen;
