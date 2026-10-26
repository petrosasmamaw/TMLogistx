import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Linking } from 'react-native';
import { ScreenBootSkeleton } from './src/components/Skeleton';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './src/store';
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
import useEnsureLocationPermission from './src/hooks/useEnsureLocationPermission';
import useMobileNotifications from './src/hooks/useMobileNotifications';
import NotificationPermissionBanner from './src/components/NotificationPermissionBanner';

function parseResetToken(url) {
  if (!url) return '';
  const match = url.match(/[?&]reset_token=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function MainApp() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const [resetToken, setResetToken] = useState('');

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
  useEnsureLocationPermission(sessionActive);
  const notif = useMobileNotifications(sessionActive);

  if (auth.initializing) {
    return <ScreenBootSkeleton />;
  }

  if (!auth.isAuthenticated || !auth.user) {
    return <AuthScreen resetToken={resetToken} onResetDone={() => setResetToken('')} />;
  }

  const isDriver = auth.user.role === 'DRIVER';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Header onOpenProfile={() => setOpenProfileSignal((n) => n + 1)} />
        <NotificationPermissionBanner
          permission={notif.permission}
          onAllow={notif.ask}
          role={auth.user.role}
        />
        {isDriver ? <DriverLocationBroadcaster /> : <StaffLocationTracker />}
        {isDriver ? (
          <DriverHomeScreen openProfileSignal={openProfileSignal} />
        ) : (
          <StaffHomeScreen openProfileSignal={openProfileSignal} />
        )}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <LanguageProvider initialLanguage="en">
        <MainApp />
      </LanguageProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
  },
});
