import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
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

function MainApp() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (auth.initializing) {
    return <ScreenBootSkeleton />;
  }

  if (!auth.isAuthenticated || !auth.user) {
    return <AuthScreen />;
  }

  const isDriver = auth.user.role === 'DRIVER';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Header />
        {isDriver ? <DriverHomeScreen /> : <StaffHomeScreen />}
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
