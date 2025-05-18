import { registerRootComponent } from 'expo';
import 'react-native-gesture-handler';
import AppWithAuth from './src';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

// Request necessary permissions for Android using modern API
async function requestPermissions() {
  if (Platform.OS === 'android') {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission:', cameraPermission.status);
      
      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
      console.log('Media library permission:', mediaLibraryPermission.status);
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  }
}

// Call permissions request
requestPermissions();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(AppWithAuth);

export default AppWithAuth;
