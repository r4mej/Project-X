import { Platform } from 'react-native';

// Configure reanimated for web platform
if (Platform.OS === 'web') {
  // @ts-ignore
  window.__reanimatedLoggerConfig = {
    enabled: false,
    nativeLoggingHook: () => {},
    logFunction: () => {},
    warnFunction: () => {},
    errorFunction: () => {},
    log: () => {},
    warn: () => {},
    error: () => {},
  };
}

export default {}; 