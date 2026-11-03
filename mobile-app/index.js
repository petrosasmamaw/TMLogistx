import '@expo/metro-runtime';
import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

if (Platform.OS !== 'web') {
  try {
    require('./src/location/driverLocationTask');
  } catch (err) {
    console.warn('[TMLogistx] Background location task not registered:', err?.message || err);
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
