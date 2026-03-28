import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scooterfuel.tracker',
  appName: 'ScooterFuelTracker',
  webDir: 'dist',
  android: {
    useLegacyBridge: true
  }
};

export default config;
