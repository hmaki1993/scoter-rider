import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scooterfuel.tracker',
  appName: 'Fuel Tracker',
  webDir: 'dist',
  android: {
    useLegacyBridge: true
  }
};

export default config;
