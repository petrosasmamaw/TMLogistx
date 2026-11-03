import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Linking, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenBootSkeleton } from './src/components/Skeleton';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch, useSelector } from 'react-redux';
import {
  useFonts,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { store } from './src/store';
import { clearLocationFix } from './src/store/gpsSlice';
import { LanguageProvider } from './src/i18n';
import { colors } from './src/theme/colors';
import Header from './src/components/Header';
import AuthScreen from './src/screens/AuthScreen';
import StaffHomeScreen from './src/screens/StaffHomeScreen';
import DriverHomeScreen from './src/screens/DriverHomeScreen';
import { restoreSession } from './src/store/authSlice';
import DriverLocationBroadcaster from './src/components/DriverLocationBroadcaster';
import StaffLocationTracker from './src/components/StaffLocationTracker';
import useMobileProjectSocket from './src/hooks/useMobileProjectSocket';
import useMobileNotifications from './src/hooks/useMobileNotifications';
import NotificationPermissionBanner from './src/components/NotificationPermissionBanner';
import { ensureLocationAndNotifications } from './src/utils/tripPermissions';
import { SheetBannerContext } from './src/context/SheetBannerContext';
import ScreenErrorBoundary from './src/components/ScreenErrorBoundary';

function parseResetToken(url) {
  if (!url) return '';
  const match = url.match(/[?&]reset_token=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function MainApp() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const [resetToken, setResetToken] = useState('');

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [fontTimedOut, setFontTimedOut] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setFontTimedOut(true), 12000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    dispatch(restoreSession());
    Linking.getInitialURL().then((url) => {
      const t = parseResetToken(url);
      if (t) setResetToken(t);
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      const t = parseResetToken(url);
      if (t) setResetToken(t);
    });
    return () => sub.remove();
  }, [dispatch]);

  const [openProfileSignal, setOpenProfileSignal] = useState(0);
  const sessionActive = auth.isAuthenticated && !!auth.user;
  useMobileProjectSocket();
  const { permission: notificationPermission, ask: askNotifications } =
    useMobileNotifications(sessionActive);

  useEffect(() => {
    if (!sessionActive || !auth.user?.id) return;
    dispatch(clearLocationFix());
    void ensureLocationAndNotifications('trip alerts and your location on the map', {
      promptNotifications: false,
    });
  }, [sessionActive, auth.user?.id, dispatch]);

  const fontsReady =
    fontsLoaded || !!fontError || fontTimedOut || Platform.OS === 'web';

  if (auth.initializing || !fontsReady) {
    return (
      <View style={styles.bootShell}>
        <ScreenBootSkeleton />
      </View>
    );
  }

  if (!auth.isAuthenticated || !auth.user) {
    return <AuthScreen resetToken={resetToken} onResetDone={() => setResetToken('')} />;
  }

  const isDriver = auth.user.role === 'DRIVER';

  const sheetBanner =
    notificationPermission === 'granted' || notificationPermission === 'unsupported' ? null : (
      <NotificationPermissionBanner
        permission={notificationPermission}
        onAllow={() =>
          askNotifications({ fromSettingsButton: notificationPermission === 'denied' })
        }
        role={auth.user.role}
        compact
      />
    );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <StatusBar style="dark" />
      <Header onOpenProfile={() => setOpenProfileSignal((n) => n + 1)} />
      {isDriver ? <DriverLocationBroadcaster /> : <StaffLocationTracker />}
      <SheetBannerContext.Provider value={sheetBanner}>
        {isDriver ? (
          <DriverHomeScreen openProfileSignal={openProfileSignal} />
        ) : (
          <StaffHomeScreen openProfileSignal={openProfileSignal} />
        )}
      </SheetBannerContext.Provider>
    </View>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <LanguageProvider initialLanguage="en">
        <SafeAreaProvider>
          <ScreenErrorBoundary name="App">
            <View style={styles.bootShell}>
              <MainApp />
            </View>
          </ScreenErrorBoundary>
        </SafeAreaProvider>
      </LanguageProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bootShell: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' } : null),
  },
});
