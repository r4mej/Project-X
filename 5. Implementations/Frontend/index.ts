import { registerRootComponent } from 'expo';
import 'react-native-gesture-handler';
import AppWithAuth from './src';

console.log('[App] Initializing application...');

// Ensure React Native is properly initialized
if (typeof global !== 'undefined') {
  // Add any necessary polyfills or global error handlers here
  if (__DEV__) {
    console.log('[App] Running in development mode');
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(AppWithAuth);

// Export for potential web usage
export default AppWithAuth;
